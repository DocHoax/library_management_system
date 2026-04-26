import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportsApi, transactionsApi } from '../../services/api';
import { BookCheck, Clock, AlertTriangle, Plus, Search, RotateCcw } from 'lucide-react';
import '../Dashboard.css';

export default function LibrarianDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingTx, setPendingTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportsApi.dashboard(),
      transactionsApi.list({ status: 'checked_out', per_page: 10 }),
    ]).then(([dashData, txData]) => {
      setStats(dashData.stats);
      setPendingTx(txData.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-page"><div className="skeleton" style={{height: 200, borderRadius: 12}} /></div>;

  const firstName = user?.full_name?.split(' ')[0] || 'Librarian';

  return (
    <div className="dashboard-page animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-banner__text">
          <h2>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {firstName}</h2>
          <p>{new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn--secondary btn--sm"><Plus size={16} /> Check Out Book</button>
          <button className="btn btn--secondary btn--sm"><RotateCcw size={16} /> Return Book</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card card--stat stat-card stat-card--primary">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--primary"><BookCheck size={22} /></div>
          </div>
          <div className="stat-card__value">{stats?.active_borrowers || 0}</div>
          <div className="stat-card__label">Active Checkouts</div>
        </div>
        <div className="card card--stat stat-card stat-card--secondary">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--secondary"><Clock size={22} /></div>
          </div>
          <div className="stat-card__value">{stats?.due_today || 0}</div>
          <div className="stat-card__label">Due Today</div>
        </div>
        <div className="card card--stat stat-card stat-card--error">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--error"><AlertTriangle size={22} /></div>
          </div>
          <div className="stat-card__value">{stats?.overdue_books || 0}</div>
          <div className="stat-card__label">Overdue Books</div>
        </div>
      </div>

      {/* Active Checkouts */}
      <div className="card dashboard-card">
        <div className="dashboard-card__header">
          <h3>Active Checkouts</h3>
        </div>
        <div className="checkout-queue">
          {pendingTx.map((tx, i) => (
            <div key={i} className={`queue-item status-bar status-bar--${tx.days_overdue > 0 ? 'overdue' : 'borrowed'}`}>
              <div className="queue-item__info">
                <span className="queue-item__student">{tx.student_name} ({tx.matric_number})</span>
                <span className="queue-item__book">{tx.book_title} — Due: {new Date(tx.due_date).toLocaleDateString('en-NG')}</span>
              </div>
              <div className="queue-item__actions">
                <span className={`badge badge--${tx.days_overdue > 0 ? 'overdue' : 'borrowed'}`}>
                  {tx.days_overdue > 0 ? `${tx.days_overdue}d overdue` : 'Active'}
                </span>
              </div>
            </div>
          ))}
          {pendingTx.length === 0 && <p style={{ color: 'var(--outline)', textAlign: 'center', padding: 'var(--space-6)' }}>No active checkouts</p>}
        </div>
      </div>
    </div>
  );
}
