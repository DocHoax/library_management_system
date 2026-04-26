import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { booksApi, categoriesApi } from '../../services/api';
import { Search, Filter, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const basePath = `/${user?.role}`;

  return (
    <div className="catalog-page animate-fade-in">
      {/* Hero Search */}
      <div className="catalog-hero">
        <h1>Book Catalog</h1>
        <p>Discover and explore our collection of {pagination.total.toLocaleString()} books</p>
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
                      <BookOpen size={32} />
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
