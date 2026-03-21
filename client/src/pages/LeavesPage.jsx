import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function LeavesPage() {
  const { user, hasPermission } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchLeaves = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const { data } = await api.get(`/api/leaves${params}`);
      setLeaves(data.requests || []);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
      if (user?.employeeProfileId) {
        setEmployees([{
          _id: user.employeeProfileId,
          firstName: user.employeeName?.split(' ')[0] || 'Me',
          lastName: user.employeeName?.split(' ').slice(1).join(' ') || ''
        }]);
        setFormData(prev => ({ ...prev, employeeId: user.employeeProfileId }));
      }
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, [filter, user]);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/leaves/${id}/${action}`);
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} leave`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/leaves', formData);
      setShowForm(false);
      setFormData({ employeeId: '', leaveType: 'vacation', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
    };
    return map[status] || 'badge-muted';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Leave Requests</h1>
          <p className="page-subtitle">Submit and manage employee time-off</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button
                key={f}
                className={`btn-filter ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setIsLoading(true); }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Request Leave'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="payslip-form" onSubmit={handleSubmit}>
          <h3 className="form-section-title">New Leave Request</h3>
          <div className="payslip-form-grid">

            <div className="form-group">
              <label>Leave Type</label>
              <select 
                className="select-input" 
                value={formData.leaveType} 
                onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
              >
                <option value="vacation">Vacation</option>
                <option value="sick">Sick</option>
                <option value="bereavement">Bereavement</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input 
                type="date" 
                value={formData.startDate} 
                onChange={(e) => setFormData({...formData, startDate: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input 
                type="date" 
                value={formData.endDate} 
                onChange={(e) => setFormData({...formData, endDate: e.target.value})} 
                required 
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Reason (Optional)</label>
            <input 
              type="text" 
              placeholder="E.g., Family vacation..." 
              value={formData.reason} 
              onChange={(e) => setFormData({...formData, reason: e.target.value})} 
            />
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="loading-state">Loading leave requests...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No leave requests found.</td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td className="cell-primary">
                      {leave.employeeId?.firstName} {leave.employeeId?.lastName}
                    </td>
                    <td>
                      <span className="badge badge-primary">{leave.leaveType}</span>
                    </td>
                    <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                    <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>
                      {leave.status === 'pending' && hasPermission('manage_leaves') && (
                        <div className="action-group">
                          <button
                            className="btn-sm btn-success"
                            onClick={() => handleAction(leave._id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-sm btn-danger"
                            onClick={() => handleAction(leave._id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
