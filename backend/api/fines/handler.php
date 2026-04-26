<?php
/**
 * Fines API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match (true) {
    $method === 'GET' && $action === '' => listFines($db),
    $method === 'GET' && $action === 'my' => myFines($db),
    $method === 'POST' && $action === 'pay' => payFine($db, $input),
    $method === 'POST' && $action === 'waive' => waiveFine($db, $input),
    default => errorResponse('Fines endpoint not found', 404),
};

function listFines(PDO $db): void {
    requireAuth(['admin', 'librarian']);

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $status = $_GET['status'] ?? '';

    $where = ['1=1'];
    $params = [];

    if ($status) {
        $where[] = 'f.status = ?';
        $params[] = $status;
    }

    $whereClause = implode(' AND ', $where);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM fines f WHERE $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT f.*, u.full_name as student_name, u.matric_number,
               b.title as book_title
        FROM fines f
        JOIN users u ON f.user_id = u.id
        JOIN transactions t ON f.transaction_id = t.id
        JOIN books b ON t.book_id = b.id
        WHERE $whereClause
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([...$params, $perPage, $offset]);
    $fines = $stmt->fetchAll();

    paginatedResponse($fines, $total, $page, $perPage);
}

function myFines(PDO $db): void {
    $authUser = requireAuth();

    $stmt = $db->prepare("
        SELECT f.*, b.title as book_title
        FROM fines f
        JOIN transactions t ON f.transaction_id = t.id
        JOIN books b ON t.book_id = b.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    ");
    $stmt->execute([$authUser['user_id']]);
    $fines = $stmt->fetchAll();

    // Summary
    $totalPending = array_sum(array_map(fn($f) => $f['status'] === 'pending' ? (float)$f['amount'] : 0, $fines));
    $totalPaid = array_sum(array_map(fn($f) => $f['status'] === 'paid' ? (float)$f['amount'] : 0, $fines));

    jsonResponse([
        'fines' => $fines,
        'summary' => [
            'total_pending' => $totalPending,
            'total_paid' => $totalPaid,
        ]
    ]);
}

function payFine(PDO $db, array $input): void {
    requireAuth(['admin', 'librarian']);

    $fineId = (int)($input['fine_id'] ?? 0);
    if (!$fineId) {
        errorResponse('Fine ID is required');
    }

    $stmt = $db->prepare('SELECT * FROM fines WHERE id = ? AND status = "pending"');
    $stmt->execute([$fineId]);
    $fine = $stmt->fetch();

    if (!$fine) {
        errorResponse('Pending fine not found', 404);
    }

    $stmt = $db->prepare('UPDATE fines SET status = "paid", paid_date = NOW() WHERE id = ?');
    $stmt->execute([$fineId]);

    successResponse('Fine marked as paid');
}

function waiveFine(PDO $db, array $input): void {
    requireAuth(['admin']);

    $fineId = (int)($input['fine_id'] ?? 0);
    if (!$fineId) {
        errorResponse('Fine ID is required');
    }

    $stmt = $db->prepare('UPDATE fines SET status = "waived" WHERE id = ? AND status = "pending"');
    $stmt->execute([$fineId]);

    if ($stmt->rowCount() === 0) {
        errorResponse('Pending fine not found', 404);
    }

    successResponse('Fine waived');
}
