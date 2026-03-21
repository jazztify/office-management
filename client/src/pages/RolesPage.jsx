import { useState, useEffect } from 'react';
import api from '../services/api';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: '' });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/api/roles');
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const permissionsArray = formData.permissions.split(',').map((p) => p.trim()).filter(Boolean);
      await api.post('/api/roles', {
        name: formData.name,
        description: formData.description,
        permissions: permissionsArray,
      });
      setFormData({ name: '', description: '', permissions: '' });
      setShowForm(false);
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create role');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/api/roles/${id}`);
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Roles & Permissions</h1>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Role'}
        </button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Role name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <input
              type="text"
              placeholder="Permissions (comma-separated)"
              value={formData.permissions}
              onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
              required
            />
            <button type="submit" className="btn-primary btn-sm">Create</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="loading-state">Loading roles...</div>
      ) : (
        <div className="roles-grid">
          {roles.map((role) => (
            <div key={role._id} className="role-card">
              <div className="role-card-header">
                <h3>{role.name}</h3>
                {role.isSystemDefault && (
                  <span className="badge badge-info">System</span>
                )}
              </div>
              {role.description && (
                <p className="role-description">{role.description}</p>
              )}
              <div className="permissions-list">
                {role.permissions?.map((perm, i) => (
                  <span key={i} className="badge badge-sm badge-primary">{perm}</span>
                ))}
              </div>
              <div className="role-card-footer">
                {!role.isSystemDefault && (
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(role._id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {roles.length === 0 && (
            <p className="text-muted">No roles configured yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
