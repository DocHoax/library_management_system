<?php
/**
 * LASUSTECH Library Management System
 * Database Configuration (XAMPP MySQL)
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'lasustech_library');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// JWT Secret Key
define('JWT_SECRET', 'lasustech_lms_secret_key_2026_change_in_production');
define('JWT_EXPIRY', 86400); // 24 hours

// Business Rules
define('MAX_BOOKS_PER_STUDENT', 5);
define('LOAN_PERIOD_DAYS', 14);
define('FINE_RATE_PER_DAY', 100.00); // ₦100/day

// CORS Settings
define('ALLOWED_ORIGIN', 'http://localhost:5173');

class Database {
    private static ?PDO $connection = null;

    public static function getConnection(): PDO {
        if (self::$connection === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                self::$connection = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
                exit;
            }
        }
        return self::$connection;
    }
}
