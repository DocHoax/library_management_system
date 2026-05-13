import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { booksApi, categoriesApi } from '../../services/api';
import { Search, Filter, BookOpen, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import './BookCatalog.css';

export default function BookCatalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    edition: '',
    publish_year: '',
    category_id: '',
    department: '',
    description: '',
    cover_image: '',
    call_number: '',
    total_copies: '1',
    pages: '',
    language: 'English',
  });

  const fetchBooks = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 12 };
      if (selectedCategory) params.category_id = selectedCategory;
      if (availableOnly) params.available = '1';

      let data;
      if (searchQuery.trim()) {
        params.q = searchQuery;
        data = await booksApi.search(params);
      } else {
        data = await booksApi.list(params);
      }
      setBooks(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, total_pages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    categoriesApi.list().then(data => setCategories(data.categories || [])).catch(console.error);
  }, []);

  useEffect(() => {
    fetchBooks(1);
  }, [selectedCategory, availableOnly]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(1);
  };

  const handleOpenAddBook = () => {
    setCreateError('');
    setShowAddModal(true);
  };

  const handleCloseAddBook = () => {
    setShowAddModal(false);
    setCreateError('');
    setCreateForm({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      edition: '',
      publish_year: '',
      category_id: '',
      department: '',
      description: '',
      cover_image: '',
      call_number: '',
      total_copies: '1',
      pages: '',
      language: 'English',
    });
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    try {
      await booksApi.create({
        ...createForm,
        category_id: createForm.category_id ? Number(createForm.category_id) : null,
        publish_year: createForm.publish_year ? Number(createForm.publish_year) : null,
        total_copies: createForm.total_copies ? Number(createForm.total_copies) : 1,
        pages: createForm.pages ? Number(createForm.pages) : null,
      });

      handleCloseAddBook();
      fetchBooks(1);
    } catch (err) {
      setCreateError(err.message || 'Unable to add book');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCoverUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCreateForm(prev => ({
        ...prev,
        cover_image: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const basePath = `/${user?.role}`;
  const canAddBooks = user?.role === 'admin';

  return (
    <div className="catalog-page animate-fade-in">
      {/* Hero Search */}
      <div className="catalog-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1>Book Catalog</h1>
            <p>Discover and explore our collection of {pagination.total.toLocaleString()} books</p>
          </div>
          {canAddBooks && (
            <button type="button" className="btn btn--primary" onClick={handleOpenAddBook}>
              <Plus size={18} /> Add Book
            </button>
          )}
        </div>
        <form className="catalog-search" onSubmit={handleSearch}>
          <div className="search-bar catalog-search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, author, ISBN, or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn--primary btn--sm">Search</button>
          </div>
        </form>
      </div>

      {showAddModal && canAddBooks && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 'var(--space-4)' }} onClick={handleCloseAddBook}>
          <div className="card animate-fade-in-up" style={{ maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div>
                <h3 style={{ marginBottom: 'var(--space-2)' }}>Add New Book</h3>
                <p style={{ margin: 0, color: 'var(--on-surface-variant)' }}>Create a new catalog entry and set the initial copy count.</p>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleCloseAddBook}>
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="login-error" style={{ marginBottom: 'var(--space-4)' }}>
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBook} style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="input-group">
                <label>Title *</label>
                <input className="input-field" required value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Author *</label>
                <input className="input-field" required value={createForm.author} onChange={e => setCreateForm({ ...createForm, author: e.target.value })} />
              </div>
              <div className="input-group">
                <label>ISBN</label>
                <input className="input-field" value={createForm.isbn} onChange={e => setCreateForm({ ...createForm, isbn: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Publisher</label>
                <input className="input-field" value={createForm.publisher} onChange={e => setCreateForm({ ...createForm, publisher: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Edition</label>
                <input className="input-field" value={createForm.edition} onChange={e => setCreateForm({ ...createForm, edition: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Publish Year</label>
                <input className="input-field" type="number" value={createForm.publish_year} onChange={e => setCreateForm({ ...createForm, publish_year: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Category</label>
                <select className="input-field" value={createForm.category_id} onChange={e => setCreateForm({ ...createForm, category_id: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Department</label>
                <input className="input-field" value={createForm.department} onChange={e => setCreateForm({ ...createForm, department: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Cover Image</label>
                <input className="input-field" type="file" accept="image/*" onChange={handleCoverUpload} />
                <input
                  className="input-field"
                  style={{ marginTop: 'var(--space-2)' }}
                  type="url"
                  placeholder="Or paste an image URL"
                  value={createForm.cover_image}
                  onChange={e => setCreateForm({ ...createForm, cover_image: e.target.value })}
                />
                <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--on-surface-variant)', fontSize: 'var(--text-label-sm)' }}>
                  Upload an image file or paste a public image URL.
                </p>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="input-field" rows="3" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Call Number</label>
                <input className="input-field" value={createForm.call_number} onChange={e => setCreateForm({ ...createForm, call_number: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Total Copies</label>
                <input className="input-field" type="number" min="1" value={createForm.total_copies} onChange={e => setCreateForm({ ...createForm, total_copies: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Pages</label>
                <input className="input-field" type="number" min="1" value={createForm.pages} onChange={e => setCreateForm({ ...createForm, pages: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Language</label>
                <input className="input-field" value={createForm.language} onChange={e => setCreateForm({ ...createForm, language: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', gridColumn: '1 / -1', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn--ghost" onClick={handleCloseAddBook}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={createLoading}>
                  {createLoading ? 'Saving...' : 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="catalog-layout">
        {/* Filter Sidebar */}
        <aside className="catalog-filters">
          <div className="catalog-filters__header">
            <Filter size={18} />
            <h4>Filters</h4>
          </div>

          <div className="catalog-filter-group">
            <h5>Category</h5>
            <div className="catalog-filter-options">
              <button
                className={`catalog-filter-chip ${!selectedCategory ? 'catalog-filter-chip--active' : ''}`}
                onClick={() => setSelectedCategory('')}
              >All Categories</button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`catalog-filter-chip ${selectedCategory == cat.id ? 'catalog-filter-chip--active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                  <span className="catalog-filter-chip__count">{cat.book_count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-filter-group">
            <h5>Availability</h5>
            <label className="catalog-toggle">
              <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />
              <span>Available Only</span>
            </label>
          </div>
        </aside>

        {/* Book Grid */}
        <div className="catalog-content">
          {loading ? (
            <div className="catalog-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card book-card">
                  <div className="skeleton" style={{ height: 180, borderRadius: 8, marginBottom: 16 }} />
                  <div className="skeleton" style={{ width: '80%', height: 20, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '60%', height: 16 }} />
                </div>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={64} />
              <h3>No Books Found</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <>
              <div className="catalog-grid">
                {books.map(book => (
                  <div
                    key={book.id}
                    className={`card book-card status-bar status-bar--${book.available_copies > 0 ? 'gold' : 'overdue'}`}
                    onClick={() => navigate(`${basePath}/catalog/${book.id}`)}
                  >
                    <div className="book-card__cover">
                      {book.cover_image ? (
                        <img
                          src={book.cover_image}
                          alt={book.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                        />
                      ) : (
                        <BookOpen size={32} />
                      )}
                      <span className="book-card__category">{book.category_name || 'General'}</span>
                    </div>
                    <div className="book-card__info">
                      <h4 className="book-card__title">{book.title}</h4>
                      <p className="book-card__author">{book.author}</p>
                      <div className="book-card__meta">
                        <span className={`badge ${book.available_copies > 0 ? 'badge--available' : 'badge--borrowed'}`}>
                          {book.available_copies > 0 ? `${book.available_copies} Available` : 'Unavailable'}
                        </span>
                        {book.publish_year && <span className="book-card__year">{book.publish_year}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="catalog-pagination">
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchBooks(pagination.page - 1)}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="catalog-pagination__info">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => fetchBooks(pagination.page + 1)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
