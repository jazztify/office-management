import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

export default function SuperAdminPage() {
  const { tenant } = useTenant();
  const { user, refreshSession } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '', subdomain: '', subscriptionTier: 'free',
    adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '',
    logoUrl: '', customPrice: '', activeModules: []
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', logoUrl: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (tenant?.subdomain === 'admin') {
      fetchTenants();
    } else {
      setLoading(false);
    }
  }, [tenant]);

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/api/admin/tenants');
      setTenants(data);
    } catch (error) {
      console.error('Failed to fetch tenants', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.adminEmail || !formData.adminPassword) {
      alert('Admin email and password are required so you can hand off login credentials to the client.');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/api/admin/tenants', formData);
      setLastCreated({
        company: formData.name,
        workspace: formData.subdomain,
        email: formData.adminEmail,
        password: formData.adminPassword,
        tier: formData.subscriptionTier,
      });
      setFormData({
        name: '', subdomain: '', subscriptionTier: 'free',
        adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '', logoUrl: '',
        customPrice: '', activeModules: []
      });
      setShowForm(false);
      fetchTenants();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (tenant) => {
    setEditingTenant(tenant);
    setEditFormData({ name: tenant.name, logoUrl: tenant.logoUrl || '' });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/api/admin/tenants/${editingTenant._id}`, editFormData);
      setShowEditModal(false);
      setEditingTenant(null);
      fetchTenants();
      // If we are editing the workspace we are currently logged into, refresh session
      if (editingTenant.subdomain === tenant.subdomain) {
        refreshSession();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update tenant');
    } finally {
      setUpdating(false);
    }
  };

  if (tenant?.subdomain !== 'admin') {
    return (
      <div className="page-container">
        <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>🚫 Access Denied</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This page is only accessible to the <strong>System Owner</strong>.<br />
            If you are a company admin, you can manage your workspace settings from the Settings page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>👑 System Owner Panel</h1>
          <p className="page-subtitle">
            You are the platform owner. Create and manage client companies/branches from here.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Company / Branch'}
        </button>
      </div>

      {/* Owner Identity */}
      <div className="panel" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.08) 100%)', border: '1px solid rgba(255,215,0,0.2)' }}>
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>👑</span>
          <div>
            <strong style={{ fontSize: '1.1rem' }}>System Owner: {user?.email}</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              You have full access to create companies, manage subscriptions, and provision admin accounts for your clients.
              <br />Company admins only manage their own workspace — they cannot access this panel.
            </p>
          </div>
        </div>
      </div>

      {/* Last Created Success */}
      {lastCreated && (
        <div className="panel" style={{ marginBottom: '1.5rem', background: 'rgba(52, 199, 89, 0.08)', border: '1px solid rgba(52, 199, 89, 0.25)' }}>
          <div className="panel-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 0.75rem', color: 'var(--color-success)' }}>✅ Company Created Successfully!</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  <strong>Company:</strong> <span>{lastCreated.company}</span>
                  <strong>Workspace:</strong> <span>{lastCreated.workspace}</span>
                  <strong>Tier:</strong> <span>{lastCreated.tier}</span>
                  <strong>Admin Email:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{lastCreated.email}</span>
                  <strong>Admin Password:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{lastCreated.password}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                  📋 Share these credentials with the client's administrator. They log in using workspace "{lastCreated.workspace}".
                </p>
              </div>
              <button className="btn-ghost" onClick={() => setLastCreated(null)} style={{ fontSize: '1.2rem' }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tenant Form */}
      {showForm && (
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-title">📝 Register New Client Company / Branch</div>
          <form onSubmit={handleCreate} className="panel-body">
            <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>Company Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Company / Branch Name *</label>
                <input type="text" className="select-input" required placeholder="e.g. Acme Corp Manila"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Workspace Subdomain *</label>
                <input type="text" className="select-input" required placeholder="e.g. acme-manila"
                  value={formData.subdomain} onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Employees will use "{formData.subdomain || '___'}" as workspace to log in
                </span>
              </div>
              <div className="form-group">
                <label>Subscription Tier</label>
                <select className="select-input" value={formData.subscriptionTier} onChange={e => setFormData({ ...formData, subscriptionTier: e.target.value })}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom Plan</option>
                </select>
              </div>

              {formData.subscriptionTier === 'custom' && (
                <>
                  {/* Custom Price */}
                  <div className="form-group">
                    <label>Custom Monthly Price (₱) *</label>
                    <input
                      type="number"
                      className="select-input"
                      placeholder="e.g. 4999"
                      min="0"
                      step="0.01"
                      value={formData.customPrice}
                      onChange={e => setFormData({ ...formData, customPrice: e.target.value })}
                      required
                    />
                  </div>

                  {/* Active Modules Checkboxes */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Active Modules</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {[
                        { key: 'attendance', label: '📋 Attendance' },
                        { key: 'leaves', label: '🏖️ Leaves' },
                        { key: 'payroll', label: '💰 Payroll' },
                        { key: 'overtime', label: '⏰ Overtime' },
                        { key: 'shifts', label: '🔄 Shifts' },
                        { key: 'holidays', label: '📅 Holidays' },
                        { key: 'inventory', label: '📦 Inventory' },
                        { key: 'hr', label: '👥 HR' },
                        { key: 'pos', label: '🏪 POS' },
                        { key: 'club_management', label: '🎯 Club Mgmt' },
                      ].map(mod => (
                        <label key={mod.key} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: '6px',
                          background: formData.activeModules.includes(mod.key) ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-bg-hover)',
                          border: `1px solid ${formData.activeModules.includes(mod.key) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          cursor: 'pointer', fontSize: '0.85rem',
                          transition: 'all 0.2s ease',
                        }}>
                          <input
                            type="checkbox"
                            checked={formData.activeModules.includes(mod.key)}
                            onChange={e => {
                              const updated = e.target.checked
                                ? [...formData.activeModules, mod.key]
                                : formData.activeModules.filter(m => m !== mod.key);
                              setFormData({ ...formData, activeModules: updated });
                            }}
                          />
                          {mod.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Company/Client Logo (Optional)</label>
                <input type="file" accept="image/*" className="select-input" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert('Logo file must be smaller than 2MB');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => setFormData({...formData, logoUrl: reader.result});
                    reader.readAsDataURL(file);
                  }
                }} />
                {formData.logoUrl && <img src={formData.logoUrl} style={{ width: '64px', height: '64px', objectFit: 'contain', marginTop: '0.5rem', borderRadius: '4px' }} alt="Logo preview" />}
              </div>
            </div>

            <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>Company Admin Account (the person who manages this company)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Admin First Name</label>
                <input type="text" className="select-input" placeholder="Juan"
                  value={formData.adminFirstName} onChange={e => setFormData({ ...formData, adminFirstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Admin Last Name</label>
                <input type="text" className="select-input" placeholder="Dela Cruz"
                  value={formData.adminLastName} onChange={e => setFormData({ ...formData, adminLastName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Admin Email *</label>
                <input type="email" className="select-input" required placeholder="admin@company.com"
                  value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Admin Password *</label>
                <input type="text" className="select-input" required placeholder="temporary123"
                  value={formData.adminPassword} onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Share with client</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? '⏳ Creating...' : '🏢 Create Company + Admin Account'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
         <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>✏️ Edit Company</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body">
              <div className="form-group">
                <label>Company Name</label>
                <input 
                  type="text" 
                  className="select-input" 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Company/Client Logo</label>
                <input type="file" accept="image/*" className="select-input" onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert('Logo file must be smaller than 2MB');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => setEditFormData({...editFormData, logoUrl: reader.result});
                    reader.readAsDataURL(file);
                  }
                }} />
                {editFormData.logoUrl && (
                  <div style={{ marginTop: '0.5rem', position: 'relative', display: 'inline-block' }}>
                    <img src={editFormData.logoUrl} style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--color-border)' }} alt="Preview" />
                    <button type="button" className="btn-sm btn-danger" style={{ position: 'absolute', top: -10, right: -10, borderRadius: '50%', width: '20px', height: '20px', padding: 0 }} onClick={() => setEditFormData({...editFormData, logoUrl: ''})}>✕</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn-primary" disabled={updating} style={{ flex: 1 }}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Table */}
      <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📊 All Companies / Branches ({tenants.filter(t => t.subdomain !== 'admin').length})</div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Workspace</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Users</th>
              <th>Employees</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7">Loading...</td></tr>
            ) : (
              tenants
                .filter(t => t.subdomain !== 'admin') // Don't show the system owner workspace
                .map(t => (
                  <tr key={t._id}>
                    <td className="cell-primary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {t.logoUrl ? (
                          <img src={t.logoUrl} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', background: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '10px' }}>🏢</div>
                        )}
                        {t.name}
                      </div>
                    </td>
                    <td>
                      <code style={{ background: 'var(--color-bg-hover)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {t.subdomain}
                      </code>
                    </td>
                    <td><span className={`badge badge-tier-${t.subscriptionTier}`}>{t.subscriptionTier}{t.subscriptionTier === 'custom' && t.customPrice ? ` (₱${Number(t.customPrice).toLocaleString()})` : ''}</span></td>
                    <td><span className={`badge badge-${t.status === 'active' ? 'success' : 'danger'}`}>{t.status}</span></td>
                    <td>{t.metrics?.userCount || 0}</td>
                    <td>{t.metrics?.employeeCount || 0}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <div className="action-group">
                        <button
                          className="btn-sm btn-ghost"
                          style={{ color: 'var(--color-primary)' }}
                          onClick={() => handleEditClick(t)}
                        >
                          Edit
                        </button>
                        {t.status === 'active' ? (
                          <button
                            className="btn-sm btn-ghost"
                            style={{ color: 'var(--color-warning)' }}
                            onClick={async () => {
                              if (window.confirm(`Suspend ${t.name}? Users won't be able to log in.`)) {
                                await api.patch(`/api/admin/tenants/${t._id}`, { status: 'suspended' });
                                fetchTenants();
                              }
                            }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            className="btn-sm btn-ghost"
                            style={{ color: 'var(--color-success)' }}
                            onClick={async () => {
                              if (window.confirm(`Unsuspend ${t.name}?`)) {
                                await api.patch(`/api/admin/tenants/${t._id}`, { status: 'active' });
                                fetchTenants();
                              }
                            }}
                          >
                            Unsuspend
                          </button>
                        )}
                        <button
                          className="btn-sm btn-ghost"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={async () => {
                            if (window.confirm(`WARNING: Fully delete ${t.name} and all data? This cannot be undone.`)) {
                              await api.delete(`/api/admin/tenants/${t._id}`);
                              fetchTenants();
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
            {!loading && tenants.filter(t => t.subdomain !== 'admin').length === 0 && (
              <tr><td colSpan="7" className="empty-state">No client companies yet. Create your first one above!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
