import { useState, useEffect } from 'react';
import { usersApi } from '../../services/api';
import { Search, Plus, UserPlus, Edit, Trash2, X } from 'lucide-react';
import '../Dashboard.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', role: 'student', matric_number: '', department: '', phone: '' });

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const data = await usersApi.list({ page, per_page: 15, role: roleFilter, search: searchQuery });
      setUsers(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, total_pages: 1 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(1); }, [roleFilter]);

  const handleSearch = (e) => { e.preventDefault(); fetchUsers(1); };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ full_name: '', email: '', password: '', role: 'student', matric_number: '', department: '', phone: '' });
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'student',
      matric_number: user.matric_number || '',
      department: user.department || '',
      phone: user.phone || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Deactivate ${user.full_name}?`)) return;

    try {
      await usersApi.delete(user.id);
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create(formData);
      }
      setShowModal(false);
      resetForm();
      fetchUsers(1);
    } catch (err) { alert(err.message); }
  };

  const roleColors = { admin: 'badge--overdue', librarian: 'badge--borrowed', student: 'badge--available' };

  return (
    <div className="dashboard-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2>User Management</h2>
          <p>{pagination.total} total users</p>
        </div>
        <button className="btn btn--primary" onClick={handleOpenCreate}>
          <UserPlus size={18} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 280 }}>
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </form>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['', 'admin', 'librarian', 'student'].map(role => (
            <button key={role} className={`btn btn--sm ${roleFilter === role ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setRoleFilter(role)}>
              {role || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-container-low)' }}>
              {['Name', 'Email', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: 'var(--space-4) var(--space-5)', textAlign: 'left', fontSize: 'var(--text-label-md)', color: 'var(--primary-container)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)', transition: 'background var(--transition-fast)' }}>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-body-md)' }}>{u.full_name}</div>
                  {u.matric_number && <div style={{ fontSize: 'var(--text-label-sm)', color: 'var(--outline)' }}>{u.matric_number}</div>}
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{u.email}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <span className={`badge ${roleColors[u.role] || ''}`}>{u.role}</span>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{u.department || '-'}</td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <span className={`badge ${u.status === 'active' ? 'badge--available' : 'badge--overdue'}`}>{u.status}</span>
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn--ghost btn--sm" title="Edit" onClick={() => handleEdit(u)}><Edit size={14} /></button>
                    <button className="btn btn--ghost btn--sm" title="Delete" style={{ color: 'var(--error)' }} onClick={() => handleDelete(u)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && <div className="empty-state"><p>No users found</p></div>}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowModal(false)}>
          <div className="card animate-fade-in-up" style={{ maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => { setShowModal(false); resetForm(); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group"><label>Full Name *</label><input className="input-field" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
              <div className="input-group"><label>Email *</label><input className="input-field" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="input-group"><label>Password {editingUser ? '(leave blank to keep current)' : '*'}</label><input className="input-field" type="password" required={!editingUser} minLength={editingUser ? 0 : 6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
              <div className="input-group"><label>Role</label><select className="input-field" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option value="student">Student</option><option value="librarian">Librarian</option><option value="admin">Admin</option></select></div>
              <div className="input-group"><label>Matric Number</label><input className="input-field" value={formData.matric_number} onChange={e => setFormData({...formData, matric_number: e.target.value})} /></div>
              <div className="input-group"><label>Department</label><input className="input-field" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} /></div>
              <button type="submit" className="btn btn--primary" style={{ marginTop: 'var(--space-2)' }}>{editingUser ? 'Save Changes' : 'Create User'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
