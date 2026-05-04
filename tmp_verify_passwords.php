<?php
$hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
foreach (['password', 'password123', 'Password123', 'admin', '123456'] as $candidate) {
    echo $candidate . ': ' . (password_verify($candidate, $hash) ? 'true' : 'false') . PHP_EOL;
}
