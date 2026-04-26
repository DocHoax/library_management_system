import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { booksApi } from '../../services/api';
import { ArrowLeft, BookOpen, Calendar, Globe, Hash, Layers, BookCopy } from 'lucide-react';

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    booksApi.get(id).then(data => setBook(data.book)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 'var(--space-8)' }}><div className="skeleton" style={{ height: 400, borderRadius: 12 }} /></div>;
  if (!book) return <div className="empty-state"><h3>Book not found</h3></div>;

  const basePath = `/${user?.role}`;

  const details = [
    { label: 'Publisher', value: book.publisher, icon: BookCopy },
    { label: 'Edition', value: book.edition, icon: Layers },
    { label: 'Year', value: book.publish_year, icon: Calendar },
    { label: 'ISBN', value: book.isbn, icon: Hash },
    { label: 'Pages', value: book.pages, icon: BookOpen },
    { label: 'Language', value: book.language, icon: Globe },
    { label: 'Call Number', value: book.call_number, icon: Hash },
    { label: 'Department', value: book.department, icon: Layers },
  ].filter(d => d.value);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900 }}>
      <button onClick={() => navigate(`${basePath}/catalog`)} className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} /> Back to Catalog
      </button>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header gradient */}
        <div style={{ background: 'var(--primary-gradient)', padding: 'var(--space-10) var(--space-8)', color: 'var(--on-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <span className={`badge ${book.available_copies > 0 ? 'badge--available' : 'badge--borrowed'}`} style={{ fontSize: 'var(--text-label-lg)' }}>
              {book.available_copies > 0 ? `${book.available_copies} of ${book.total_copies} available` : 'All copies borrowed'}
            </span>
            {book.category_name && <span className="badge badge--returned">{book.category_name}</span>}
          </div>
          <h1 style={{ fontSize: 'var(--text-headline-lg)', color: 'var(--on-primary)', marginBottom: 'var(--space-2)' }}>{book.title}</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-title-sm)' }}>{book.author}</p>
        </div>

        {/* Content */}
        <div style={{ padding: 'var(--space-8)' }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
            {book.available_copies > 0 && user?.role === 'student' && (
              <button className="btn btn--primary">Borrow This Book</button>
            )}
            <button className="btn btn--ghost">Reserve</button>
          </div>

          {/* Description */}
          {book.description && (
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Description</h3>
              <p style={{ lineHeight: 1.8 }}>{book.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Book Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            {details.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
                <d.icon size={18} style={{ color: 'var(--outline)', flexShrink: 0 }} />
                <div>
                  <span style={{ display: 'block', fontSize: 'var(--text-label-sm)', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.label}</span>
                  <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
