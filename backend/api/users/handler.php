<?php
/**
 * Users API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match (true) {
    $method === 'GET' && $action === '' => listUsers($db),
    $method === 'GET' && is_numeric($action) => getUser($db, (int)$action),
    $method === 'POST' && $action === '' => createUser($db, $input),
    $method === 'PUT' && is_numeric($action) => updateUser($db, (int)$action, $input),
    $method === 'DELETE' && is_numeric($action) => deleteUser($db, (int)$action),
    default => errorResponse('Users endpoint not found', 404),
};

function listUsers(PDO $db): void {
    requireAuth(['admin']);

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    $role = $_GET['role'] ?? '';
    $search = $_GET['search'] ?? '';

    $where = ['1=1'];
    $params = [];

    if ($role) {
        $where[] = 'role = ?';
        $params[] = $role;
    }
    if ($search) {
        $where[] = '(full_name LIKE ? OR email LIKE ? OR matric_number LIKE ?)';
        $likeSearch = "%$search%";
        $params = [...$params, $likeSearch, $likeSearch, $likeSearch];
    }

    $whereClause = implode(' AND ', $where);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users WHERE $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT id, email, full_name, matric_number, role, department, phone, status, created_at 
        FROM users 
        WHERE $whereClause 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([...$params, $perPage, $offset]);
    $users = $stmt->fetchAll();

    paginatedResponse($users, $total, $page, $perPage);
}

function getUser(PDO $db, int $id): void {
    requireAuth(['admin', 'librarian']);

    $stmt = $db->prepare('SELECT id, email, full_name, matric_number, role, department, phone, status, max_books, created_at FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('User not found', 404);
    }

    // Get user stats
    $stmt = $db->prepare('SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$id]);
    $user['active_borrows'] = (int)$stmt->fetchColumn();

    $stmt = $db->prepare('SELECT COUNT(*) FROM transactions WHERE user_id = ?');
    $stmt->execute([$id]);
    $user['total_transactions'] = (int)$stmt->fetchColumn();

    $stmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM fines WHERE user_id = ? AND status = "pending"');
    $stmt->execute([$id]);
    $user['outstanding_fines'] = (float)$stmt->fetchColumn();

    jsonResponse(['user' => $user]);
}

function createUser(PDO $db, array $input): void {
    requireAuth(['admin']);

    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $fullName = trim($input['full_name'] ?? '');
    $role = $input['role'] ?? 'student';

    if (!$email || !$password || !$fullName) {
        errorResponse('Email, password, and full name are required');
    }

    if (!in_array($role, ['admin', 'librarian', 'student'])) {
        errorResponse('Invalid role');
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        errorResponse('Email already registered', 409);
    }

    $stmt = $db->prepare('INSERT INTO users (email, password_hash, full_name, matric_number, role, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $email,
        password_hash($password, PASSWORD_BCRYPT),
        $fullName,
        trim($input['matric_number'] ?? '') ?: null,
        $role,
        trim($input['department'] ?? '') ?: null,
        trim($input['phone'] ?? '') ?: null,
    ]);

    successResponse('User created successfully', ['id' => $db->lastInsertId()], 201);
}

function updateUser(PDO $db, int $id, array $input): void {
    requireAuth(['admin']);

    $fields = [];
    $values = [];
    $allowed = ['full_name', 'email', 'matric_number', 'role', 'department', 'phone', 'status', 'max_books'];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $input)) {
            $fields[] = "$field = ?";
            $values[] = $input[$field];
        }
    }

    if (isset($input['password']) && $input['password']) {
        $fields[] = 'password_hash = ?';
        $values[] = password_hash($input['password'], PASSWORD_BCRYPT);
    }

    if (empty($fields)) {
        errorResponse('No fields to update');
    }

    $values[] = $id;
    $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);

    successResponse('User updated successfully');
}

function deleteUser(PDO $db, int $id): void {
    requireAuth(['admin']);

    // Don't allow self-delete
    $authUser = getAuthUser();
    if ($authUser['user_id'] == $id) {
        errorResponse('Cannot delete your own account', 409);
    }

    $stmt = $db->prepare('SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status IN ("checked_out", "overdue")');
    $stmt->execute([$id]);
    if ((int)$stmt->fetchColumn() > 0) {
        errorResponse('Cannot delete user with active transactions', 409);
    }

    $stmt = $db->prepare("UPDATE users SET status = 'inactive' WHERE id = ?");
    $stmt->execute([$id]);

    successResponse('User deactivated successfully');
}
