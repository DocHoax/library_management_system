<?php
/**
 * Reports API Handler
 */

$db = Database::getConnection();

match (true) {
    $method === 'GET' && $action === 'dashboard' => dashboardStats($db),
    $method === 'GET' && $action === 'analytics' => analyticsData($db),
    $method === 'GET' && $action === 'activity' => recentActivity($db),
    default => errorResponse('Reports endpoint not found', 404),
};

function dashboardStats(PDO $db): void {
    requireAuth(['admin', 'librarian']);

    // Total books
    $totalBooks = (int)$db->query("SELECT COUNT(*) FROM books WHERE status = 'active'")->fetchColumn();
    $totalCopies = (int)$db->query("SELECT COALESCE(SUM(total_copies), 0) FROM books WHERE status = 'active'")->fetchColumn();

    // Total users by role
    $userStats = $db->query("SELECT role, COUNT(*) as count FROM users WHERE status = 'active' GROUP BY role")->fetchAll();
    $usersByRole = [];
    foreach ($userStats as $stat) {
        $usersByRole[$stat['role']] = (int)$stat['count'];
    }

    // Active borrows
    $activeBorrows = (int)$db->query("SELECT COUNT(*) FROM transactions WHERE status = 'checked_out'")->fetchColumn();

    // Overdue books
    $overdueBooks = (int)$db->query("SELECT COUNT(*) FROM transactions WHERE status = 'overdue' OR (status = 'checked_out' AND due_date < NOW())")->fetchColumn();

    // Pending fines total
    $pendingFines = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM fines WHERE status = 'pending'")->fetchColumn();

    // Revenue from paid fines
    $paidFines = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM fines WHERE status = 'paid'")->fetchColumn();

    // This month's checkouts
    $monthCheckouts = (int)$db->query("SELECT COUNT(*) FROM transactions WHERE MONTH(checkout_date) = MONTH(NOW()) AND YEAR(checkout_date) = YEAR(NOW())")->fetchColumn();

    // Books due today
    $dueToday = (int)$db->query("SELECT COUNT(*) FROM transactions WHERE status = 'checked_out' AND DATE(due_date) = CURDATE()")->fetchColumn();

    // Recent transactions
    $recentTransactions = $db->query("
        SELECT t.id, t.checkout_date, t.due_date, t.return_date, t.status,
               u.full_name as student_name, u.matric_number,
               b.title as book_title
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        ORDER BY t.created_at DESC
        LIMIT 10
    ")->fetchAll();

    // Popular books (most borrowed)
    $popularBooks = $db->query("
        SELECT b.id, b.title, b.author, b.cover_image, COUNT(t.id) as borrow_count
        FROM books b
        JOIN transactions t ON b.id = t.book_id
        WHERE b.status = 'active'
        GROUP BY b.id, b.title, b.author, b.cover_image
        ORDER BY borrow_count DESC
        LIMIT 5
    ")->fetchAll();

    jsonResponse([
        'stats' => [
            'total_books' => $totalBooks,
            'total_copies' => $totalCopies,
            'active_borrowers' => $activeBorrows,
            'overdue_books' => $overdueBooks,
            'pending_fines' => $pendingFines,
            'paid_fines' => $paidFines,
            'month_checkouts' => $monthCheckouts,
            'due_today' => $dueToday,
        ],
        'users_by_role' => $usersByRole,
        'recent_transactions' => $recentTransactions,
        'popular_books' => $popularBooks,
    ]);
}

function analyticsData(PDO $db): void {
    requireAuth(['admin']);

    // Monthly borrowing trends (last 12 months)
    $monthlyTrends = $db->query("
        SELECT DATE_FORMAT(checkout_date, '%Y-%m') as month,
               COUNT(*) as checkouts,
               SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returns
        FROM transactions
        WHERE checkout_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
    ")->fetchAll();

    // Books by category
    $booksByCategory = $db->query("
        SELECT c.name as category, COUNT(b.id) as count
        FROM categories c
        LEFT JOIN books b ON c.id = b.category_id AND b.status = 'active'
        GROUP BY c.id, c.name
        ORDER BY count DESC
    ")->fetchAll();

    // Top borrowed books
    $topBooks = $db->query("
        SELECT b.title, b.author, COUNT(t.id) as borrow_count
        FROM books b
        JOIN transactions t ON b.id = t.book_id
        GROUP BY b.id, b.title, b.author
        ORDER BY borrow_count DESC
        LIMIT 10
    ")->fetchAll();

    // Overdue by department
    $overdueByDept = $db->query("
        SELECT u.department, COUNT(t.id) as overdue_count
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.status = 'overdue' OR (t.status = 'checked_out' AND t.due_date < NOW())
        GROUP BY u.department
        ORDER BY overdue_count DESC
    ")->fetchAll();

    jsonResponse([
        'monthly_trends' => $monthlyTrends,
        'books_by_category' => $booksByCategory,
        'top_books' => $topBooks,
        'overdue_by_department' => $overdueByDept,
    ]);
}

function recentActivity(PDO $db): void {
    requireAuth(['admin', 'librarian']);

    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));

    $stmt = $db->prepare("
        SELECT a.*, u.full_name as user_name
        FROM activity_log a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $activities = $stmt->fetchAll();

    jsonResponse(['activities' => $activities]);
}
