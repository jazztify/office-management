import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

const DEFAULT_MODS = ['hr_payroll', 'club_management', 'pos', 'inventory'];

const MODULE_CATEGORIES = [
  {
    title: '💳 Commerce & Finance',
    modules: [
      { key: 'pos', label: 'Universal POS & Shift' },
      { key: 'wallet', label: 'Digital Wallet & Ledger' },
      { key: 'returns', label: 'Returns & RMA' },
    ]
  },
  {
    title: '📦 People & Operations',
    modules: [
      { key: 'hr_payroll', label: 'HR & Payroll' },
      { key: 'inventory', label: 'Advanced Inventory' },
    ]
  },
  {
    title: '🏸 Gym & Service Specific',
    modules: [
      { key: 'club_management', label: 'Club Memberships' },
      { key: 'bookings', label: 'Booking & Scheduling' },
      { key: 'access_control', label: 'Access Control (IoT)' },
    ]
  },
  {
    title: '🤝 Customer Engagement',
    modules: [
      { key: 'crm', label: 'CRM & Marketing' },
      { key: 'loyalty', label: 'Loyalty & Rewards' },
      { key: 'user_portal', label: 'End-User Portal' },
      { key: 'social_marketing', label: 'Multi-Social Marketing' },
    ]
  }
];

export default function SuperAdminPage() {
  const { tenant } = useTenant();
  const { user, refreshSession } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '', subdomain: '', subscriptionTier: 'free',
    adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '',
    logoUrl: '', customPrice: '', activeModules: DEFAULT_MODS
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', logoUrl: '', subscriptionTier: 'free', activeModules: [], customPrice: '' });
  const [updating, setUpdating] = useState(false);
  
  const [activeTab, setActiveTab] = useState('general');

  const MODULE_ICONS = {
    pos: '🛒',
    wallet: '💳',
    returns: '🔄',
    hr_payroll: '👔',
    inventory: '📦',
    club_management: '🏸',
    bookings: '📅',
    access_control: '🚪',
    crm: '📧',
    loyalty: '🎁',
    user_portal: '📱',
    social_marketing: '🚀'
  };

  useEffect(() => {
    if (tenant?.subdomain === 'admin') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [tenant]);

  const fetchData = async () => {
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        api.get('/api/admin/tenants'),
        api.get('/api/admin/plans')
      ]);
      setTenants(tenantsRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.adminEmail || !formData.adminPassword) {
      alert('Admin email and password are required.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/admin/tenants', formData);
      setLastCreated({
        email: formData.adminEmail,
        password: formData.adminPassword,
        company: formData.name,
        workspace: formData.subdomain
      });
      setShowForm(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/api/admin/tenants/${editingTenant._id}`, editFormData);
      setShowEditModal(false);
      setEditingTenant(null);
      fetchData();
      
      // If we adjusted our own tenant or the one we are currently impersonating
      if (editingTenant.subdomain === tenant?.subdomain) {
        refreshSession();
      }
      
      alert('Branch updated successfully! Changes will propagate to active users shortly.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update tenant');
    } finally {
      setUpdating(false);
    }
  };

  const TenantModal = ({ isOpen, onClose, data, onChange, onSubmit, isEditing, loading: modalLoading }) => {
    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <h3>{isEditing ? '✏️ Edit Company' : '🏢 Register New Company'}</h3>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
          
          <div className="tab-container" style={{ marginTop: '1rem', padding: '0 2rem' }}>
            {['general', 'modules', 'billing'].map(tab => (
              <button 
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'general' ? 'General Info' : tab === 'modules' ? 'Modules' : 'Billing'}
              </button>
            ))}
          </div>

          <div className="modal-body" style={{ minHeight: '350px' }}>
            {activeTab === 'general' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="fade-in">
                <div>
                  <h4 className="form-subsection">Company Details</h4>
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input type="text" value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} required placeholder="e.g. Acme Corp" />
                  </div>
                  {!isEditing && (
                    <div className="form-group">
                      <label>Workspace Subdomain *</label>
                      <div className="input-with-suffix">
                        <input type="text" value={data.subdomain} onChange={e => onChange({ ...data, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} required placeholder="acme" />
                        <div className="input-suffix">.app</div>
                      </div>
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Logo Preview</label>
                    <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => onChange({...data, logoUrl: reader.result});
                        reader.readAsDataURL(file);
                      }
                    }} />
                    {data.logoUrl && <img src={data.logoUrl} style={{ width: '48px', height: '48px', objectFit: 'contain', marginTop: '8px' }} />}
                  </div>
                </div>
                {!isEditing && (
                  <div>
                    <h4 className="form-subsection">Initial Admin Credentials</h4>
                    <div className="form-group">
                      <label>Admin Email *</label>
                      <input type="email" value={data.adminEmail} onChange={e => onChange({ ...data, adminEmail: e.target.value })} required placeholder="admin@acme.com" />
                    </div>
                    <div className="form-group">
                      <label>Temporary Password *</label>
                      <input type="text" value={data.adminPassword} onChange={e => onChange({ ...data, adminPassword: e.target.value })} required placeholder="Welcome123!" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="fade-in">
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Select which features are active for this branch.</p>
                <div className="module-grid">
                  {MODULE_CATEGORIES.flatMap(c => c.modules).map(mod => {
                    const selected = data.activeModules.includes(mod.key);
                    return (
                      <div key={mod.key} className={`module-card ${selected ? 'selected' : ''}`} onClick={() => {
                        const updated = selected ? data.activeModules.filter(m => m !== mod.key) : [...data.activeModules, mod.key];
                        onChange({ ...data, activeModules: updated });
                      }}>
                        <div className="module-card-header">
                          <span className="module-icon">{MODULE_ICONS[mod.key] || '📦'}</span>
                          <div className="module-check">{selected && '✓'}</div>
                        </div>
                        <span className="module-label">{mod.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div style={{ maxWidth: '400px' }} className="fade-in">
                <h4 className="form-subsection">Subscription Tier</h4>
                <div className="form-group">
                  <label>Plan Tier</label>
                  <select className="select-input" value={data.subscriptionTier} onChange={e => onChange({ ...data, subscriptionTier: e.target.value })}>
                    {plans.map(p => <option key={p._id} value={p.tierName}>{p.tierName.toUpperCase()}</option>)}
                    <option value="custom">CUSTOM RATE</option>
                  </select>
                </div>
                {data.subscriptionTier === 'custom' && (
                   <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Monthly Price (₱) *</label>
                    <input type="number" value={data.customPrice} onChange={e => onChange({ ...data, customPrice: e.target.value })} required placeholder="0.00" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={modalLoading} onClick={onSubmit}>
              {modalLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Company')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>👑 System Owner Panel</h1>
          <p className="page-subtitle">Manage multi-tenant distribution and branch operations.</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditingTenant(null);
          setFormData({
            name: '', subdomain: '', subscriptionTier: 'free',
            adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '',
            logoUrl: '', customPrice: '', activeModules: DEFAULT_MODS
          });
          setActiveTab('general');
          setShowForm(true);
        }}>
          + New Company
        </button>
      </div>

      {/* Identity Banner */}
      <div className="panel" style={{ marginBottom: '2rem', border: 'none', background: 'var(--color-primary)', color: 'white' }}>
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👑</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Session: {user?.email}</h3>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.85rem' }}>Global privileges enabled. You can impersonate any branch and manage global tiers.</p>
          </div>
        </div>
      </div>

      {/* Last Created Success (Floating) */}
      {lastCreated && (
        <div className="fade-in" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000 }}>
          <div className="panel" style={{ border: '2px solid var(--color-success)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="panel-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--color-success)', margin: '0 0 0.5rem 0' }}>✅ Tenant Created</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Email: <strong>{lastCreated.email}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Pass: <strong>{lastCreated.password}</strong></p>
                </div>
                <button onClick={() => setLastCreated(null)}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Table */}
      <div className="table-container">
        <div className="panel-title" style={{ padding: '1.25rem 1.5rem', background: '#fff' }}>
          Branch Distribution List
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Workspace</th>
              <th>Status</th>
              <th>Tier</th>
              <th>Employees</th>
              <th>Revenue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty-state">Syncing branches...</td></tr>
            ) : (
              tenants.filter(t => t.subdomain !== 'admin').map(t => (
                <tr key={t._id}>
                  <td className="cell-primary">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       {t.logoUrl ? <img src={t.logoUrl} style={{ width: '32px', height: '32px', objectFit: 'contain' }} alt="Logo" /> : '🏢'}
                       {t.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <code style={{ background: 'var(--color-surface-hover)', padding: '4px 8px', borderRadius: '4px' }}>{t.subdomain}</code>
                      <a 
                        href={(() => {
                          const token = localStorage.getItem('token');
                          const hostname = window.location.hostname;
                          const protocol = window.location.protocol;
                          const port = window.location.port ? `:${window.location.port}` : '';
                          
                          // Handle localhost development
                          if (hostname.includes('localhost') || hostname === '127.0.0.1') {
                            // If we're already on a subdomain (e.g. admin.localhost), keep the base 'localhost'
                            const baseDomain = hostname.includes('.') ? hostname.split('.').slice(-1)[0] : hostname;
                            return `${protocol}//${t.subdomain}.${baseDomain}${port}/login?token=${token}&subdomain=${t.subdomain}`;
                          }
                          
                          // Handle production domains
                          const parts = hostname.split('.');
                          const baseDomain = parts.slice(-2).join('.');
                          return `${protocol}//${t.subdomain}.${baseDomain}${port}/login?token=${token}&subdomain=${t.subdomain}`;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sm btn-ghost"
                        style={{ padding: '2px 4px', fontSize: '1rem' }}
                        title="Open Workspace"
                      >
                        ↗
                      </a>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-primary">{t.subscriptionTier.toUpperCase()}</span>
                  </td>
                  <td>{t.metrics?.employeeCount || 0}</td>
                  <td className="cell-money">
                    ₱{(t.subscriptionTier === 'custom' ? t.customPrice : 0).toLocaleString()}
                  </td>
                  <td>
                    <div className="action-group">
                      <button className="btn-sm btn-view" onClick={() => {
                        setEditingTenant(t);
                        setEditFormData({
                          _id: t._id,
                          name: t.name,
                          logoUrl: t.logoUrl || '',
                          subscriptionTier: t.subscriptionTier || 'free',
                          activeModules: t.activeModules || [],
                          customPrice: t.customPrice || '',
                        });
                        setActiveTab('general');
                        setShowEditModal(true);
                      }}>Edit</button>
                      
                      {t.status === 'active' ? (
                        <button className="btn-sm btn-ghost" style={{ color: 'var(--color-warning)' }} onClick={async () => {
                          if (window.confirm(`Suspend ${t.name}?`)) {
                            await api.patch(`/api/admin/tenants/${t._id}`, { status: 'suspended' });
                            fetchData();
                          }
                        }}>Suspend</button>
                      ) : (
                        <button className="btn-sm btn-ghost" style={{ color: 'var(--color-success)' }} onClick={async () => {
                          if (window.confirm(`Activate ${t.name}?`)) {
                            await api.patch(`/api/admin/tenants/${t._id}`, { status: 'active' });
                            fetchData();
                          }
                        }}>Activate</button>
                      )}

                      <button className="btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={async () => {
                         if (window.confirm('Delete branch?')) {
                           await api.delete(`/api/admin/tenants/${t._id}`);
                           fetchData();
                         }
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TenantModal 
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        data={formData}
        onChange={setFormData}
        onSubmit={handleCreate}
        isEditing={false}
        loading={creating}
      />

      <TenantModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        data={editFormData}
        onChange={setEditFormData}
        onSubmit={handleUpdate}
        isEditing={true}
        loading={updating}
      />
    </div>
  );
}
