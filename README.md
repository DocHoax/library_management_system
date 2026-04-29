# LASUSTECH Library Management System

A full-stack library management system for students, librarians, and administrators. The frontend is built with React and Vite, while the backend is a PHP API backed by MySQL.

## Overview

The application supports:

- Role-based login for `admin`, `librarian`, and `student` users.
- Book catalog browsing, search, and detail views.
- Checkout and return workflows for library transactions.
- Fine tracking and payment/waiver actions.
- User management, category management, and reporting for staff roles.

## Tech Stack

- Frontend: React 19, React Router, Vite
- UI helpers: Lucide React, Recharts
- Backend: PHP 8+ with a JSON API
- Database: MySQL 8+

## Project Structure

- `src/` - React application, pages, layout, context, and API client
- `backend/` - PHP API entry point, routing, middleware, and utilities
- `database/` - schema and seed data
- `public/` - static assets served by Vite

## Prerequisites

- Node.js 18 or newer
- PHP 8.0 or newer
- MySQL 8 or compatible MariaDB version

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

Import the schema and seed data into MySQL. The default database name is `lasustech_library`.

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

If you use XAMPP or another local stack, make sure the MySQL credentials in `backend/config/database.php` match your environment.

### 3. Start the backend API

Run the PHP built-in server from the project root:

```bash
php -S 127.0.0.1:8000 -t backend backend/router.php
```

The API is available at `http://localhost:8000/api`.

### 4. Start the frontend

In a second terminal, start the Vite dev server:

```bash
npm run dev
```

The app runs at `http://localhost:5173` and proxies API requests to the backend.

## Default Accounts

The seed data includes demo users. All seeded accounts use the password `password123`.

| Role | Email |
| --- | --- |
| Admin | `admin@lasustech.edu.ng` |
| Admin | `director@lasustech.edu.ng` |
| Librarian | `librarian1@lasustech.edu.ng` |
| Librarian | `librarian2@lasustech.edu.ng` |
| Librarian | `librarian3@lasustech.edu.ng` |
| Student | `student1@lasustech.edu.ng` |
| Student | `student2@lasustech.edu.ng` |
| Student | `student3@lasustech.edu.ng` |

## Available Features

### Admin

- Dashboard analytics and reporting
- User management
- Full catalog access
- Transaction history

### Librarian

- Dashboard overview
- Book catalog management
- Checkout and return tracking
- Transaction history

### Student

- Personal dashboard
- Browse the catalog
- View book details

## API Modules

The backend routes are organized by feature:

- `auth` - login, registration, and current user lookup
- `books` - catalog and book details
- `categories` - category management
- `transactions` - checkout, return, and history
- `fines` - fine listing and payment actions
- `reports` - dashboard and activity analytics
- `users` - staff and student management

## Configuration Notes

- Frontend API calls are configured in `src/services/api.js`.
- Vite proxies `/api` requests to `http://localhost:8000` in `vite.config.js`.
- Database credentials, JWT settings, and business rules live in `backend/config/database.php`.
- The backend currently allows requests from `http://localhost:5173`.

## NPM Scripts

- `npm run dev` - start the Vite development server
- `npm run build` - build the frontend for production
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build locally

## Development Notes

- Seeded fines are calculated at a default rate of 100 per day.
- Students can borrow up to 5 books at a time by default.
- Loan duration is set to 14 days in the backend configuration.

## Troubleshooting

- If the frontend cannot reach the API, confirm that the PHP server is running on port 8000.
- If login fails for seeded users, verify that the database was imported correctly and that the seed data is present.
- If the backend returns a database error, check the MySQL credentials in `backend/config/database.php`.

## License

No license has been specified for this project.
