import { useEffect, useState } from 'react';
import api from '../services/api';
import { useTenant } from '../contexts/TenantContext';

export default function SystemSettingsPage() {
  const { tenant } = useTenant();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Available modules for all plans
  const availableModules = [
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
  ];

  useEffect(() => {
    if (tenant?.subdomain === 'admin') {
      fetchPlans();
    }
  }, [tenant]);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/api/admin/plans');
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.post('/api/admin/plans', newPlan);
      setNewPlan(null);
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create plan');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/api/admin/plans/${editingPlan.tierName}`, editingPlan);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update plan');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (tierName) => {
    if (!window.confirm(`Are you sure you want to delete the "${tierName}" plan?`)) return;
    try {
      await api.delete(`/api/admin/plans/${tierName}`);
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete plan');
    }
  };

  const toggleModule = (planState, setPlanState, moduleKey) => {
    const isSelected = planState.activeModules.includes(moduleKey);
    const updatedModules = isSelected
      ? planState.activeModules.filter(m => m !== moduleKey)
      : [...planState.activeModules, moduleKey];
    
    setPlanState({ ...planState, activeModules: updatedModules });
  };

  if (tenant?.subdomain !== 'admin') {
    return (
      <div className="page-container">
        <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>🚫 Access Denied</h2>
          <p>Only the System Owner can manage subscription plans.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1>⚙️ System Administration</h1>
            <p className="page-subtitle">Configure default pricing and module access for standard subscription tiers.</p>
          </div>
          <button className="btn-primary" onClick={() => setNewPlan({ tierName: '', monthlyPrice: 0, activeModules: [], description: '' })}>
            ➕ Add New Plan
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {loading ? (
          <p>Loading plans...</p>
        ) : (
          plans.map(plan => (
            <div key={plan._id} className="panel plan-config-card" style={{ borderTop: `4px solid ${plan.tierName === 'enterprise' ? 'var(--color-danger)' : plan.tierName === 'pro' ? 'var(--color-primary)' : 'var(--color-text-muted)'}` }}>
              <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textTransform: 'capitalize' }}>{plan.tierName} Plan</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>₱{Number(plan.monthlyPrice).toLocaleString()}</span>
              </div>
              <div className="panel-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{plan.description}</p>
                <div style={{ marginBottom: '1.5rem' }}>
                  <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Included Modules:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {plan.activeModules.map(mod => (
                      <span key={mod} className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {availableModules.find(a => a.key === mod)?.label || mod}
                      </span>
                    ))}
                    {plan.activeModules.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>None</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingPlan({ ...plan })}>
                    ✏️ Edit
                  </button>
                  <button className="btn-danger" style={{ padding: '0 0.75rem' }} onClick={() => handleDelete(plan.tierName)} title="Delete Plan">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ textTransform: 'capitalize' }}>Edit {editingPlan.tierName} Defaults</h3>
              <button className="btn-close" onClick={() => setEditingPlan(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body">
              <div className="form-group">
                <label>Monthly Price (₱)</label>
                <input
                  type="number"
                  className="select-input"
                  value={editingPlan.monthlyPrice}
                  onChange={e => setEditingPlan({ ...editingPlan, monthlyPrice: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Description</label>
                <input
                  type="text"
                  className="select-input"
                  value={editingPlan.description || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>Toggle Active Modules</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {availableModules.map(mod => (
                    <label key={mod.key} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.75rem', borderRadius: '6px',
                      background: editingPlan.activeModules.includes(mod.key) ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface-hover)',
                      border: `1px solid ${editingPlan.activeModules.includes(mod.key) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={editingPlan.activeModules.includes(mod.key)}
                        onChange={() => toggleModule(editingPlan, setEditingPlan, mod.key)}
                      />
                      {mod.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn-primary" disabled={updating} style={{ flex: 1 }}>
                  {updating ? 'Saving...' : 'Save Configuration'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditingPlan(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {newPlan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>➕ Add New Subscription Plan</h3>
              <button className="btn-close" onClick={() => setNewPlan(null)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label>Plan Name (e.g., Gold, Startup)</label>
                <input
                  type="text"
                  className="select-input"
                  value={newPlan.tierName}
                  onChange={e => setNewPlan({ ...newPlan, tierName: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="name_will_be_slugified"
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Monthly Price (₱)</label>
                <input
                  type="number"
                  className="select-input"
                  value={newPlan.monthlyPrice}
                  onChange={e => setNewPlan({ ...newPlan, monthlyPrice: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Description</label>
                <input
                  type="text"
                  className="select-input"
                  value={newPlan.description || ''}
                  onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>Select Initial Modules</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {availableModules.map(mod => (
                    <label key={mod.key} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.75rem', borderRadius: '6px',
                      background: newPlan.activeModules.includes(mod.key) ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface-hover)',
                      border: `1px solid ${newPlan.activeModules.includes(mod.key) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={newPlan.activeModules.includes(mod.key)}
                        onChange={() => toggleModule(newPlan, setNewPlan, mod.key)}
                      />
                      {mod.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn-primary" disabled={updating} style={{ flex: 1 }}>
                  {updating ? 'Creating Plan...' : 'Create Plan'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setNewPlan(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
