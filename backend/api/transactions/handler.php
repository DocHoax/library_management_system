<?php
/**
 * Transactions API Handler
 * Core borrowing lifecycle: checkout, return, history
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match (true) {
    $method === 'GET' && $action === '' => listTransactions($db),
    $method === 'GET' && $action === 'my' => myTransactions($db),
    $method === 'GET' && is_numeric($action) => getTransaction($db, (int)$action),
    $method === 'POST' && $action === 'checkout' => checkoutBook($db, $input),
    $method === 'POST' && $action === 'return' => returnBook($db, $input),
    default => errorResponse('Transactions endpoint not found', 404),
};

function listTransactions(PDO $db): void {
    $authUser = requireAuth(['admin', 'librarian']);
    
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    $where = ['1=1'];
    $params = [];

    if ($status = $_GET['status'] ?? '') {
        $where[] = 't.status = ?';
        $params[] = $status;
    }
    if ($userId = $_GET['user_id'] ?? '') {
        $where[] = 't.user_id = ?';
        $params[] = (int)$userId;
    }

    $whereClause = implode(' AND ', $where);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM transactions t WHERE $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT t.*, 
               u.full_name as student_name, u.matric_number,
               b.title as book_title, b.author as book_author, b.isbn,
               l.full_name as librarian_name,
               CASE 
                   WHEN t.status = 'overdue' THEN DATEDIFF(NOW(), t.due_date)
                   WHEN t.status = 'checked_out' AND t.due_date < NOW() THEN DATEDIFF(NOW(), t.due_date)
                   ELSE 0
               END as days_overdue
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        LEFT JOIN users l ON t.librarian_id = l.id
        WHERE $whereClause
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([...$params, $perPage, $offset]);
    $transactions = $stmt->fetchAll();

    paginatedResponse($transactions, $total, $page, $perPage);
}

function myTransactions(PDO $db): void {
    $authUser = requireAuth();
    
    $status = $_GET['status'] ?? '';
    
    $where = ['t.user_id = ?'];
    $params = [$authUser['user_id']];
    
    if ($status) {
        $where[] = 't.status = ?';
        $params[] = $status;
    }
    
    $whereClause = implode(' AND ', $where);
    
    $stmt = $db->prepare("
        SELECT t.*, 
               b.title as book_title, b.author as book_author, b.isbn, b.cover_image,
               DATEDIFF(t.due_date, NOW()) as days_remaining,
               CASE 
                   WHEN t.status = 'checked_out' AND t.due_date < NOW() THEN DATEDIFF(NOW(), t.due_date)
                   ELSE 0
               END as days_overdue
        FROM transactions t
        JOIN books b ON t.book_id = b.id
        WHERE $whereClause
        ORDER BY t.created_at DESC
    ");
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();

    jsonResponse(['transactions' => $transactions]);
}

function getTransaction(PDO $db, int $id): void {
    requireAuth();
    
    $stmt = $db->prepare("
        SELECT t.*, 
               u.full_name as student_name, u.matric_number,
               b.title as book_title, b.author as book_author,
               l.full_name as librarian_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        LEFT JOIN users l ON t.librarian_id = l.id
        WHERE t.id = ?
    ");
    $stmt->execute([$id]);
    $transaction = $stmt->fetch();

    if (!$transaction) {
        errorResponse('Transaction not found', 404);
    }

    jsonResponse(['transaction' => $transaction]);
}

function checkoutBook(PDO $db, array $input): void {
    $authUser = requireAuth();

    $userId = (int)($input['user_id'] ?? 0);
    $bookId = (int)($input['book_id'] ?? 0);
    $loanDays = (int)($input['loan_days'] ?? LOAN_PERIOD_DAYS);

    if ($authUser['role'] === 'student') {
        $userId = (int)$authUser['user_id'];
    } elseif (!$userId) {
        errorResponse('User ID and Book ID are required');
    }

    if (!$bookId) {
        errorResponse('Book ID is required');
    }

    if ($authUser['role'] === 'student' && $userId !== (int)$authUser['user_id']) {
        errorResponse('Students can only check out books for their own account', 403);
    }

    if (!in_array($authUser['role'], ['admin', 'librarian', 'student'], true)) {
        errorResponse('Insufficient permissions', 403);
    }

    // Check student exists and is active
    $stmt = $db->prepare('SELECT id, role, status, max_books FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $student = $stmt->fetch();

    if (!$student || $student['status'] !== 'active') {
        errorResponse('Student not found or inactive', 404);
    }

    // Check student's outstanding fines
    $stmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM fines WHERE user_id = ? AND status = "pending"');
    $stmt->execute([$userId]);
    $outstandingFines = (float)$stmt->fetch()['total'];
    
    if ($outstandingFines > 0) {
        errorResponse("Student has outstanding fines of ₦" . number_format($outstandingFines, 2) . ". Fines must be cleared before borrowing.", 409);
    }

    // Check borrow limit
    $stmt = $db->prepare('SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$userId]);
    $activeBorrows = (int)$stmt->fetchColumn();
    $maxBooks = $student['max_books'] ?? MAX_BOOKS_PER_STUDENT;

    if ($activeBorrows >= $maxBooks) {
        errorResponse("Student has reached maximum borrow limit of $maxBooks books", 409);
    }

    // Check book availability
    $stmt = $db->prepare('SELECT id, title, available_copies FROM books WHERE id = ? AND status = "active"');
    $stmt->execute([$bookId]);
    $book = $stmt->fetch();

    if (!$book) {
        errorResponse('Book not found or not available', 404);
    }

    if ($book['available_copies'] <= 0) {
        errorResponse('No copies of this book are currently available', 409);
    }

    // Check if student already has this book
    $stmt = $db->prepare('SELECT id FROM transactions WHERE user_id = ? AND book_id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$userId, $bookId]);
    if ($stmt->fetch()) {
        errorResponse('Student already has this book checked out', 409);
    }

    // Process checkout
    $db->beginTransaction();
    try {
        $dueDate = date('Y-m-d H:i:s', strtotime("+$loanDays days"));
        
        $stmt = $db->prepare('INSERT INTO transactions (user_id, book_id, checkout_date, due_date, status, librarian_id) VALUES (?, ?, NOW(), ?, "checked_out", ?)');
        $stmt->execute([$userId, $bookId, $dueDate, $authUser['user_id']]);
        $transactionId = $db->lastInsertId();

        $stmt = $db->prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?');
        $stmt->execute([$bookId]);

        // Log activity
        $stmt = $db->prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, "checkout", "transaction", ?, ?)');
        $stmt->execute([$authUser['user_id'], $transactionId, json_encode(['book' => $book['title'], 'student_id' => $userId])]);

        $db->commit();

        successResponse('Book checked out successfully', [
            'transaction_id' => $transactionId,
            'due_date' => $dueDate,
        ], 201);
    } catch (\Exception $e) {
        $db->rollBack();
        errorResponse('Checkout failed: ' . $e->getMessage(), 500);
    }
}

function returnBook(PDO $db, array $input): void {
    $authUser = requireAuth(['admin', 'librarian']);
    
    $transactionId = (int)($input['transaction_id'] ?? 0);

    if (!$transactionId) {
        errorResponse('Transaction ID is required');
    }

    $stmt = $db->prepare('SELECT * FROM transactions WHERE id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$transactionId]);
    $transaction = $stmt->fetch();

    if (!$transaction) {
        errorResponse('Active transaction not found', 404);
    }

    $db->beginTransaction();
    try {
        // Mark as returned
        $stmt = $db->prepare('UPDATE transactions SET status = "returned", return_date = NOW() WHERE id = ?');
        $stmt->execute([$transactionId]);

        // Increment available copies
        $stmt = $db->prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?');
        $stmt->execute([$transaction['book_id']]);

        // Calculate fine if overdue
        $dueDate = new DateTime($transaction['due_date']);
        $now = new DateTime();
        
        if ($now > $dueDate) {
            $daysOverdue = $now->diff($dueDate)->days;
            $fineAmount = $daysOverdue * FINE_RATE_PER_DAY;
            
            $stmt = $db->prepare('INSERT INTO fines (transaction_id, user_id, amount, daily_rate, days_overdue, status) VALUES (?, ?, ?, ?, ?, "pending")');
            $stmt->execute([$transactionId, $transaction['user_id'], $fineAmount, FINE_RATE_PER_DAY, $daysOverdue]);
        }

        // Log activity
        $stmt = $db->prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, "return", "transaction", ?, ?)');
        $stmt->execute([$authUser['user_id'], $transactionId, json_encode(['book_id' => $transaction['book_id']])]);

        $db->commit();

        successResponse('Book returned successfully');
    } catch (\Exception $e) {
        $db->rollBack();
        errorResponse('Return failed: ' . $e->getMessage(), 500);
    }
}
