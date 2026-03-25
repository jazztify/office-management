import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_BADGE = {
  training: { label: 'Training', className: 'badge-warning' },
  probationary: { label: 'Probationary', className: 'badge-info' },
  regular: { label: 'Regular', className: 'badge-success' },
  contractual: { label: 'Contractual', className: 'badge-primary' },
  on_leave: { label: 'On Leave', className: 'badge-warning' },
  // Offboarding Statuses
  resigned: { label: 'Resigned', className: 'badge-danger' },
  terminated: { label: 'Terminated', className: 'badge-danger' },
  retired: { label: 'Retired', className: 'badge-secondary' },
  contract_ended: { label: 'End of Contract', className: 'badge-danger' },
  none: { label: null, className: '' }
};

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const isPastView = location.pathname === '/past-employees';
  
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    userId: '', firstName: '', lastName: '', departmentId: '', positionId: '', 
    employmentStatus: 'training',
    offboardingStatus: 'none',
    commissionRate: 0.70, 
    hasCommission: false,
    staffType: 'STAFF',
    roleId: '',
    onboardingStatus: 'IN_PROGRESS', dateOfBirth: '', hireDate: '', 
    emergencyContact: { name: '', relationship: '', phone: '' },
    documentLinks: [],
    // User Account Integration
    createAccount: false,
    email: '',
    password: '',
    // Recurring Deductions
    monthlyTax: 0,
    sssEmployee: 0,
    philhealthEmployee: 0,
    pagibigEmployee: 100,
    insuranceContribution: 0,
    otherFixedDeductions: 0,
  });

  const canManage = hasPermission('manage_employees') || hasPermission('*');

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
    fetchDepartments();
    fetchPositions();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/api/roles');
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data } = await api.get('/api/positions');
      setPositions(data);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      setEmployees(data);
    } catch (err) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleStaffTypeChange = (newType) => {
    setFormData(prev => {
      const updates = { ...prev, staffType: newType };
      
      // Smart Suggestion: Try to find a role matching the type
      const roleNameMap = {
        'STAFF': 'Employee',
        'COACH': 'Coach',
        'ADMIN': 'Admin',
        'MANAGEMENT': 'Super Admin'
      };
      
      const suggestedRoleName = roleNameMap[newType];
      if (suggestedRoleName) {
        const found = roles.find(r => r.name === suggestedRoleName);
        if (found) updates.roleId = found._id;
      }
      
      return updates;
    });
  };

  const handlePositionChange = (posId) => {
    const selectedPos = positions.find(p => p._id === posId);
    setFormData(prev => {
      const updates = { ...prev, positionId: posId };
      if (selectedPos && selectedPos.roleId) {
        updates.roleId = selectedPos.roleId;
      }
      return updates;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        departmentId: formData.departmentId || null,
        positionId: formData.positionId || null,
        salary: Number(formData.salary) || 0,
        hourlyRate: Number(formData.hourlyRate) || 0,
        commissionRate: formData.hasCommission ? (Number(formData.commissionRate) || 0) : 0,
        employmentStatus: formData.employmentStatus,
        offboardingStatus: formData.offboardingStatus,
        staffType: formData.staffType,
        roleId: formData.roleId || null,
        onboardingStatus: formData.onboardingStatus,
        emergencyContact: formData.emergencyContact,
        dateOfBirth: formData.dateOfBirth || null,
        hireDate: formData.hireDate || null,
        documentLinks: formData.documentLinks,
        // Account Creation
        createAccount: formData.createAccount,
        email: formData.email,
        password: formData.password,
      };

      let employeeId = editingId;
      if (editingId) {
        await api.patch(`/api/employees/${editingId}`, payload);
      } else {
        const { data } = await api.post('/api/employees', { ...payload, userId: null });
        employeeId = data._id;
      }

      // Save Deduction Profile
      if (employeeId) {
        await api.post('/api/deductions', {
          employeeId,
          monthlyTax: Number(formData.monthlyTax) || 0,
          sssEmployee: Number(formData.sssEmployee) || 0,
          philhealthEmployee: Number(formData.philhealthEmployee) || 0,
          pagibigEmployee: Number(formData.pagibigEmployee) || 0,
          insuranceContribution: Number(formData.insuranceContribution) || 0,
          otherFixedDeductions: Number(formData.otherFixedDeductions) || 0,
        });
      }

      resetForm();
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleEdit = (emp) => {
    setEditingId(emp._id);
    setFormData({
      userId: emp.userId?._id || '',
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentId: emp.departmentId || '',
      positionId: emp.positionId || '',
      salary: emp.salary || '',
      hourlyRate: emp.hourlyRate || '',
      employmentStatus: emp.employmentStatus || 'training',
      offboardingStatus: emp.offboardingStatus || 'none',
      commissionRate: emp.commissionRate || 0.70,
      hasCommission: !!emp.commissionRate,
      staffType: emp.staffType || 'STAFF',
      roleId: emp.roleId?._id || emp.roleId || '',
      onboardingStatus: emp.onboardingStatus || 'IN_PROGRESS',
      emergencyContact: emp.emergencyContact || { name: '', relationship: '', phone: '' },
      dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '',
      hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
      documentLinks: emp.documentLinks || [],
    });
    
    // Fetch Deduction Profile
    api.get(`/api/deductions/${emp._id}`).then(({ data }) => {
      if (data._id) {
        setFormData(prev => ({
          ...prev,
          email: emp.userId?.email || '',
          password: '', // Keep empty unless changing
          monthlyTax: data.monthlyTax,
          sssEmployee: data.sssEmployee,
          philhealthEmployee: data.philhealthEmployee,
          pagibigEmployee: data.pagibigEmployee,
          insuranceContribution: data.insuranceContribution,
          otherFixedDeductions: data.otherFixedDeductions,
        }));
      }
    }).catch(console.error);

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to remove ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  const addDocument = () => {
    const name = prompt('Document Name (e.g. Contract, ID):');
    const url = prompt('Document URL / Link:');
    if (!name || !url) return;
    setFormData(prev => ({
      ...prev,
      documentLinks: [...prev.documentLinks, { name, url, uploadedAt: new Date().toISOString() }]
    }));
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documentLinks: prev.documentLinks.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ 
      userId: '', firstName: '', lastName: '', departmentId: '', positionId: '', 
      employmentStatus: 'training',
      offboardingStatus: 'none',
      salary: '', hourlyRate: '', commissionRate: 0.70, hasCommission: false, staffType: 'STAFF',
      roleId: '',
      onboardingStatus: 'IN_PROGRESS', dateOfBirth: '', hireDate: '', 
      emergencyContact: { name: '', relationship: '', phone: '' },
      documentLinks: [],
      createAccount: true, email: '', password: '',
      monthlyTax: 0, sssEmployee: 0, philhealthEmployee: 0, pagibigEmployee: 100,
      insuranceContribution: 0, otherFixedDeductions: 0,
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    // 1. Lifecycle Separation (Active vs Past)
    const offboarded = emp.offboardingStatus && emp.offboardingStatus !== 'none';
    if (isPastView && !offboarded) return false;
    if (!isPastView && offboarded) return false;

    const search = searchTerm.toLowerCase();
    return (
      emp.firstName?.toLowerCase().includes(search) ||
      emp.lastName?.toLowerCase().includes(search) ||
      emp.Department?.name?.toLowerCase().includes(search) ||
      emp.Position?.name?.toLowerCase().includes(search) ||
      emp.userId?.email?.toLowerCase().includes(search)
    );
  });


  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Employees</h1></div>
        <div className="loading-state">Loading team data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{isPastView ? '📁 Past Personnel' : '👥 Team Members'}</h1>
          <p className="page-subtitle">
            {isPastView 
              ? `${filteredEmployees.length} archived records found` 
              : `${filteredEmployees.length} active employee profiles`
            }
          </p>
        </div>
        <div className="header-actions">
          <div className="view-toggle" style={{ display: 'flex', background: 'var(--color-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <button className={`btn-sm ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} style={{ padding: '4px 12px', background: viewMode === 'table' ? 'white' : 'transparent', borderRadius: '6px', boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none' }}>▤ Table</button>
            <button className={`btn-sm ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} style={{ padding: '4px 12px', background: viewMode === 'card' ? 'white' : 'transparent', borderRadius: '6px', boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none' }}>🀅 Cards</button>
          </div>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={isPastView ? "Search archive..." : "Search team..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          {canManage && !isPastView && (
            <button 
              className="btn-primary btn-sm" 
              onClick={() => { 
                if (showForm) {
                  resetForm();
                  setEditingId(null);
                } else {
                  resetForm();
                  setShowForm(true);
                  setEditingId(null);
                }
              }}
            >
              {showForm ? 'Cancel' : '+ Add Employee'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="employee-form glass-panel" onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-primary-subtle)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
          <h3 className="form-section-title" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span>{editingId ? '📝 Edit Profile' : '👤 New Profile'}</span>
          </h3>
          <div className="account-section glass-panel" style={{ background: 'var(--color-primary-subtle)', padding: '1.25rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--color-primary-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔐</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>Account Credentials</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {editingId ? 'Update this employee\'s login details.' : 'Optionally create a unique portal account for this employee.'}
                  </p>
                </div>
              </div>

              {(!formData.userId) && (
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.createAccount} 
                    onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })} 
                  />
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Create Account?</span>
                </label>
              )}
            </div>

            {(formData.createAccount || formData.userId) && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="employee@work.com" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      required={formData.createAccount || formData.userId}
                    />
                  </div>
                  <div className="form-group">
                    <label>{formData.userId ? 'Change Password (optional)' : 'Temporary Password'}</label>
                    <input 
                      type="text" 
                      placeholder={formData.userId ? 'Leave blank to keep current' : 'Secure password'} 
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      required={formData.createAccount && !formData.userId}
                    />
                  </div>
                </div>

                <div className="setup-checklist" style={{ background: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.6)' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '0.05em' }}>Account Readiness Checklist</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { label: 'Identity Defined', checked: formData.firstName && formData.lastName },
                      { label: 'Structural Mapping', checked: formData.departmentId && formData.positionId },
                      { label: 'Valid Credentials', checked: formData.email && (formData.userId || formData.password) },
                      { label: 'Permissions Synced', checked: formData.roleId || formData.positionId }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: item.checked ? 'var(--color-success)' : 'var(--color-text-muted)', transition: 'all 0.3s ease' }}>
                        <span style={{ fontSize: '1rem' }}>{item.checked ? '✅' : '⭕'}</span>
                        <span style={{ fontWeight: item.checked ? '600' : '400' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="employee-form-grid">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 4' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', padding: '1.25rem', background: 'var(--color-bg-alt)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Staff Type</label>
                  <select 
                    className="select-input" 
                    value={formData.staffType} 
                    onChange={(e) => handleStaffTypeChange(e.target.value)}
                  >
                    <option value="STAFF">Standard Staff</option>
                    <option value="COACH">Coach / Trainer</option>
                    <option value="ADMIN">Office Admin</option>
                    <option value="MANAGEMENT">Management</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Administrative Role</label>
                  <select 
                    className="select-input" 
                    value={formData.roleId} 
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  >
                    <option value="">No Special Permissions</option>
                    {roles.map(role => (
                      <option key={role._id} value={role._id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Department</label>
                  <select 
                    className="select-input" 
                    value={formData.departmentId} 
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, positionId: '' })}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Position</label>
                  <select 
                    className="select-input" 
                    value={formData.positionId} 
                    onChange={(e) => handlePositionChange(e.target.value)}
                  >
                    <option value="">Select Position</option>
                    {positions
                      .filter(pos => !formData.departmentId || pos.departmentId === formData.departmentId)
                      .map(pos => (
                        <option key={pos._id} value={pos._id}>{pos.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Monthly Salary (₱)</label>
              <input type="number" placeholder="0.00" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Hourly Rate (₱)</label>
              <input type="number" placeholder="0.00" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Commission Rate</label>
                <input 
                  type="checkbox" 
                  checked={formData.hasCommission} 
                  onChange={(e) => setFormData({ ...formData, hasCommission: e.target.checked })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Enable?</span>
              </div>
              {formData.hasCommission && (
                <>
                  <input type="number" step="0.01" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} />
                  <small className="form-hint">e.g. 0.70 for 70/30 split</small>
                </>
              )}
            </div>
            <div className="form-group">
              <label>Hire Date</label>
              <input type="date" value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Employment Status</label>
              <select className="select-input" value={formData.employmentStatus} onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}>
                <option value="training">Training</option>
                <option value="probationary">Probationary</option>
                <option value="regular">Regular</option>
                <option value="contractual">Contractual</option>
                <option value="on_leave">On Leave</option>
              </select>
              <small className="form-hint">Tenure statuses auto-update based on hire date.</small>
            </div>
            
            <div className="form-group" style={{ 
              background: 'rgba(239, 68, 68, 0.05)', 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid rgba(239, 68, 68, 0.2)' 
            }}>
              <label style={{ color: '#dc2626', fontWeight: '700' }}>⚠️ Offboarding Action</label>
              <select 
                className="select-input" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#991b1b' }}
                value={formData.offboardingStatus} 
                onChange={(e) => setFormData({ ...formData, offboardingStatus: e.target.value })}
              >
                <option value="none">Active (No Action)</option>
                <option value="resigned">Personnel Resigned</option>
                <option value="terminated">Personnel Terminated</option>
                <option value="retired">Personnel Retired</option>
                <option value="contract_ended">End of Contract</option>
              </select>
              <small className="form-hint" style={{ color: '#dc2626' }}>Warning: Setting this marks the profile as non-active.</small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: '12px' }}>
            <div className="form-group" style={{ gridColumn: 'span 4' }}>
              <h4 className="form-subsection" style={{ margin: 0 }}>💰 Recurring Deductions (Tax & Insurance)</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Set fixed monthly amounts to override standard calculations.</p>
            </div>
            <div className="form-group">
              <label>Withholding Tax (₱)</label>
              <input type="number" value={formData.monthlyTax} onChange={(e) => setFormData({ ...formData, monthlyTax: e.target.value })} />
            </div>
            <div className="form-group">
              <label>SSS (₱)</label>
              <input type="number" value={formData.sssEmployee} onChange={(e) => setFormData({ ...formData, sssEmployee: e.target.value })} />
            </div>
            <div className="form-group">
              <label>PhilHealth (₱)</label>
              <input type="number" value={formData.philhealthEmployee} onChange={(e) => setFormData({ ...formData, philhealthEmployee: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Pag-IBIG (₱)</label>
              <input type="number" value={formData.pagibigEmployee} onChange={(e) => setFormData({ ...formData, pagibigEmployee: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
            <div>
              <h4 className="form-subsection">Digital Vault (Documents)</h4>
              <div className="document-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {formData.documentLinks.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No documents uploaded.</p>
                ) : (
                  formData.documentLinks.map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.85rem' }}>📄 {doc.name}</span>
                      <button type="button" onClick={() => removeDocument(idx)} style={{ color: 'var(--color-danger)' }}>✕</button>
                    </div>
                  ))
                )}
              </div>
              <button type="button" className="btn-filter btn-sm" onClick={addDocument}>+ Attach Document</button>
            </div>
            <div>
              <h4 className="form-subsection">Emergency Contact</h4>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input type="text" placeholder="Name" value={formData.emergencyContact.name} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })} />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input type="text" placeholder="Relationship" value={formData.emergencyContact.relationship} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })} />
              </div>
              <div className="form-group">
                <input type="text" placeholder="Phone" value={formData.emergencyContact.phone} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Profile'}</button>
            <button type="button" className="btn-filter" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {filteredEmployees.length === 0 ? (
        <div className="panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>{isPastView ? '📁' : '👥'}</div>
          <h3>{isPastView ? 'No past personnel found' : 'No active employees found'}</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>{isPastView ? 'Historical records of offboarded staff will appear here.' : 'Add your first team member to get started.'}</p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Position</th>
                <th>Salary/Rate</th>
                <th>Comm.</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const offKey = emp.offboardingStatus && emp.offboardingStatus !== 'none' ? emp.offboardingStatus : emp.employmentStatus;
                const statusInfo = STATUS_BADGE[offKey] || STATUS_BADGE.training;
                return (
                  <tr key={emp._id}>
                    <td className="cell-primary">
                      <div className="employee-cell">
                        <div className="emp-avatar" style={{ background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}>{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700' }}>{emp.firstName} {emp.lastName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{emp.userId?.email}</span>
                        </div>
                      </div>
                    </td>
                      <td>
                        <div className="font-medium">{emp.Position?.name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{emp.Department?.name || 'No Dept'}</div>
                      </td>
                  <td>
                      {emp.salary > 0 ? `₱${Number(emp.salary).toLocaleString()}/mo` : emp.hourlyRate > 0 ? `₱${Number(emp.hourlyRate).toLocaleString()}/hr` : '—'}
                    </td>
                    <td>{emp.commissionRate ? `${emp.commissionRate * 100}%` : '—'}</td>
                    <td>
                      <span className={`badge ${statusInfo.className}`} style={{ borderRadius: '20px', padding: '2px 10px' }}>{statusInfo.label}</span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="action-group">
                          <button className="btn-sm btn-view" onClick={() => handleEdit(emp)}>Edit</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="employee-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredEmployees.map(emp => {
            const offKey = emp.offboardingStatus && emp.offboardingStatus !== 'none' ? emp.offboardingStatus : emp.employmentStatus;
            const statusInfo = STATUS_BADGE[offKey] || STATUS_BADGE.training;
            return (
              <div key={emp._id} className="panel stat-card" style={{ display: 'block', padding: '1.5rem', cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div className="emp-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}>{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                  <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{emp.firstName} {emp.lastName}</h3>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{emp.Position?.name || 'Staff member'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Dept:</span>
                    <span style={{ fontWeight: '600' }}>{emp.Department?.name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Pay:</span>
                    <span style={{ fontWeight: '600' }}>{emp.salary > 0 ? `₱${Number(emp.salary).toLocaleString()}` : emp.hourlyRate > 0 ? `₱${Number(emp.hourlyRate).toLocaleString()}/hr` : '—'}</span>
                  </div>
                  {emp.commissionRate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Commission:</span>
                      <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{emp.commissionRate * 100}%</span>
                    </div>
                  )}
                </div>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {emp.documentLinks?.length > 0 && <span title={`${emp.documentLinks.length} documents`} style={{ fontSize: '1.1rem' }}>📂</span>}
                    {emp.onboardingStatus === 'COMPLETED' ? <span title="Verified" style={{ fontSize: '1.1rem' }}>✅</span> : <span title="Onboarding" style={{ fontSize: '1.1rem' }}>⏳</span>}
                  </div>
                  {canManage && (
                    <div className="action-group">
                      <button className="btn-sm btn-view" onClick={() => handleEdit(emp)}>Edit</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}
</div>
  );

}
