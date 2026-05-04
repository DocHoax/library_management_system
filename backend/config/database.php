<?php
/**
 * LASUSTECH Library Management System
 * Database Configuration
 */

function loadEnvFile(string $path): void {
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        if ($key === '') {
            continue;
        }

        $firstChar = substr($value, 0, 1);
        $lastChar = substr($value, -1);
        if (($firstChar === '"' && $lastChar === '"') || ($firstChar === "'" && $lastChar === "'")) {
            $value = substr($value, 1, -1);
        }

        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

function envValue(string $key, mixed $default = null): mixed {
    $value = getenv($key);

    if ($value === false) {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? false;
    }

    return $value === false ? $default : $value;
}

loadEnvFile(__DIR__ . '/../.env');

define('DB_HOST', envValue('DB_HOST', 'localhost'));
define('DB_NAME', envValue('DB_NAME', 'lasustech_library'));
define('DB_USER', envValue('DB_USER', 'root'));
define('DB_PASS', envValue('DB_PASS', ''));
define('DB_CHARSET', envValue('DB_CHARSET', 'utf8mb4'));

// JWT Secret Key
define('JWT_SECRET', envValue('JWT_SECRET', 'lasustech_lms_secret_key_2026_change_in_production'));
define('JWT_EXPIRY', (int)envValue('JWT_EXPIRY', 86400)); // 24 hours

// Business Rules
define('MAX_BOOKS_PER_STUDENT', (int)envValue('MAX_BOOKS_PER_STUDENT', 5));
define('LOAN_PERIOD_DAYS', (int)envValue('LOAN_PERIOD_DAYS', 14));
define('FINE_RATE_PER_DAY', (float)envValue('FINE_RATE_PER_DAY', 100.00)); // ₦100/day

// CORS Settings
define('ALLOWED_ORIGIN', envValue('ALLOWED_ORIGIN', 'http://localhost:5173'));

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
