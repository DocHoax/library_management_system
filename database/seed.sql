-- LASUSTECH Library Management System
-- Seed Data for Development
-- Fine Rate: ₦100/day | Max Books: 5/student

USE lasustech_library;

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO categories (name, description, icon) VALUES
('Computer Science', 'Programming, algorithms, data structures, AI, and software engineering', 'monitor'),
('Engineering', 'Mechanical, electrical, civil, and chemical engineering', 'settings'),
('Mathematics', 'Pure mathematics, applied mathematics, and statistics', 'calculator'),
('Physics', 'Classical mechanics, quantum physics, and thermodynamics', 'atom'),
('Chemistry', 'Organic, inorganic, and physical chemistry', 'flask-conical'),
('Biology', 'Microbiology, genetics, and molecular biology', 'microscope'),
('Business Administration', 'Management, finance, accounting, and entrepreneurship', 'briefcase'),
('Humanities', 'Literature, philosophy, history, and languages', 'book-open'),
('Environmental Science', 'Ecology, conservation, and environmental management', 'leaf'),
('General Reference', 'Encyclopedias, dictionaries, and general knowledge', 'library');

-- ============================================
-- USERS (passwords are bcrypt hash of 'password123')
-- ============================================
INSERT INTO users (email, password_hash, full_name, matric_number, role, department, phone, status) VALUES
-- Admins
('admin@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Adebayo Oluwaseun', NULL, 'admin', 'Library Services', '08012345678', 'active'),
('director@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Prof. Funmilayo Adeyemi', NULL, 'admin', 'University Administration', '08023456789', 'active'),

-- Librarians
('librarian1@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mrs. Chidinma Okonkwo', NULL, 'librarian', 'Library Services', '08034567890', 'active'),
('librarian2@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mr. Emeka Nwosu', NULL, 'librarian', 'Library Services', '08045678901', 'active'),
('librarian3@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Miss Aisha Bello', NULL, 'librarian', 'Library Services', '08056789012', 'active'),

-- Students
('student1@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Adebayo Ogundimu', '20/0001', 'student', 'Computer Science', '09012345678', 'active'),
('student2@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Fatimah Abdullahi', '20/0002', 'student', 'Computer Science', '09023456789', 'active'),
('student3@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Chinedu Okafor', '20/0003', 'student', 'Engineering', '09034567890', 'active'),
('student4@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Amina Ibrahim', '20/0004', 'student', 'Mathematics', '09045678901', 'active'),
('student5@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Oluwadamilola Adesanya', '20/0005', 'student', 'Physics', '09056789012', 'active'),
('student6@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Blessing Okoro', '20/0006', 'student', 'Chemistry', '09067890123', 'active'),
('student7@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Yusuf Mohammed', '20/0007', 'student', 'Business Administration', '09078901234', 'active'),
('student8@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Grace Adekunle', '20/0008', 'student', 'Computer Science', '09089012345', 'active'),
('student9@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tunde Bakare', '20/0009', 'student', 'Engineering', '09090123456', 'active'),
('student10@lasustech.edu.ng', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ngozi Eze', '20/0010', 'student', 'Biology', '09001234567', 'active');

-- ============================================
-- BOOKS
-- ============================================
INSERT INTO books (title, author, isbn, publisher, edition, publish_year, category_id, department, description, call_number, total_copies, available_copies, pages, language) VALUES
-- Computer Science
('Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', '978-0-262-04630-5', 'MIT Press', '4th Edition', 2022, 1, 'Computer Science', 'A comprehensive introduction to the modern study of algorithms, covering a broad range of topics in depth.', 'QA76.6 .C662 2022', 5, 3, 1312, 'English'),
('Data Structures and Algorithm Analysis in C++', 'Mark Allen Weiss', '978-0-13-284737-7', 'Pearson', '4th Edition', 2014, 1, 'Computer Science', 'A comprehensive treatment of data structures and algorithms in C++.', 'QA76.73.C153 W45', 3, 2, 656, 'English'),
('Database Management Systems', 'Raghu Ramakrishnan, Johannes Gehrke', '978-0-07-246563-1', 'McGraw-Hill', '3rd Edition', 2003, 1, 'Computer Science', 'A comprehensive textbook on database systems covering relational databases, SQL, and transaction management.', 'QA76.9.D3 R36', 4, 1, 1104, 'English'),
('Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', '978-0-13-461099-3', 'Pearson', '4th Edition', 2020, 1, 'Computer Science', 'The most comprehensive, up-to-date introduction to the theory and practice of artificial intelligence.', 'Q335 .R86 2020', 3, 3, 1136, 'English'),
('Computer Networking: A Top-Down Approach', 'James Kurose, Keith Ross', '978-0-13-681941-7', 'Pearson', '8th Edition', 2021, 1, 'Computer Science', 'A top-down approach to networking with applications, transport, network, and link layers.', 'TK5105.5 .K87', 4, 4, 800, 'English'),
('Operating System Concepts', 'Abraham Silberschatz, Greg Gagne, Peter B. Galvin', '978-1-119-80052-0', 'Wiley', '10th Edition', 2021, 1, 'Computer Science', 'The definitive guide to operating systems concepts and design.', 'QA76.76.O63 S58', 3, 2, 912, 'English'),
('Software Engineering', 'Ian Sommerville', '978-0-13-394303-0', 'Pearson', '10th Edition', 2015, 1, 'Computer Science', 'A comprehensive introduction to all aspects of software engineering.', 'QA76.758 .S66', 3, 3, 816, 'English'),
('Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', '978-0-13-235088-4', 'Prentice Hall', '1st Edition', 2008, 1, 'Computer Science', 'A handbook of agile software craftsmanship presenting best practices for writing clean code.', 'QA76.76.D47 M37', 2, 1, 464, 'English'),

-- Engineering
('Engineering Mechanics: Statics', 'Russell C. Hibbeler', '978-0-13-491529-0', 'Pearson', '14th Edition', 2016, 2, 'Engineering', 'A comprehensive guide to statics in engineering mechanics.', 'TA350 .H53', 4, 4, 704, 'English'),
('Fundamentals of Electric Circuits', 'Charles K. Alexander, Matthew N.O. Sadiku', '978-0-07-802822-9', 'McGraw-Hill', '7th Edition', 2021, 2, 'Engineering', 'A complete introduction to electric circuit analysis.', 'TK454 .A44', 5, 3, 960, 'English'),
('Thermodynamics: An Engineering Approach', 'Yunus A. Çengel, Michael A. Boles', '978-0-07-339817-4', 'McGraw-Hill', '9th Edition', 2019, 2, 'Engineering', 'A comprehensive coverage of the basic principles of thermodynamics.', 'TJ265 .C43', 3, 2, 1024, 'English'),
('Strength of Materials', 'R.K. Rajput', '978-81-219-2594-0', 'S. Chand Publishing', '6th Edition', 2018, 2, 'Engineering', 'Comprehensive coverage of strength of materials topics for engineering students.', 'TA405 .R35', 4, 3, 780, 'English'),

-- Mathematics
('Calculus: Early Transcendentals', 'James Stewart, Daniel Clegg, Saleem Watson', '978-1-337-61392-7', 'Cengage', '9th Edition', 2020, 3, 'Mathematics', 'The most widely used calculus textbook in the world.', 'QA303.2 .S74', 6, 4, 1368, 'English'),
('Linear Algebra and Its Applications', 'David C. Lay, Steven R. Lay, Judi J. McDonald', '978-0-321-98238-4', 'Pearson', '6th Edition', 2021, 3, 'Mathematics', 'A modern introduction to linear algebra and its applications.', 'QA184.2 .L39', 4, 3, 576, 'English'),
('Probability and Statistics for Engineers', 'Jay L. Devore', '978-1-305-25180-5', 'Cengage', '9th Edition', 2016, 3, 'Mathematics', 'A comprehensive introduction to probability and statistics for engineering.', 'QA273 .D46', 3, 2, 768, 'English'),

-- Physics
('University Physics with Modern Physics', 'Hugh D. Young, Roger A. Freedman', '978-0-13-532151-1', 'Pearson', '15th Edition', 2019, 4, 'Physics', 'The benchmark for clarity and rigor, influenced by the latest in physics education research.', 'QC21.3 .Y68', 5, 3, 1600, 'English'),
('Concepts of Modern Physics', 'Arthur Beiser', '978-0-07-238689-6', 'McGraw-Hill', '6th Edition', 2003, 4, 'Physics', 'An introduction to the key concepts of modern physics.', 'QC21.2 .B45', 3, 2, 576, 'English'),

-- Chemistry
('Organic Chemistry', 'Paula Yurkanis Bruice', '978-0-13-404228-2', 'Pearson', '8th Edition', 2017, 5, 'Chemistry', 'A comprehensive introduction to organic chemistry with a focus on biological and medical applications.', 'QD251.3 .B78', 4, 3, 1344, 'English'),
('General Chemistry: Principles and Modern Applications', 'Ralph H. Petrucci', '978-0-13-293128-1', 'Pearson', '11th Edition', 2016, 5, 'Chemistry', 'The most trusted general chemistry text in higher education.', 'QD31.3 .P48', 3, 2, 1392, 'English'),

-- Biology
('Molecular Biology of the Cell', 'Bruce Alberts et al.', '978-0-393-68463-0', 'W.W. Norton', '7th Edition', 2022, 6, 'Biology', 'The classic in-depth textbook of cell biology.', 'QH581.2 .M64', 3, 2, 1552, 'English'),
('Campbell Biology', 'Lisa A. Urry et al.', '978-0-13-518828-2', 'Pearson', '12th Edition', 2020, 6, 'Biology', 'The world\'s most successful majors biology textbook.', 'QH308.2 .C35', 4, 3, 1488, 'English'),

-- Business
('Principles of Management', 'Stephen P. Robbins, Mary Coulter', '978-0-13-452760-4', 'Pearson', '14th Edition', 2018, 7, 'Business Administration', 'The essential introduction to management and organizations.', 'HD31 .R63', 4, 3, 720, 'English'),
('Financial Accounting', 'Jerry J. Weygandt, Paul D. Kimmel, Donald E. Kieso', '978-1-119-59405-5', 'Wiley', '11th Edition', 2019, 7, 'Business Administration', 'A comprehensive introduction to financial accounting principles.', 'HF5636 .W49', 3, 2, 864, 'English'),

-- Humanities
('A History of Modern Nigeria', 'Toyin Falola, Matthew M. Heaton', '978-1-107-69987-5', 'Cambridge University Press', '2nd Edition', 2018, 8, 'Humanities', 'A comprehensive survey of Nigerian history from pre-colonial times to the present.', 'DT515.73 .F35', 3, 3, 392, 'English'),
('Things Fall Apart', 'Chinua Achebe', '978-0-385-47454-2', 'Anchor Books', 'Reprint', 1994, 8, 'Humanities', 'The classic novel about pre-colonial Nigerian society and the effects of European colonization.', 'PR9387.9.A3 T5', 5, 4, 209, 'English');

-- ============================================
-- SAMPLE TRANSACTIONS
-- ============================================
INSERT INTO transactions (user_id, book_id, checkout_date, due_date, return_date, status, librarian_id) VALUES
-- Active borrows
(6, 1, DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), NULL, 'checked_out', 3),
(6, 2, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), NULL, 'checked_out', 3),
(6, 3, DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, 'overdue', 3),
(7, 1, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), NULL, 'checked_out', 4),
(7, 16, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 9 DAY), NULL, 'checked_out', 4),
(8, 10, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY), NULL, 'checked_out', 3),
(9, 13, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY), NULL, 'checked_out', 5),
(10, 16, DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, 'overdue', 4),

-- Completed returns
(6, 8, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY), 'returned', 3),
(7, 13, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 'returned', 4),
(8, 22, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), 'returned', 3),
(11, 1, DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'returned', 5),
(12, 5, DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'returned', 3),
(13, 18, DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), 'returned', 4);

-- ============================================
-- SAMPLE FINES (for overdue transactions)
-- ============================================
INSERT INTO fines (transaction_id, user_id, amount, daily_rate, days_overdue, status) VALUES
(3, 6, 200.00, 100.00, 2, 'pending'),
(8, 10, 100.00, 100.00, 1, 'pending'),
(14, 13, 200.00, 100.00, 2, 'paid');

-- ============================================
-- SAMPLE ACTIVITY LOG
-- ============================================
INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES
(3, 'checkout', 'transaction', 1, '{"book": "Introduction to Algorithms", "student": "Adebayo Ogundimu"}'),
(3, 'checkout', 'transaction', 2, '{"book": "Data Structures and Algorithm Analysis in C++", "student": "Adebayo Ogundimu"}'),
(3, 'checkout', 'transaction', 3, '{"book": "Database Management Systems", "student": "Adebayo Ogundimu"}'),
(4, 'checkout', 'transaction', 4, '{"book": "Introduction to Algorithms", "student": "Fatimah Abdullahi"}'),
(1, 'create_user', 'user', 6, '{"role": "student", "name": "Adebayo Ogundimu"}'),
(1, 'add_book', 'book', 1, '{"title": "Introduction to Algorithms", "copies": 5}');
