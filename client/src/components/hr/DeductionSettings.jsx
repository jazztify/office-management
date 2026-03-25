import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DeductionSettings({ employees }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [formData, setFormData] = useState({
    monthlyTax: 0,
    sssEmployee: 0,
    philhealthEmployee: 0,
    pagibigEmployee: 0,
    insuranceContribution: 0,
    otherFixedDeductions: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch profile when employee changes
  useEffect(() => {
    if (!selectedEmployeeId) {
      setFormData({
        monthlyTax: 0,
        sssEmployee: 0,
        philhealthEmployee: 0,
        pagibigEmployee: 0,
        insuranceContribution: 0,
        otherFixedDeductions: 0
      });
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError('');
      setMessage('');
      try {
        if (selectedEmployeeId === 'global') {
          const { data } = await api.get('/api/settings');
          const d = data.statutoryDeductions || {};
          setFormData({
            monthlyTax: d.monthlyTax || 0,
            sssEmployee: d.sssEmployee || 0,
            philhealthEmployee: d.philhealthEmployee || 0,
            pagibigEmployee: d.pagibigEmployee || 0,
            insuranceContribution: d.insuranceContribution || 0,
            otherFixedDeductions: d.otherFixedDeductions || 0
          });
        } else {
          const { data } = await api.get(`/api/deductions/${selectedEmployeeId}`);
          setFormData({
            monthlyTax: data.monthlyTax || 0,
            sssEmployee: data.sssEmployee || 0,
            philhealthEmployee: data.philhealthEmployee || 0,
            pagibigEmployee: data.pagibigEmployee || 0,
            insuranceContribution: data.insuranceContribution || 0,
            otherFixedDeductions: data.otherFixedDeductions || 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch deduction profile:', err);
        setError('Failed to load employee deduction profile.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [selectedEmployeeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      if (selectedEmployeeId === 'global') {
        await api.patch('/api/settings', {
          statutoryDeductions: formData
        });
        setMessage('Global default deductions saved successfully.');
      } else {
        await api.post('/api/deductions', {
          employeeId: selectedEmployeeId,
          ...formData
        });
        setMessage('Employee deduction profile saved successfully.');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save deduction profile:', err);
      setError(err.response?.data?.error || 'Failed to save deduction profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>
          Statutory & Fixed Deductions
        </h2>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Configure monthly deduction amounts per employee. These will automatically apply when generating their payslips.
        </p>
      </div>

      <div className="form-group" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
        <label>Select Profile to Configure</label>
        <select 
          className="select-input" 
          value={selectedEmployeeId} 
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
        >
          <option value="">-- Choose Profile --</option>
          <option value="global" style={{ fontWeight: 'bold' }}>🌐 Global Defaults (Apply to all)</option>
          <optgroup label="Employee-Specific Overrides">
            {employees?.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName} ({emp.department || 'No Dept'})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {selectedEmployeeId && (
        <form onSubmit={handleSave} style={{ background: 'var(--color-bg-alt)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          
          {isLoading && <p className="text-muted">Loading profile...</p>}
          
          {!isLoading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Withholding Tax (₱)</label>
                  <input type="number" step="0.01" className="text-input" name="monthlyTax" value={formData.monthlyTax} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>SSS / GSIS Contribution (₱)</label>
                  <input type="number" step="0.01" className="text-input" name="sssEmployee" value={formData.sssEmployee} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>PhilHealth Contribution (₱)</label>
                  <input type="number" step="0.01" className="text-input" name="philhealthEmployee" value={formData.philhealthEmployee} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Pag-IBIG Contribution (₱)</label>
                  <input type="number" step="0.01" className="text-input" name="pagibigEmployee" value={formData.pagibigEmployee} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Insurance / HMO (₱)</label>
                  <input type="number" step="0.01" className="text-input" name="insuranceContribution" value={formData.insuranceContribution} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Other Fixed Deductions (₱)</label>
                  <input type="number" step="0.01" className="text-input" name="otherFixedDeductions" value={formData.otherFixedDeductions} onChange={handleChange} />
                </div>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
              {message && <div className="alert alert-success" style={{ marginBottom: '1rem', background: 'var(--color-success-bg, rgba(46,204,113,0.1))', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>{message}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (selectedEmployeeId === 'global' ? 'Save Global Defaults' : 'Save Employee Overrides')}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {employees?.length === 0 && (
        <div className="text-muted" style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-bg-alt)', borderRadius: '12px' }}>
          No employees found. Please add employees first.
        </div>
      )}
    </div>
  );
}
