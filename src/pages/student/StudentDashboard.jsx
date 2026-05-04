import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transactionsApi, finesApi, reservationsApi } from '../../services/api';
import { BookOpen, AlertCircle, Calendar, Clock, Bookmark } from 'lucide-react';
import '../Dashboard.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [fines, setFines] = useState({ fines: [], summary: { total_pending: 0 } });
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    Promise.all([
      transactionsApi.my(),
      finesApi.my(),
      reservationsApi.my(),
    ]).then(([txData, fineData, reservationData]) => {
      setTransactions(txData.transactions || []);
      setFines(fineData);
      setReservations(reservationData.reservations || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-page"><div className="skeleton" style={{height:200, borderRadius:12}} /></div>;

  const activeBorrows = transactions.filter(t => t.status === 'checked_out' || t.status === 'overdue');
  const history = transactions.filter(t => t.status === 'returned');
  const activeReservations = reservations.filter(r => r.status === 'active');
  const recentReservations = reservations.slice(0, 5);
  const firstName = user?.full_name?.split(' ')[0] || 'Student';

  const getDueStatus = (daysRemaining) => {
    if (daysRemaining < 0) return { className: 'overdue', label: `${Math.abs(daysRemaining)}d overdue` };
    if (daysRemaining <= 2) return { className: 'soon', label: `${daysRemaining}d left` };
    return { className: 'ok', label: `${daysRemaining}d left` };
  };

  return (
    <div className="dashboard-page animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-banner__text">
          <h2>Welcome back, {firstName}!</h2>
          <p>{new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="card card--stat" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <div className="circular-progress" style={{ width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-container-high)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--secondary)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${(activeBorrows.length / 5) * 213.6} 213.6`}
                transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            </svg>
            <span className="circular-progress__text">{activeBorrows.length}/5</span>
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-headline-sm)' }}>Books Borrowed</div>
            <div className="stat-card__label">{5 - activeBorrows.length} slots available</div>
          </div>
        </div>
        <div className="card card--stat" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <div className={`stat-card__icon ${fines.summary.total_pending > 0 ? 'stat-card__icon--error' : 'stat-card__icon--success'}`} style={{ width: 56, height: 56 }}>
            {fines.summary.total_pending > 0 ? <AlertCircle size={28} /> : <BookOpen size={28} />}
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: 'var(--text-headline-sm)', color: fines.summary.total_pending > 0 ? 'var(--error)' : 'var(--success)' }}>
              ₦{fines.summary.total_pending.toLocaleString()}
            </div>
            <div className="stat-card__label">Outstanding Fines</div>
          </div>
        </div>
      </div>

      {/* Currently Borrowed */}
      <div className="card dashboard-card">
        <div className="dashboard-card__header">
          <h3>Currently Borrowed</h3>
        </div>
        <div className="borrowed-books">
          {activeBorrows.map((tx, i) => {
            const due = getDueStatus(tx.days_remaining);
            return (
              <div key={i} className={`borrowed-item status-bar status-bar--${due.className === 'overdue' ? 'overdue' : due.className === 'soon' ? 'warning' : 'available'}`}>
                <div className="borrowed-item__info">
                  <span className="borrowed-item__title">{tx.book_title}</span>
                  <span className="borrowed-item__author">{tx.book_author}</span>
                </div>
                <div className="borrowed-item__due">
                  <span style={{ fontSize: 'var(--text-label-md)', color: 'var(--outline)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} />
                    Due: {new Date(tx.due_date).toLocaleDateString('en-NG')}
                  </span>
                  <span className={`due-indicator due-indicator--${due.className}`}>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    {due.label}
                  </span>
                </div>
              </div>
            );
          })}
          {activeBorrows.length === 0 && (
            <div className="empty-state">
              <BookOpen size={48} />
              <h3>No Active Borrows</h3>
              <p>Visit the catalog to find and borrow books.</p>
            </div>
          )}
        </div>
      </div>

      {/* Borrowing History */}
      {history.length > 0 && (
        <div className="card dashboard-card">
          <div className="dashboard-card__header">
            <h3>Recent Returns</h3>
          </div>
          <div className="transaction-list">
            {history.slice(0, 5).map((tx, i) => (
              <div key={i} className="transaction-row">
                <div className="transaction-row__info">
                  <span className="transaction-row__book">{tx.book_title}</span>
                  <span className="transaction-row__student">Returned: {new Date(tx.return_date).toLocaleDateString('en-NG')}</span>
                </div>
                <span className="badge badge--returned">Returned</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservation History */}
      <div className="card dashboard-card">
        <div className="dashboard-card__header">
          <h3>Reservations</h3>
          <span className="badge badge--returned">{activeReservations.length} active</span>
        </div>
        <div className="transaction-list">
          {recentReservations.map((reservation, i) => (
            <div key={reservation.id || i} className="transaction-row">
              <div className="transaction-row__info">
                <span className="transaction-row__book" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bookmark size={14} />
                  {reservation.book_title}
                </span>
                <span className="transaction-row__student">
                  Reserved: {new Date(reservation.reserved_date).toLocaleDateString('en-NG')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className={`badge badge--${reservation.status === 'active' ? 'available' : 'returned'}`}>
                  {reservation.status}
                </span>
                <span style={{ fontSize: 'var(--text-label-sm)', color: 'var(--outline)' }}>
                  Expires {new Date(reservation.expiry_date).toLocaleDateString('en-NG')}
                </span>
              </div>
            </div>
          ))}
          {recentReservations.length === 0 && (
            <div className="empty-state">
              <Bookmark size={48} />
              <h3>No Reservations Yet</h3>
              <p>Reserve books from the catalog and they will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
