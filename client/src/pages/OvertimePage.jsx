import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function OvertimePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: '', startTime: '17:00', endTime: '21:00', hoursRequested: '', reason: ''
  });

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const canManage = user?.permissions?.includes('manage_leaves') || user?.permissions?.includes('*');

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/api/overtime');
      setRequests(data);
    } catch (error) {
      console.error('Failed to load OT', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Auto-calculate hours from start/end time
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) {
        setFormData(prev => ({ ...prev, hoursRequested: Math.round(diff / 60 * 100) / 100 }));
      }
    }
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/overtime', formData);
      setShowModal(false);
      setFormData({ date: '', startTime: '17:00', endTime: '21:00', hoursRequested: '', reason: '' });
      fetchRequests();
      alert('Overtime request submitted! Waiting for HR approval.');
    } catch (error) {
      alert(error.response?.data?.error || 'Submission failed');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const body = { status };
      if (status === 'rejected') {
        body.rejectionReason = rejectionReason;
      }
      await api.patch(`/api/overtime/${id}/status`, body);
      fetchRequests();
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const openRejectModal = (id) => {
    setRejectId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>⏳ Overtime Requests</h1>
          <p className="page-subtitle">
            {canManage
              ? 'Review and manage overtime requests from employees'
              : 'Request overtime and track approval status'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Request Overtime
        </button>
      </div>

      {/* Info Banner */}
      <div className="panel" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--color-primary-faded) 0%, var(--color-info-faded) 100%)' }}>
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <div>
            <strong>How Overtime Works</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Employees file an overtime request → HR reviews and approves/rejects → Approved OT is counted in payroll at the configured rate (default 125% of regular rate for PH standard).
            </p>
          </div>
        </div>
      </div>

      {/* Request Overtime Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📝 Request Overtime</h2>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="panel-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Date of Overtime</label>
                <input type="date" className="select-input" required
                  value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" className="select-input" required
                    value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" className="select-input" required
                    value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Total Hours: <strong>{formData.hoursRequested || 0}</strong></label>
                <input type="hidden" value={formData.hoursRequested} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Reason / Justification</label>
                <textarea className="select-input" required rows="3" placeholder="Explain why overtime is needed..."
                  value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit Request</button>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>❌ Reject Overtime</h2>
              <button className="btn-ghost" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <div className="panel-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Reason for Rejection (optional)</label>
                <textarea className="select-input" rows="3" placeholder="Explain why this request was rejected..."
                  value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-danger" style={{ flex: 1 }} onClick={() => updateStatus(rejectId, 'rejected')}>
                  Confirm Rejection
                </button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Table */}
      {isLoading ? (
        <div className="loading-state">Loading records...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Time</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? "7" : "6"} className="empty-state">No overtime requests found</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req._id}>
                    <td className="cell-primary">
                      {req.employeeId?.firstName} {req.employeeId?.lastName}
                    </td>
                    <td>{new Date(req.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {req.startTime || '—'} → {req.endTime || '—'}
                    </td>
                    <td style={{ fontWeight: '600' }}>{req.hoursRequested} hrs</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.reason}>
                      {req.reason}
                    </td>
                    <td>
                      <span className={`badge badge-${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {getStatusIcon(req.status)} {req.status}
                      </span>
                      {req.status === 'rejected' && req.rejectionReason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                          {req.rejectionReason}
                        </div>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-success" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => updateStatus(req._id, 'approved')}>✓ Approve</button>
                            <button className="btn-danger" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => openRejectModal(req._id)}>✕ Reject</button>
                          </div>
                        )}
                        {req.status !== 'pending' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {req.approvedBy ? `by ${req.approvedBy.firstName}` : '—'}
                          </span>
                        )}
                      </td>
                    )}
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
