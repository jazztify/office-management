import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

export default function SettingsPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    officeHours: { start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    deductions: {
      latePerMinute: 5, undertimePerMinute: 5, absencePerDay: 500,
      halfDayDeduction: 250, lunchOvertime: 0, maxLunchMinutes: 60,
    },
    overtime: {
      requiresApproval: true, rateMultiplier: 1.25,
      restDayMultiplier: 1.3, holidayMultiplier: 2.0, maxHoursPerDay: 4,
    },
    gracePeriod: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = user?.permissions?.includes('manage_settings') || user?.permissions?.includes('*');

  useEffect(() => {
    if (canEdit) {
      api.get('/api/settings')
        .then(res => {
          // Deep merge with defaults
          setSettings(prev => ({
            officeHours: { ...prev.officeHours, ...res.data.officeHours },
            deductions: { ...prev.deductions, ...res.data.deductions },
            overtime: { ...prev.overtime, ...res.data.overtime },
            gracePeriod: res.data.gracePeriod ?? prev.gracePeriod,
          }));
        })
        .catch(err => console.error('Failed to load settings', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [canEdit]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/settings', settings);
      alert('Settings updated successfully!');
    } catch (error) {
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section, field, value) => {
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      setSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    setChangingPwd(true);

    try {
      await api.post('/api/users/change-password', {
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword
      });
      setPwdSuccess('Password changed successfully!');
      setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) return <div className="page-container">Loading settings...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>⚙️ Settings</h1>
          <p className="page-subtitle">Manage workspace preferences and HR policies</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save All Settings'}
          </button>
        )}
      </div>

      <div className="dashboard-panels">
        {/* General Info */}
        <div className="panel">
          <div className="panel-title">🏢 General Information</div>
          <div className="panel-body">
            <div className="form-group">
              <label>Workspace Name</label>
              <input type="text" value={tenant?.name || ''} readOnly className="select-input" style={{ opacity: 0.7 }} />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Subdomain</label>
              <input type="text" value={tenant?.subdomain || ''} readOnly className="select-input" style={{ opacity: 0.7 }} />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>My Email</label>
              <input type="email" value={user?.email || ''} readOnly className="select-input" style={{ opacity: 0.7 }} />
            </div>
          </div>
        </div>

        {/* Security Settings (Change Password) */}
        <div className="panel">
          <div className="panel-title">🔒 Security Settings</div>
          <div className="panel-body">
            <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem' }}>Change Password</h4>
            
            {pwdError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{pwdError}</div>}
            {pwdSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem', color: 'var(--color-success)', background: 'rgba(52, 199, 89, 0.1)', padding: '0.75rem', borderRadius: '4px' }}>{pwdSuccess}</div>}
            
            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Current Password *</label>
                <input 
                  type="password" 
                  className="select-input" 
                  placeholder="Enter current password" 
                  required 
                  value={pwdData.currentPassword} 
                  onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>New Password *</label>
                <input 
                  type="password" 
                  className="select-input" 
                  placeholder="At least 6 characters" 
                  required 
                  minLength={6}
                  value={pwdData.newPassword} 
                  onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Confirm New Password *</label>
                <input 
                  type="password" 
                  className="select-input" 
                  placeholder="Re-enter new password" 
                  required 
                  minLength={6}
                  value={pwdData.confirmPassword} 
                  onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })} 
                />
              </div>
              <button type="submit" className="btn-primary" disabled={changingPwd}>
                {changingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {canEdit && (
          <>
            {/* Office Hours */}
            <div className="panel">
              <div className="panel-title">🕐 Office Hours (Philippine Standard)</div>
              <div className="panel-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', marginTop: 0 }}>
                  Default PH schedule: 8:00 AM – 12:00 PM → Lunch → 1:00 PM – 5:00 PM
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>Morning Start</label>
                    <input type="time" className="select-input" value={settings.officeHours.start}
                      onChange={e => updateField('officeHours', 'start', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Afternoon End</label>
                    <input type="time" className="select-input" value={settings.officeHours.end}
                      onChange={e => updateField('officeHours', 'end', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Lunch Start</label>
                    <input type="time" className="select-input" value={settings.officeHours.lunchStart}
                      onChange={e => updateField('officeHours', 'lunchStart', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Lunch End</label>
                    <input type="time" className="select-input" value={settings.officeHours.lunchEnd}
                      onChange={e => updateField('officeHours', 'lunchEnd', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Grace Period (minutes before counted as late)</label>
                  <input type="number" className="select-input" min="0" max="60"
                    value={settings.gracePeriod}
                    onChange={e => updateField(null, 'gracePeriod', Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="panel">
              <div className="panel-title">💸 Deduction Rules</div>
              <div className="panel-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', marginTop: 0 }}>
                  Configure how deductions are calculated. All amounts are in Philippine Peso (₱).
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Late Deduction (₱ per minute)</label>
                    <input type="number" className="select-input" min="0" step="0.5"
                      value={settings.deductions.latePerMinute}
                      onChange={e => updateField('deductions', 'latePerMinute', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Undertime Deduction (₱ per minute)</label>
                    <input type="number" className="select-input" min="0" step="0.5"
                      value={settings.deductions.undertimePerMinute}
                      onChange={e => updateField('deductions', 'undertimePerMinute', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Absence Deduction (₱ per day)</label>
                    <input type="number" className="select-input" min="0"
                      value={settings.deductions.absencePerDay}
                      onChange={e => updateField('deductions', 'absencePerDay', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Half-Day Deduction (₱)</label>
                    <input type="number" className="select-input" min="0"
                      value={settings.deductions.halfDayDeduction}
                      onChange={e => updateField('deductions', 'halfDayDeduction', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Max Lunch Break (minutes)</label>
                    <input type="number" className="select-input" min="30" max="120"
                      value={settings.deductions.maxLunchMinutes}
                      onChange={e => updateField('deductions', 'maxLunchMinutes', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Excess Lunch Deduction (₱ per excess min)</label>
                    <input type="number" className="select-input" min="0"
                      value={settings.deductions.lunchOvertime}
                      onChange={e => updateField('deductions', 'lunchOvertime', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Overtime Settings */}
            <div className="panel">
              <div className="panel-title">⏳ Overtime Rules</div>
              <div className="panel-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', marginTop: 0 }}>
                  Philippine standard: Regular OT = 125%, Rest Day OT = 130%, Holiday OT = 200%
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Regular OT Rate (multiplier)</label>
                    <input type="number" className="select-input" min="1" step="0.05"
                      value={settings.overtime.rateMultiplier}
                      onChange={e => updateField('overtime', 'rateMultiplier', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Rest Day OT Rate (multiplier)</label>
                    <input type="number" className="select-input" min="1" step="0.05"
                      value={settings.overtime.restDayMultiplier}
                      onChange={e => updateField('overtime', 'restDayMultiplier', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Holiday OT Rate (multiplier)</label>
                    <input type="number" className="select-input" min="1" step="0.1"
                      value={settings.overtime.holidayMultiplier}
                      onChange={e => updateField('overtime', 'holidayMultiplier', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Max OT Hours per Day</label>
                    <input type="number" className="select-input" min="1" max="12"
                      value={settings.overtime.maxHoursPerDay}
                      onChange={e => updateField('overtime', 'maxHoursPerDay', Number(e.target.value))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={settings.overtime.requiresApproval}
                      onChange={e => updateField('overtime', 'requiresApproval', e.target.checked)} />
                    Overtime requires HR approval before counting in payroll
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Subscription Tier */}
        <div className="panel">
          <div className="panel-title">📊 Subscription Tier</div>
          <div className="panel-body">
            <div className={`badge badge-tier-${tenant?.subscriptionTier || 'free'}`} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
              {tenant?.subscriptionTier?.toUpperCase() || 'FREE'}
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Contact your system administrator to upgrade your plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
