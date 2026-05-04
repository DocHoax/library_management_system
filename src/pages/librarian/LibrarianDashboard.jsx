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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [checkoutForm, setCheckoutForm] = useState({ user_id: '', book_id: '', loan_days: '14' });
  const [returnForm, setReturnForm] = useState({ transaction_id: '' });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashData, txData] = await Promise.all([
        reportsApi.dashboard(),
        transactionsApi.list({ status: 'checked_out', per_page: 10 }),
      ]);
      setStats(dashData.stats);
      setPendingTx(txData.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <div className="dashboard-page"><div className="skeleton" style={{height: 200, borderRadius: 12}} /></div>;

  const firstName = user?.full_name?.split(' ')[0] || 'Librarian';

  const handleCheckout = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);

    try {
      await transactionsApi.checkout({
        user_id: Number(checkoutForm.user_id),
        book_id: Number(checkoutForm.book_id),
        loan_days: checkoutForm.loan_days ? Number(checkoutForm.loan_days) : undefined,
      });

      setShowCheckoutModal(false);
      setCheckoutForm({ user_id: '', book_id: '', loan_days: '14' });
      await loadDashboard();
      window.alert('Book checked out successfully.');
    } catch (error) {
      setActionError(error.message || 'Unable to check out the book.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (transactionId) => {
    setActionError('');
    setActionLoading(true);

    try {
      await transactionsApi.return({ transaction_id: Number(transactionId) });
      await loadDashboard();
      window.alert('Book returned successfully.');
      return true;
    } catch (error) {
      setActionError(error.message || 'Unable to return the book.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    const success = await handleReturn(returnForm.transaction_id);
    if (success) {
      setShowReturnModal(false);
      setReturnForm({ transaction_id: '' });
    }
  };

  return (
    <div className="dashboard-page animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-banner__text">
          <h2>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {firstName}</h2>
          <p>{new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn--secondary btn--sm" onClick={() => setShowCheckoutModal(true)}><Plus size={16} /> Check Out Book</button>
          <button className="btn btn--secondary btn--sm" onClick={() => setShowReturnModal(true)}><RotateCcw size={16} /> Return Book</button>
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
                <button className="btn btn--ghost btn--sm" onClick={() => handleReturn(tx.id)} disabled={actionLoading}>
                  Return
                </button>
              </div>
            </div>
          ))}
          {pendingTx.length === 0 && <p style={{ color: 'var(--outline)', textAlign: 'center', padding: 'var(--space-6)' }}>No active checkouts</p>}
        </div>
      </div>

      {actionError && (
        <div className="card" style={{ marginTop: 'var(--space-6)', borderColor: 'var(--error)', color: 'var(--error)' }}>
          {actionError}
        </div>
      )}

      {showCheckoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowCheckoutModal(false)}>
          <div className="card animate-fade-in-up" style={{ maxWidth: 460, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
              <h3>Check Out Book</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setShowCheckoutModal(false)}>×</button>
            </div>
            <form onSubmit={handleCheckout} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="input-group"><label>User ID *</label><input className="input-field" type="number" required value={checkoutForm.user_id} onChange={e => setCheckoutForm({ ...checkoutForm, user_id: e.target.value })} /></div>
              <div className="input-group"><label>Book ID *</label><input className="input-field" type="number" required value={checkoutForm.book_id} onChange={e => setCheckoutForm({ ...checkoutForm, book_id: e.target.value })} /></div>
              <div className="input-group"><label>Loan Days</label><input className="input-field" type="number" min="1" value={checkoutForm.loan_days} onChange={e => setCheckoutForm({ ...checkoutForm, loan_days: e.target.value })} /></div>
              <button type="submit" className="btn btn--primary" disabled={actionLoading}>{actionLoading ? 'Processing...' : 'Check Out'}</button>
            </form>
          </div>
        </div>
      )}

      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowReturnModal(false)}>
          <div className="card animate-fade-in-up" style={{ maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
              <h3>Return Book</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setShowReturnModal(false)}>×</button>
            </div>
            <form onSubmit={handleReturnSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="input-group"><label>Transaction ID *</label><input className="input-field" type="number" required value={returnForm.transaction_id} onChange={e => setReturnForm({ transaction_id: e.target.value })} /></div>
              <button type="submit" className="btn btn--primary" disabled={actionLoading}>{actionLoading ? 'Processing...' : 'Return Book'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
