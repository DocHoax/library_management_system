import { useState, useEffect } from 'react';
import { transactionsApi } from '../../services/api';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import '../Dashboard.css';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const data = await transactionsApi.list({ page, per_page: 20, status: statusFilter });
      setTransactions(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, total_pages: 1 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(1); }, [statusFilter]);

  const statuses = ['', 'checked_out', 'returned', 'overdue'];

  return (
    <div className="dashboard-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div><h2>Transaction History</h2><p>{pagination.total} total transactions</p></div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {statuses.map(s => (
          <button key={s} className={`btn btn--sm ${statusFilter === s ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setStatusFilter(s)}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-container-low)' }}>
              {['ID', 'Student', 'Book', 'Checkout', 'Due Date', 'Return Date', 'Status'].map(h => (
                <th key={h} style={{ padding: 'var(--space-4) var(--space-5)', textAlign: 'left', fontSize: 'var(--text-label-md)', color: 'var(--primary-container)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={tx.id} style={{ background: i % 2 === 0 ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)' }}>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-label-md)', color: 'var(--outline)' }}>#{tx.id}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>{tx.student_name}</div>
                  <div style={{ fontSize: 'var(--text-label-sm)', color: 'var(--outline)' }}>{tx.matric_number}</div>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.book_title}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{new Date(tx.checkout_date).toLocaleDateString('en-NG')}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{new Date(tx.due_date).toLocaleDateString('en-NG')}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{tx.return_date ? new Date(tx.return_date).toLocaleDateString('en-NG') : '—'}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <span className={`badge badge--${tx.status === 'checked_out' ? 'borrowed' : tx.status}`}>{tx.status.replace('_', ' ')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && !loading && <div className="empty-state" style={{ padding: 'var(--space-8)' }}><p>No transactions found</p></div>}
      </div>

      {pagination.total_pages > 1 && (
        <div className="catalog-pagination" style={{ marginTop: 'var(--space-6)' }}>
          <button className="btn btn--ghost btn--sm" disabled={pagination.page <= 1} onClick={() => fetchTransactions(pagination.page - 1)}><ChevronLeft size={16} /> Prev</button>
          <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>Page {pagination.page} of {pagination.total_pages}</span>
          <button className="btn btn--ghost btn--sm" disabled={pagination.page >= pagination.total_pages} onClick={() => fetchTransactions(pagination.page + 1)}>Next <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
