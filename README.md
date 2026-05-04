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

The backend routes are organized by feature and exposed under `/api`:

- `auth` - login, registration, and current user lookup
- `books` - catalog and book details
- `categories` - category management
- `transactions` - checkout, return, and history
- `fines` - fine listing and payment actions
- `reports` - dashboard and activity analytics
- `users` - staff and student management

### Endpoint Reference

- `POST /api/auth/login` - authenticate a user
- `POST /api/auth/register` - create a student account
- `GET /api/auth/me` - fetch the current authenticated user
- `GET /api/books` - list books with pagination and filters
- `GET /api/books/search` - search books by query string
- `GET /api/books/{id}` - fetch a single book
- `POST /api/books` - create a book
- `PUT /api/books/{id}` - update a book
- `DELETE /api/books/{id}` - archive a book
- `GET /api/categories` - list categories
- `GET /api/categories/{id}` - fetch a category
- `POST /api/categories` - create a category
- `GET /api/transactions` - list all transactions for staff
- `GET /api/transactions/my` - list the logged-in user's transactions
- `GET /api/transactions/{id}` - fetch a single transaction
- `POST /api/transactions/checkout` - check out a book
- `POST /api/transactions/return` - return a book
- `GET /api/fines` - list fines for staff
- `GET /api/fines/my` - list the logged-in user's fines
- `POST /api/fines/pay` - mark a fine as paid
- `POST /api/fines/waive` - waive a fine
- `GET /api/reports/dashboard` - dashboard summary metrics
- `GET /api/reports/analytics` - admin analytics data
- `GET /api/reports/activity` - recent activity log
- `GET /api/users` - list users for admin
- `GET /api/users/{id}` - fetch a user profile
- `POST /api/users` - create a user
- `PUT /api/users/{id}` - update a user
- `DELETE /api/users/{id}` - deactivate a user

### Access Rules

- `admin` can manage users, books, categories, fines, analytics, and reports.
- `librarian` can manage books, checkout and return transactions, fines, and staff-facing reports.
- `student` can browse the catalog, view personal transactions, and view personal fines.

## Configuration Notes

- Frontend API calls are configured in `src/services/api.js`.
- Vite proxies `/api` requests to `http://localhost:8000` in `vite.config.js`.
- Database credentials, JWT settings, and business rules live in `backend/config/database.php`.
- The backend currently allows requests from `http://localhost:5173`.

## Authentication Flow

- Logging in returns a JWT token and a user object.
- The frontend stores the token in `localStorage` under `lms_token`.
- Protected requests send the token in the `Authorization: Bearer <token>` header.
- The `auth/me` endpoint is used to restore the current session on page load.
- User registration creates a new student account by default.

## Route Behavior

- Visiting `/` redirects to the current user role dashboard after authentication.
- Unauthenticated users are redirected to `/login`.
- Users who try to access a route outside their role are redirected back to their own dashboard.

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
