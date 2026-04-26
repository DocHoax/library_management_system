<?php
/**
 * Categories API Handler
 */

$db = Database::getConnection();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

match (true) {
    $method === 'GET' && $action === '' => listCategories($db),
    $method === 'GET' && is_numeric($action) => getCategory($db, (int)$action),
    $method === 'POST' && $action === '' => createCategory($db, $input),
    default => errorResponse('Categories endpoint not found', 404),
};

function listCategories(PDO $db): void {
    $stmt = $db->query("
        SELECT c.*, COUNT(b.id) as book_count
        FROM categories c
        LEFT JOIN books b ON c.id = b.category_id AND b.status = 'active'
        GROUP BY c.id
        ORDER BY c.name ASC
    ");
    jsonResponse(['categories' => $stmt->fetchAll()]);
}

function getCategory(PDO $db, int $id): void {
    $stmt = $db->prepare('SELECT * FROM categories WHERE id = ?');
    $stmt->execute([$id]);
    $category = $stmt->fetch();

    if (!$category) {
        errorResponse('Category not found', 404);
    }

    jsonResponse(['category' => $category]);
}

function createCategory(PDO $db, array $input): void {
    requireAuth(['admin']);

    $name = trim($input['name'] ?? '');
    if (!$name) {
        errorResponse('Category name is required');
    }

    $stmt = $db->prepare('INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)');
    $stmt->execute([$name, $input['description'] ?? null, $input['icon'] ?? null]);

    successResponse('Category created', ['id' => $db->lastInsertId()], 201);
}
