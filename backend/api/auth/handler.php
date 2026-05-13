<?php
/**
 * Auth API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match ($action) {
    'login' => handleLogin($db, $input),
    'register' => handleRegister($db, $input),
    'bootstrap-status' => handleBootstrapStatus($db),
    'bootstrap-admin' => handleBootstrapAdmin($db, $input),
    'invite' => handleCreateInvite($db, $input),
    'invites' => handleInvites($db, $input),
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
    $inviteCode = trim($input['invite_code'] ?? '');

    $role = 'student';
    $invite = null;

    if ($inviteCode !== '') {
        $invite = getActiveInvite($db, $inviteCode);
        $role = $invite['role'];
    }

    if (!$email || !$password || !$fullName) {
        errorResponse('Email, password, and full name are required');
    }

    if (strlen($password) < 6) {
        errorResponse('Password must be at least 6 characters');
    }

    if ($role !== 'student' && $invite === null) {
        errorResponse('Staff registration requires a valid invite code', 403);
    }

    // Check if email already exists
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        errorResponse('Email already registered', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare('INSERT INTO users (email, password_hash, full_name, matric_number, role, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$email, $passwordHash, $fullName, $matricNumber ?: null, $role, $department ?: null, $phone ?: null]);

    $userId = $db->lastInsertId();

    if ($invite) {
        $stmt = $db->prepare('UPDATE invites SET used_at = NOW() WHERE id = ?');
        $stmt->execute([$invite['id']]);
    }

    $token = generateToken([
        'user_id' => $userId,
        'email' => $email,
        'role' => $role,
        'name' => $fullName,
    ]);

    jsonResponse([
        'message' => 'Registration successful',
        'token' => $token,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'full_name' => $fullName,
            'role' => $role,
            'department' => $department,
        ],
    ], 201);
}

function handleBootstrapStatus(PDO $db): void {
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    $stmt->execute();

    $adminCount = (int)$stmt->fetchColumn();

    jsonResponse([
        'available' => $adminCount === 0,
        'admin_count' => $adminCount,
        'message' => $adminCount === 0
            ? 'Bootstrap admin is available'
            : 'An administrator already exists. Use sign in instead.',
    ]);
}

function handleBootstrapAdmin(PDO $db, array $input): void {
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    $stmt->execute();

    if ((int)$stmt->fetchColumn() > 0) {
        errorResponse('Bootstrap admin is only available before the first admin account exists', 409);
    }

    $bootstrapKey = trim($input['bootstrap_key'] ?? '');
    if (BOOTSTRAP_ADMIN_KEY === '') {
        errorResponse('Bootstrap admin is not configured', 500);
    }

    if (!$bootstrapKey || !hash_equals(BOOTSTRAP_ADMIN_KEY, $bootstrapKey)) {
        errorResponse('Invalid bootstrap key', 403);
    }

    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $fullName = trim($input['full_name'] ?? '');
    $department = trim($input['department'] ?? 'Library Services');
    $phone = trim($input['phone'] ?? '');

    if (!$email || !$password || !$fullName) {
        errorResponse('Email, password, and full name are required');
    }

    if (strlen($password) < 6) {
        errorResponse('Password must be at least 6 characters');
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        errorResponse('Email already registered', 409);
    }

    $stmt = $db->prepare('INSERT INTO users (email, password_hash, full_name, role, department, phone) VALUES (?, ?, ?, \'admin\', ?, ?)');
    $stmt->execute([
        $email,
        password_hash($password, PASSWORD_BCRYPT),
        $fullName,
        $department ?: null,
        $phone ?: null,
    ]);

    $userId = $db->lastInsertId();

    $token = generateToken([
        'user_id' => $userId,
        'email' => $email,
        'role' => 'admin',
        'name' => $fullName,
    ]);

    jsonResponse([
        'message' => 'Bootstrap admin created successfully',
        'token' => $token,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'full_name' => $fullName,
            'role' => 'admin',
            'department' => $department ?: null,
        ],
    ], 201);
}

function handleCreateInvite(PDO $db, array $input): void {
    $authUser = requireAuth(['admin']);

    $role = $input['role'] ?? 'librarian';
    $expiresInDays = max(1, (int)($input['expires_in_days'] ?? INVITE_EXPIRY_DAYS));

    if (!in_array($role, ['admin', 'librarian', 'student'], true)) {
        errorResponse('Invalid invite role');
    }

    $code = strtoupper(bin2hex(random_bytes(4)) . bin2hex(random_bytes(4)));
    $expiresAt = date('Y-m-d H:i:s', strtotime("+$expiresInDays days"));

    $stmt = $db->prepare('INSERT INTO invites (code, role, created_by, expires_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$code, $role, $authUser['user_id'], $expiresAt]);

    jsonResponse([
        'message' => 'Invite created successfully',
        'invite' => [
            'id' => (int)$db->lastInsertId(),
            'code' => $code,
            'role' => $role,
            'expires_at' => $expiresAt,
        ],
    ], 201);
}

function handleInvites(PDO $db, array $input): void {
    requireAuth(['admin']);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query(
            "SELECT i.id, i.code, i.role, i.created_by, i.expires_at, i.used_at, i.revoked_at, i.created_at, u.full_name AS created_by_name,
            CASE
                WHEN i.used_at IS NOT NULL THEN 'used'
                WHEN i.revoked_at IS NOT NULL THEN 'revoked'
                WHEN i.expires_at < NOW() THEN 'expired'
                ELSE 'active'
            END AS status
            FROM invites i
            LEFT JOIN users u ON u.id = i.created_by
            ORDER BY i.created_at DESC, i.id DESC"
        );

        jsonResponse([
            'invites' => $stmt->fetchAll(),
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        handleUpdateInvite($db, $input);
    }

    errorResponse('Invite endpoint not found', 404);
}

function handleUpdateInvite(PDO $db, array $input): void {
    global $id;

    if (!ctype_digit((string)$id)) {
        errorResponse('Invite id is required', 400);
    }

    $status = strtolower(trim($input['status'] ?? ''));
    if (!in_array($status, ['revoked', 'expired'], true)) {
        errorResponse('Valid status is required');
    }

    $stmt = $db->prepare('SELECT id, used_at, revoked_at FROM invites WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$id]);
    $invite = $stmt->fetch();

    if (!$invite) {
        errorResponse('Invite not found', 404);
    }

    if ($invite['used_at'] !== null) {
        errorResponse('Used invites cannot be modified', 409);
    }

    if ($status === 'revoked') {
        $stmt = $db->prepare('UPDATE invites SET revoked_at = NOW() WHERE id = ?');
        $stmt->execute([(int)$id]);
    } else {
        $stmt = $db->prepare('UPDATE invites SET expires_at = NOW(), revoked_at = NULL WHERE id = ?');
        $stmt->execute([(int)$id]);
    }

    $stmt = $db->prepare(
        "SELECT i.id, i.code, i.role, i.created_by, i.expires_at, i.used_at, i.revoked_at, i.created_at, u.full_name AS created_by_name,
        CASE
            WHEN i.used_at IS NOT NULL THEN 'used'
            WHEN i.revoked_at IS NOT NULL THEN 'revoked'
            WHEN i.expires_at < NOW() THEN 'expired'
            ELSE 'active'
        END AS status
        FROM invites i
        LEFT JOIN users u ON u.id = i.created_by
        WHERE i.id = ?
        LIMIT 1"
    );
    $stmt->execute([(int)$id]);

    jsonResponse([
        'message' => 'Invite updated successfully',
        'invite' => $stmt->fetch(),
    ]);
}

function getActiveInvite(PDO $db, string $code): array|null {
    $stmt = $db->prepare('SELECT id, code, role, expires_at, used_at, revoked_at FROM invites WHERE code = ? LIMIT 1');
    $stmt->execute([$code]);
    $invite = $stmt->fetch();

    if (!$invite) {
        errorResponse('Invalid invite code', 404);
    }

    if ($invite['used_at'] !== null) {
        errorResponse('Invite code has already been used', 409);
    }

    if ($invite['revoked_at'] !== null) {
        errorResponse('Invite code has been revoked', 409);
    }

    if (strtotime($invite['expires_at']) < time()) {
        errorResponse('Invite code has expired', 409);
    }

    return $invite;
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
