<?php
/**
 * Auth API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match ($action) {
    'login' => handleLogin($db, $input),
    'register' => handleRegister($db, $input),
    'me' => handleMe($db),
    default => errorResponse('Auth endpoint not found', 404),
};

function handleLogin(PDO $db, array $input): void {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        errorResponse('Email and password are required');
    }

    $stmt = $db->prepare('SELECT id, email, password_hash, full_name, role, department, matric_number, avatar_url, status FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        errorResponse('Invalid email or password', 401);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Account is suspended or inactive', 403);
    }

    $token = generateToken([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'name' => $user['full_name'],
    ]);

    unset($user['password_hash']);

    jsonResponse([
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user,
    ]);
}

function handleRegister(PDO $db, array $input): void {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $fullName = trim($input['full_name'] ?? '');
    $matricNumber = trim($input['matric_number'] ?? '');
    $department = trim($input['department'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if (!$email || !$password || !$fullName) {
        errorResponse('Email, password, and full name are required');
    }

    if (strlen($password) < 6) {
        errorResponse('Password must be at least 6 characters');
    }

    // Check if email already exists
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        errorResponse('Email already registered', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare('INSERT INTO users (email, password_hash, full_name, matric_number, role, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$email, $passwordHash, $fullName, $matricNumber ?: null, 'student', $department ?: null, $phone ?: null]);

    $userId = $db->lastInsertId();

    $token = generateToken([
        'user_id' => $userId,
        'email' => $email,
        'role' => 'student',
        'name' => $fullName,
    ]);

    jsonResponse([
        'message' => 'Registration successful',
        'token' => $token,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'full_name' => $fullName,
            'role' => 'student',
            'department' => $department,
        ],
    ], 201);
}

function handleMe(PDO $db): void {
    $authUser = requireAuth();

    $stmt = $db->prepare('SELECT id, email, full_name, matric_number, role, department, phone, avatar_url, status, max_books, created_at FROM users WHERE id = ?');
    $stmt->execute([$authUser['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('User not found', 404);
    }

    // Get active borrows count for students
    if ($user['role'] === 'student') {
        $stmt = $db->prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND status IN ("checked_out", "overdue")');
        $stmt->execute([$user['id']]);
        $user['active_borrows'] = (int)$stmt->fetch()['count'];

        // Get outstanding fines
        $stmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) as total FROM fines WHERE user_id = ? AND status = "pending"');
        $stmt->execute([$user['id']]);
        $user['outstanding_fines'] = (float)$stmt->fetch()['total'];
    }

    jsonResponse(['user' => $user]);
}
