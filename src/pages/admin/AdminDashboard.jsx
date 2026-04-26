import { useState, useEffect } from 'react';
import { reportsApi } from '../../services/api';
import { BookOpen, Users, AlertTriangle, DollarSign, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import '../Dashboard.css';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.dashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const stats = data?.stats || {};
  const recentTx = data?.recent_transactions || [];
  const popularBooks = data?.popular_books || [];

  const statCards = [
    { label: 'Total Books', value: stats.total_copies?.toLocaleString() || '0', icon: BookOpen, color: 'primary', trend: '+12%', up: true },
    { label: 'Active Borrowers', value: stats.active_borrowers?.toLocaleString() || '0', icon: Users, color: 'secondary', trend: '+8%', up: true },
    { label: 'Overdue Books', value: stats.overdue_books?.toLocaleString() || '0', icon: AlertTriangle, color: 'error', trend: '-3%', up: false },
    { label: 'Fine Revenue', value: `₦${(stats.paid_fines || 0).toLocaleString()}`, icon: DollarSign, color: 'success', trend: '+15%', up: true },
  ];

  return (
    <div className="dashboard-page animate-fade-in-up">
      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div key={i} className={`card card--stat stat-card stat-card--${stat.color}`} style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-card__top">
              <div className={`stat-card__icon stat-card__icon--${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <div className={`stat-card__trend ${stat.up ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
                {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.trend}
              </div>
            </div>
            <div className="stat-card__value">{stat.value}</div>
            <div className="stat-card__label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Transactions */}
        <div className="card dashboard-card dashboard-card--wide">
          <div className="dashboard-card__header">
            <h3>Recent Transactions</h3>
            <a href="#" className="dashboard-card__action">View All</a>
          </div>
          <div className="transaction-list">
            {recentTx.slice(0, 8).map((tx, i) => (
              <div key={i} className={`transaction-row status-bar status-bar--${tx.status === 'overdue' ? 'overdue' : tx.status === 'checked_out' ? 'borrowed' : 'available'}`}>
                <div className="transaction-row__info">
                  <span className="transaction-row__book">{tx.book_title}</span>
                  <span className="transaction-row__student">
                    {tx.student_name} {tx.matric_number && `(${tx.matric_number})`}
                  </span>
                </div>
                <div className="transaction-row__meta">
                  <span className="transaction-row__date">
                    <Calendar size={14} />
                    {new Date(tx.checkout_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`badge badge--${tx.status === 'checked_out' ? 'borrowed' : tx.status}`}>
                    {tx.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {recentTx.length === 0 && (
              <div className="empty-state">
                <p>No recent transactions</p>
              </div>
            )}
          </div>
        </div>

        {/* Popular Books */}
        <div className="card dashboard-card">
          <div className="dashboard-card__header">
            <h3>Popular Books</h3>
          </div>
          <div className="popular-books-list">
            {popularBooks.map((book, i) => (
              <div key={i} className="popular-book-item">
                <span className="popular-book-item__rank">{i + 1}</span>
                <div className="popular-book-item__info">
                  <span className="popular-book-item__title">{book.title}</span>
                  <span className="popular-book-item__author">{book.author}</span>
                </div>
                <span className="popular-book-item__count">
                  <TrendingUp size={14} />
                  {book.borrow_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="card quick-stat">
          <span className="quick-stat__label">Checkouts This Month</span>
          <span className="quick-stat__value">{stats.month_checkouts || 0}</span>
        </div>
        <div className="card quick-stat">
          <span className="quick-stat__label">Due Today</span>
          <span className="quick-stat__value quick-stat__value--warning">{stats.due_today || 0}</span>
        </div>
        <div className="card quick-stat">
          <span className="quick-stat__label">Pending Fines</span>
          <span className="quick-stat__value quick-stat__value--error">₦{(stats.pending_fines || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        {[1,2,3,4].map(i => (
          <div key={i} className="card card--stat">
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '12px', marginBottom: 16 }} />
            <div className="skeleton" style={{ width: '60%', height: 32, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '40%', height: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
