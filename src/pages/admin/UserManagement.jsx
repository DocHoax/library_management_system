import { useState, useEffect } from 'react';
import { authApi, usersApi } from '../../services/api';
import { Search, UserPlus, Edit, Trash2, X, Ticket } from 'lucide-react';
import '../Dashboard.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', role: 'student', matric_number: '', department: '', phone: '' });
  const [inviteRole, setInviteRole] = useState('librarian');
  const [inviteDays, setInviteDays] = useState(7);
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteActionLoadingId, setInviteActionLoadingId] = useState(null);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const data = await usersApi.list({ page, per_page: 15, role: roleFilter, search: searchQuery });
      setUsers(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, total_pages: 1 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchInvites = async () => {
    try {
      const data = await authApi.listInvites();
      setInvites(data.invites || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([fetchUsers(1), fetchInvites()]);
    };

    void initialize();
  }, [roleFilter]);

  const handleSearch = (e) => { e.preventDefault(); fetchUsers(1); };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ full_name: '', email: '', password: '', role: 'student', matric_number: '', department: '', phone: '' });
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    setInviteResult(null);

    try {
      const response = await authApi.createInvite({ role: inviteRole, expires_in_days: inviteDays });
      setInviteResult(response.invite);
      fetchInvites();
    } catch (err) {
      alert(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleInviteStatusChange = async (inviteId, status) => {
    setInviteActionLoadingId(inviteId);

    try {
      await authApi.updateInvite(inviteId, { status });
      await fetchInvites();
      if (inviteResult?.id === inviteId) {
        setInviteResult(null);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setInviteActionLoadingId(null);
    }
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

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Generate Staff Invite</h3>
            <p style={{ margin: 0, color: 'var(--on-surface-variant)' }}>
              Create a one-time code for a librarian or another administrator.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'end' }}>
            <div className="input-group" style={{ minWidth: 180, margin: 0 }}>
              <label>Role</label>
              <select className="input-field" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="librarian">Librarian</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="input-group" style={{ minWidth: 140, margin: 0 }}>
              <label>Expiry Days</label>
              <input className="input-field" type="number" min="1" value={inviteDays} onChange={e => setInviteDays(Number(e.target.value) || 1)} />
            </div>
            <button type="button" className="btn btn--ghost" onClick={handleCreateInvite} disabled={inviteLoading}>
              <Ticket size={18} /> {inviteLoading ? 'Generating...' : 'Generate Invite'}
            </button>
          </div>
        </div>
      </div>

      {inviteResult && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Invite Code</h3>
              <p style={{ margin: 0, color: 'var(--on-surface-variant)' }}>
                Share this code with the staff member. It expires on {inviteResult.expires_at}.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
            <code style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 12, background: 'var(--surface-container-low)', wordBreak: 'break-all' }}>{inviteResult.code}</code>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => navigator.clipboard.writeText(inviteResult.code)}
            >
              Copy Code
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Invite List</h3>
            <p style={{ margin: 0, color: 'var(--on-surface-variant)' }}>Review active, expired, revoked, and used invite codes.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-container-low)' }}>
                {['Code', 'Role', 'Status', 'Expires', 'Created', 'Created By', 'Actions'].map(h => (
                  <th key={h} style={{ padding: 'var(--space-4) var(--space-5)', textAlign: 'left', fontSize: 'var(--text-label-md)', color: 'var(--primary-container)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.map((invite, index) => (
                <tr key={invite.id} style={{ background: index % 2 === 0 ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)', transition: 'background var(--transition-fast)' }}>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', fontFamily: 'monospace', fontSize: 'var(--text-body-sm)' }}>{invite.code}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <span className={`badge ${roleColors[invite.role] || ''}`}>{invite.role}</span>
                  </td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <span className={`badge ${invite.status === 'active' ? 'badge--available' : invite.status === 'used' ? 'badge--borrowed' : 'badge--overdue'}`}>{invite.status}</span>
                  </td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{invite.expires_at}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{invite.created_at}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-body-sm)', color: 'var(--on-surface-variant)' }}>{invite.created_by_name || '-'}</td>
                  <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {invite.status === 'active' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={inviteActionLoadingId === invite.id}
                            onClick={() => handleInviteStatusChange(invite.id, 'revoked')}
                          >
                            Revoke
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={inviteActionLoadingId === invite.id}
                            onClick={() => handleInviteStatusChange(invite.id, 'expired')}
                          >
                            Expire Now
                          </button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--on-surface-variant)', fontSize: 'var(--text-label-sm)' }}>No actions available</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invites.length === 0 && <div className="empty-state"><p>No invites found</p></div>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 280 }}>
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </form>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {['', 'admin', 'librarian', 'student'].map(role => (
            <button key={role} type="button" className={`btn btn--sm ${roleFilter === role ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setRoleFilter(role)}>
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
