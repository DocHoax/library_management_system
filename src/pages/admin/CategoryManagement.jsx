import { useEffect, useState } from 'react';
import { categoriesApi } from '../../services/api';
import { Plus, Edit, X, Tags } from 'lucide-react';
import '../Dashboard.css';

const DEFAULT_FORM = { name: '', description: '', icon: 'book-open' };

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.list();
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setFormData(DEFAULT_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || 'book-open',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(DEFAULT_FORM);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, formData);
      } else {
        await categoriesApi.create(formData);
      }

      await fetchCategories();
      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2>Category Management</h2>
          <p>Manage the category list that appears in the catalog filters and book forms.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-container-low)' }}>
              {['Name', 'Description', 'Icon', 'Books', 'Actions'].map(header => (
                <th
                  key={header}
                  style={{ padding: 'var(--space-4) var(--space-5)', textAlign: 'left', fontSize: 'var(--text-label-md)', color: 'var(--primary-container)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category.id} style={{ background: index % 2 === 0 ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)', transition: 'background var(--transition-fast)' }}>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tags size={16} />
                    </div>
                    <strong>{category.name}</strong>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', color: 'var(--on-surface-variant)' }}>{category.description || '-'}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>{category.icon || '-'}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <span className="badge badge--available">{category.book_count || 0}</span>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(category)}>
                    <Edit size={14} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="empty-state"><p>Loading categories...</p></div>}
        {!loading && categories.length === 0 && <div className="empty-state"><p>No categories found</p></div>}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 'var(--space-4)' }} onClick={closeModal}>
          <div className="card animate-fade-in-up" style={{ maxWidth: 540, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div>
                <h3 style={{ marginBottom: 'var(--space-2)' }}>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                <p style={{ margin: 0, color: 'var(--on-surface-variant)' }}>Keep the catalog taxonomy aligned with your academic departments.</p>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="login-error" style={{ marginBottom: 'var(--space-4)' }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label>Name *</label>
                <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea className="input-field" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Icon</label>
                <input className="input-field" value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}