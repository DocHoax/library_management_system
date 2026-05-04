<?php
require __DIR__ . '/backend/config/database.php';
$db = Database::getConnection();
$stmt = $db->prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?');
$stmt->execute(['admin@lasustech.edu.ng']);
var_export($stmt->fetch());
