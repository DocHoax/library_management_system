<?php
/**
 * Reservations API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match (true) {
    $method === 'POST' && $action === '' => createReservation($db, $input),
    default => errorResponse('Reservations endpoint not found', 404),
};

function createReservation(PDO $db, array $input): void {
    $authUser = requireAuth();
    $bookId = (int)($input['book_id'] ?? 0);

    if (!$bookId) {
        errorResponse('Book ID is required');
    }

    $stmt = $db->prepare('SELECT id, title, status FROM books WHERE id = ?');
    $stmt->execute([$bookId]);
    $book = $stmt->fetch();

    if (!$book || $book['status'] !== 'active') {
        errorResponse('Book not found or unavailable', 404);
    }

    $stmt = $db->prepare('SELECT id FROM reservations WHERE user_id = ? AND book_id = ? AND status = "active"');
    $stmt->execute([$authUser['user_id'], $bookId]);
    if ($stmt->fetch()) {
        errorResponse('You already have an active reservation for this book', 409);
    }

    $stmt = $db->prepare('SELECT id FROM transactions WHERE user_id = ? AND book_id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$authUser['user_id'], $bookId]);
    if ($stmt->fetch()) {
        errorResponse('You already have this book checked out', 409);
    }

    $expiryDate = date('Y-m-d H:i:s', strtotime('+7 days'));

    $stmt = $db->prepare('INSERT INTO reservations (user_id, book_id, expiry_date, status) VALUES (?, ?, ?, "active")');
    $stmt->execute([$authUser['user_id'], $bookId, $expiryDate]);

    $reservationId = $db->lastInsertId();

    $stmt = $db->prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, "reserve", "reservation", ?, ?)');
    $stmt->execute([
        $authUser['user_id'],
        $reservationId,
        json_encode(['book' => $book['title'], 'book_id' => $bookId]),
    ]);

    successResponse('Book reserved successfully', [
        'reservation_id' => $reservationId,
        'expiry_date' => $expiryDate,
    ], 201);
}