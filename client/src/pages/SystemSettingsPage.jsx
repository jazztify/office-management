import { useEffect, useState } from 'react';
import api from '../services/api';
import { useTenant } from '../contexts/TenantContext';

export default function SystemSettingsPage() {
  const { tenant } = useTenant();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
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

  const toggleModule = (moduleKey) => {
    const isSelected = editingPlan.activeModules.includes(moduleKey);
    const updatedModules = isSelected
      ? editingPlan.activeModules.filter(m => m !== moduleKey)
      : [...editingPlan.activeModules, moduleKey];
    
    setEditingPlan({ ...editingPlan, activeModules: updatedModules });
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
        <div>
          <h1>⚙️ System Administration</h1>
          <p className="page-subtitle">Configure default pricing and module access for standard subscription tiers.</p>
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
                <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setEditingPlan({ ...plan })}>
                  ✏️ Edit Defaults
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
                      background: editingPlan.activeModules.includes(mod.key) ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-bg-hover)',
                      border: `1px solid ${editingPlan.activeModules.includes(mod.key) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={editingPlan.activeModules.includes(mod.key)}
                        onChange={() => toggleModule(mod.key)}
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
    </div>
  );
}
