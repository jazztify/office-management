import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_BADGE = {
  training: { label: 'Training', className: 'badge-warning' },
  probationary: { label: 'Probationary', className: 'badge-info' },
  regular: { label: 'Regular', className: 'badge-success' },
};

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    userId: '', firstName: '', lastName: '', department: '', position: '', salary: '',
    dateOfBirth: '', hireDate: '',
  });

  const canManage = hasPermission('manage_employees') || hasPermission('*');

  useEffect(() => {
    fetchEmployees();
    if (canManage) fetchUsers();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      setEmployees(data);
    } catch (err) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        department: formData.department,
        position: formData.position,
        salary: Number(formData.salary) || 0,
        dateOfBirth: formData.dateOfBirth || null,
        hireDate: formData.hireDate || null,
      };

      if (editingId) {
        await api.patch(`/api/employees/${editingId}`, payload);
      } else {
        await api.post('/api/employees', { ...payload, userId: formData.userId });
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
      department: emp.department || '',
      position: emp.position || '',
      salary: emp.salary || '',
      dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '',
      hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
    });
    setShowForm(true);
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

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ userId: '', firstName: '', lastName: '', department: '', position: '', salary: '', dateOfBirth: '', hireDate: '' });
  };

  const filteredEmployees = employees.filter((emp) => {
    const search = searchTerm.toLowerCase();
    return (
      emp.firstName?.toLowerCase().includes(search) ||
      emp.lastName?.toLowerCase().includes(search) ||
      emp.department?.toLowerCase().includes(search) ||
      emp.position?.toLowerCase().includes(search) ||
      emp.userId?.email?.toLowerCase().includes(search)
    );
  });

  // Get users that don't already have an employee profile
  const availableUsers = users.filter(u =>
    !employees.some(emp => emp.userId?._id === u._id)
  );

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Employees</h1></div>
        <div className="loading-state">Loading employee data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>👥 Employees</h1>
          <p className="page-subtitle">{employees.length} team members in your workspace</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          {canManage && (
            <button className="btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
              {showForm && !editingId ? 'Cancel' : '+ Add Employee'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="employee-form" onSubmit={handleSubmit}>
          <h3 className="form-section-title">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
          <div className="employee-form-grid">
            {!editingId && (
              <div className="form-group">
                <label>Link to User Account</label>
                <select
                  className="select-input"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                >
                  <option value="">Select a user account</option>
                  {availableUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.email}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>First Name</label>
              <input type="text" placeholder="First name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" placeholder="Last name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input type="text" placeholder="e.g. Engineering" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input type="text" placeholder="e.g. Senior Developer" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Salary (₱)</label>
              <input type="number" placeholder="0.00" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} />
            </div>
            <div className="form-group">
              <label>🎂 Date of Birth</label>
              <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            </div>
            <div className="form-group">
              <label>📅 Hire Date</label>
              <input type="date" value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
              <small className="form-hint">Training: 0-1mo → Probationary: 1-6mo → Regular: 6mo+</small>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Add Employee'}</button>
            {editingId && <button type="button" className="btn-filter" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Position</th>
              <th>Salary</th>
              <th>Birthday</th>
              <th>Hire Date</th>
              <th>Emp. Status</th>
              <th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 10 : 9} className="empty-state">
                  {searchTerm ? 'No employees match your search.' : 'No employees found in this workspace.'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const statusInfo = STATUS_BADGE[emp.employmentStatus] || STATUS_BADGE.training;
                return (
                  <tr key={emp._id}>
                    <td className="cell-primary">
                      <div className="employee-cell">
                        <div className="emp-avatar">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                        <span>{emp.firstName} {emp.lastName}</span>
                      </div>
                    </td>
                    <td>{emp.userId?.email || '—'}</td>
                    <td><span className="badge badge-muted">{emp.department || 'Unassigned'}</span></td>
                    <td>{emp.position || '—'}</td>
                    <td className="cell-money">
                      {emp.salary ? `₱${Number(emp.salary).toLocaleString()}` : '—'}
                    </td>
                    <td>{emp.dateOfBirth ? formatDate(emp.dateOfBirth) : '—'}</td>
                    <td>{emp.hireDate ? formatDate(emp.hireDate) : '—'}</td>
                    <td>
                      <span className={`badge ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${emp.userId?.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                        {emp.userId?.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="action-group">
                          <button className="btn-sm btn-view" onClick={() => handleEdit(emp)}>Edit</button>
                          <button
                            className="btn-sm btn-danger"
                            onClick={() => handleDelete(emp._id, `${emp.firstName} ${emp.lastName}`)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
