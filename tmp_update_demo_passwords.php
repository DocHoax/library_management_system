<?php
require __DIR__ . '/backend/config/database.php';
$db = Database::getConnection();
$hash = '$2y$10$L09Fbqvpdg6.bcOX.rto/e0O4FF4AYHyyutt5y9XPoLYvFIT4v.p2';
$emails = [
    'admin@lasustech.edu.ng',
    'director@lasustech.edu.ng',
    'librarian1@lasustech.edu.ng',
    'librarian2@lasustech.edu.ng',
    'librarian3@lasustech.edu.ng',
    'student1@lasustech.edu.ng',
    'student2@lasustech.edu.ng',
    'student3@lasustech.edu.ng',
    'student4@lasustech.edu.ng',
    'student5@lasustech.edu.ng',
    'student6@lasustech.edu.ng',
    'student7@lasustech.edu.ng',
    'student8@lasustech.edu.ng',
    'student9@lasustech.edu.ng',
    'student10@lasustech.edu.ng',
];

$stmt = $db->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
foreach ($emails as $email) {
    $stmt->execute([$hash, $email]);
}

echo 'Updated ' . count($emails) . " demo accounts\n";
