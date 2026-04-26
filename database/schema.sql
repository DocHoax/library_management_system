-- LASUSTECH Library Management System
-- Database Schema for MySQL 8.x
-- Created: 2026-04-26

CREATE DATABASE IF NOT EXISTS lasustech_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lasustech_library;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  matric_number VARCHAR(30) UNIQUE DEFAULT NULL,
  role ENUM('admin', 'librarian', 'student') NOT NULL DEFAULT 'student',
  department VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  status ENUM('active', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
  max_books TINYINT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_department (department)
) ENGINE=InnoDB;

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 3. BOOKS TABLE
-- ============================================
CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300) NOT NULL,
  isbn VARCHAR(20) UNIQUE DEFAULT NULL,
  publisher VARCHAR(200) DEFAULT NULL,
  edition VARCHAR(50) DEFAULT NULL,
  publish_year YEAR DEFAULT NULL,
  category_id INT DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  cover_image VARCHAR(500) DEFAULT NULL,
  call_number VARCHAR(50) DEFAULT NULL,
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  pages INT DEFAULT NULL,
  language VARCHAR(50) DEFAULT 'English',
  status ENUM('active', 'archived', 'damaged') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_title (title(100)),
  INDEX idx_author (author(100)),
  INDEX idx_isbn (isbn),
  INDEX idx_category (category_id),
  INDEX idx_department (department),
  INDEX idx_status (status),
  FULLTEXT idx_search (title, author, description)
) ENGINE=InnoDB;

-- ============================================
-- 4. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  checkout_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NOT NULL,
  return_date DATETIME DEFAULT NULL,
  status ENUM('checked_out', 'returned', 'overdue') NOT NULL DEFAULT 'checked_out',
  librarian_id INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
  FOREIGN KEY (librarian_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_book (book_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_checkout_date (checkout_date)
) ENGINE=InnoDB;

-- ============================================
-- 5. FINES TABLE
-- ============================================
CREATE TABLE fines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  daily_rate DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  days_overdue INT NOT NULL DEFAULT 0,
  status ENUM('pending', 'paid', 'waived') NOT NULL DEFAULT 'pending',
  calculated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_date DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- 6. RESERVATIONS TABLE
-- ============================================
CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  reserved_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATETIME NOT NULL,
  status ENUM('active', 'fulfilled', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_book (book_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- 7. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT DEFAULT NULL,
  details JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================
-- EVENT: Auto-update overdue transactions
-- ============================================
DELIMITER //
CREATE EVENT IF NOT EXISTS update_overdue_status
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  UPDATE transactions
  SET status = 'overdue'
  WHERE status = 'checked_out'
    AND due_date < NOW();
END //
DELIMITER ;
