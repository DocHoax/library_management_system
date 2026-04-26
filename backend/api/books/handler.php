<?php
/**
 * Books API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match (true) {
    $method === 'GET' && $action === '' => listBooks($db),
    $method === 'GET' && $action === 'search' => searchBooks($db),
    $method === 'GET' && is_numeric($action) => getBook($db, (int)$action),
    $method === 'POST' && $action === '' => createBook($db, $input),
    $method === 'PUT' && is_numeric($action) => updateBook($db, (int)$action, $input),
    $method === 'DELETE' && is_numeric($action) => deleteBook($db, (int)$action),
    default => errorResponse('Books endpoint not found', 404),
};

function listBooks(PDO $db): void {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 12)));
    $offset = ($page - 1) * $perPage;

    $where = ['b.status = "active"'];
    $params = [];

    if ($cat = $_GET['category_id'] ?? '') {
        $where[] = 'b.category_id = ?';
        $params[] = (int)$cat;
    }
    if ($dept = $_GET['department'] ?? '') {
        $where[] = 'b.department = ?';
        $params[] = $dept;
    }
    if (($avail = $_GET['available'] ?? '') !== '') {
        if ($avail === '1' || $avail === 'true') {
            $where[] = 'b.available_copies > 0';
        } else {
            $where[] = 'b.available_copies = 0';
        }
    }

    $whereClause = implode(' AND ', $where);

    // Count total
    $countStmt = $db->prepare("SELECT COUNT(*) FROM books b WHERE $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Fetch books
    $stmt = $db->prepare("
        SELECT b.*, c.name as category_name 
        FROM books b 
        LEFT JOIN categories c ON b.category_id = c.id 
        WHERE $whereClause 
        ORDER BY b.title ASC 
        LIMIT ? OFFSET ?
    ");
    $allParams = [...$params, $perPage, $offset];
    $stmt->execute($allParams);
    $books = $stmt->fetchAll();

    paginatedResponse($books, $total, $page, $perPage);
}

function searchBooks(PDO $db): void {
    $query = trim($_GET['q'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 12)));
    $offset = ($page - 1) * $perPage;

    if (!$query) {
        listBooks($db);
        return;
    }

    // Count
    $countStmt = $db->prepare("
        SELECT COUNT(*) FROM books b 
        WHERE b.status = 'active' 
        AND (MATCH(b.title, b.author, b.description) AGAINST(? IN NATURAL LANGUAGE MODE) 
             OR b.isbn LIKE ? OR b.call_number LIKE ?)
    ");
    $likeQuery = "%$query%";
    $countStmt->execute([$query, $likeQuery, $likeQuery]);
    $total = (int)$countStmt->fetchColumn();

    // Fetch
    $stmt = $db->prepare("
        SELECT b.*, c.name as category_name,
        MATCH(b.title, b.author, b.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
        FROM books b 
        LEFT JOIN categories c ON b.category_id = c.id 
        WHERE b.status = 'active' 
        AND (MATCH(b.title, b.author, b.description) AGAINST(? IN NATURAL LANGUAGE MODE) 
             OR b.isbn LIKE ? OR b.call_number LIKE ?)
        ORDER BY relevance DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$query, $query, $likeQuery, $likeQuery, $perPage, $offset]);
    $books = $stmt->fetchAll();

    paginatedResponse($books, $total, $page, $perPage);
}

function getBook(PDO $db, int $id): void {
    $stmt = $db->prepare("
        SELECT b.*, c.name as category_name 
        FROM books b 
        LEFT JOIN categories c ON b.category_id = c.id 
        WHERE b.id = ?
    ");
    $stmt->execute([$id]);
    $book = $stmt->fetch();

    if (!$book) {
        errorResponse('Book not found', 404);
    }

    // Get recent transactions for this book
    $stmt = $db->prepare("
        SELECT t.checkout_date, t.due_date, t.return_date, t.status
        FROM transactions t 
        WHERE t.book_id = ? 
        ORDER BY t.created_at DESC 
        LIMIT 5
    ");
    $stmt->execute([$id]);
    $book['recent_transactions'] = $stmt->fetchAll();

    jsonResponse(['book' => $book]);
}

function createBook(PDO $db, array $input): void {
    requireAuth(['admin', 'librarian']);

    $required = ['title', 'author'];
    foreach ($required as $field) {
        if (empty(trim($input[$field] ?? ''))) {
            errorResponse("$field is required");
        }
    }

    $stmt = $db->prepare("
        INSERT INTO books (title, author, isbn, publisher, edition, publish_year, category_id, department, description, cover_image, call_number, total_copies, available_copies, pages, language) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $totalCopies = max(1, (int)($input['total_copies'] ?? 1));
    
    $stmt->execute([
        trim($input['title']),
        trim($input['author']),
        trim($input['isbn'] ?? '') ?: null,
        trim($input['publisher'] ?? '') ?: null,
        trim($input['edition'] ?? '') ?: null,
        $input['publish_year'] ?? null,
        $input['category_id'] ?? null,
        trim($input['department'] ?? '') ?: null,
        trim($input['description'] ?? '') ?: null,
        trim($input['cover_image'] ?? '') ?: null,
        trim($input['call_number'] ?? '') ?: null,
        $totalCopies,
        $totalCopies,
        $input['pages'] ?? null,
        trim($input['language'] ?? 'English'),
    ]);

    $bookId = $db->lastInsertId();
    
    successResponse('Book added successfully', ['id' => $bookId], 201);
}

function updateBook(PDO $db, int $id, array $input): void {
    requireAuth(['admin', 'librarian']);

    $book = $db->prepare('SELECT * FROM books WHERE id = ?');
    $book->execute([$id]);
    if (!$book->fetch()) {
        errorResponse('Book not found', 404);
    }

    $fields = [];
    $values = [];
    
    $allowedFields = ['title', 'author', 'isbn', 'publisher', 'edition', 'publish_year', 'category_id', 'department', 'description', 'cover_image', 'call_number', 'total_copies', 'pages', 'language', 'status'];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            $fields[] = "$field = ?";
            $values[] = $input[$field];
        }
    }

    if (empty($fields)) {
        errorResponse('No fields to update');
    }

    $values[] = $id;
    $stmt = $db->prepare("UPDATE books SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);

    successResponse('Book updated successfully');
}

function deleteBook(PDO $db, int $id): void {
    requireAuth(['admin']);

    // Check if book has active transactions
    $stmt = $db->prepare('SELECT COUNT(*) FROM transactions WHERE book_id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$id]);
    if ((int)$stmt->fetchColumn() > 0) {
        errorResponse('Cannot delete book with active transactions', 409);
    }

    $stmt = $db->prepare("UPDATE books SET status = 'archived' WHERE id = ?");
    $stmt->execute([$id]);

    successResponse('Book archived successfully');
}
