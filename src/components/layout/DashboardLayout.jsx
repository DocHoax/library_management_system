import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, ArrowLeftRight,
  BarChart3, Settings, LogOut, Search, Bell, Library, ChevronRight
} from 'lucide-react';
import './DashboardLayout.css';

const NAV_ITEMS = {
  admin: [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/catalog', icon: BookOpen, label: 'Book Catalog' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
  ],
  librarian: [
    { path: '/librarian', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/librarian/catalog', icon: BookOpen, label: 'Book Catalog' },
    { path: '/librarian/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  ],
  student: [
    { path: '/student', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/student/catalog', icon: BookOpen, label: 'Book Catalog' },
  ],
};

const ROLE_LABELS = {
  admin: 'Administrator',
  librarian: 'Librarian',
  student: 'Student',
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = NAV_ITEMS[user?.role] || [];

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar" id="sidebar-nav">
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <Library size={28} />
            <div>
              <span className="sidebar__title">LASUSTECH</span>
              <span className="sidebar__subtitle">Library System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {({ isActive }) => isActive && <ChevronRight size={16} className="sidebar__link-arrow" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {getInitials(user?.full_name)}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.full_name}</span>
              <span className="sidebar__user-role">{ROLE_LABELS[user?.role]}</span>
            </div>
          </div>
          <button className="sidebar__logout" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="dashboard-main">
        {/* Top bar */}
        <header className="topbar glass-panel" id="topbar">
          <div className="topbar__left">
            <h2 className="topbar__page-title">
              {navItems.find(item => 
                item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path) && !item.exact
              )?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="topbar__right">
            <div className="topbar__search search-bar">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Quick search..." />
            </div>
            <button className="topbar__icon-btn" title="Notifications">
              <Bell size={20} />
              <span className="topbar__notification-dot"></span>
            </button>
            <div className="topbar__profile">
              <div className="topbar__profile-avatar">
                {getInitials(user?.full_name)}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
