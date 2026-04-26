import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import LibrarianDashboard from './pages/librarian/LibrarianDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import BookCatalog from './pages/shared/BookCatalog';
import BookDetail from './pages/shared/BookDetail';
import UserManagement from './pages/admin/UserManagement';
import TransactionHistory from './pages/shared/TransactionHistory';
import Reports from './pages/admin/Reports';
import './index.css';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--surface)' }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="catalog" element={<BookCatalog />} />
            <Route path="catalog/:id" element={<BookDetail />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="transactions" element={<TransactionHistory />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Librarian Routes */}
          <Route path="/librarian" element={
            <ProtectedRoute allowedRoles={['librarian']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<LibrarianDashboard />} />
            <Route path="catalog" element={<BookCatalog />} />
            <Route path="catalog/:id" element={<BookDetail />} />
            <Route path="transactions" element={<TransactionHistory />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<StudentDashboard />} />
            <Route path="catalog" element={<BookCatalog />} />
            <Route path="catalog/:id" element={<BookDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
