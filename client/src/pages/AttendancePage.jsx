import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [settings, setSettings] = useState({});
  const [earlyOutApproval, setEarlyOutApproval] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('today');

  // Early out / half day request
  const [showEarlyOutForm, setShowEarlyOutForm] = useState(false);
  const [earlyOutForm, setEarlyOutForm] = useState({ requestType: 'early_out', reason: '', requestedClockOut: '' });
  const [earlyOutRequests, setEarlyOutRequests] = useState([]);
  const [earlyOutLoading, setEarlyOutLoading] = useState(false);

  // HR view states
  const [allRecords, setAllRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [hrLoading, setHrLoading] = useState(false);

  // HR: pending early-out requests
  const [pendingEarlyOuts, setPendingEarlyOuts] = useState([]);

  const isHR = user?.permissions?.includes('manage_employees') || user?.permissions?.includes('*');

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayRecord = useCallback(async () => {
    try {
      const { data } = await api.get('/api/attendance/my-today');
      setTodayRecord(data.record);
      setSettings(data.settings || {});
      setEarlyOutApproval(data.earlyOutApproval || null);
    } catch (err) {
      console.error('Failed to load today record', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/api/attendance/my-history');
      setHistory(data.records || []);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  }, []);

  const fetchEarlyOutRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/api/early-out');
      setEarlyOutRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load early-out requests', err);
    }
  }, []);

  const fetchPendingEarlyOuts = useCallback(async () => {
    if (!isHR) return;
    try {
      const { data } = await api.get('/api/early-out?status=pending');
      setPendingEarlyOuts(data.requests || []);
    } catch (err) {
      console.error('Failed to load pending early-outs', err);
    }
  }, [isHR]);

  const fetchAllRecords = useCallback(async () => {
    if (!isHR) return;
    setHrLoading(true);
    try {
      const params = {};
      if (filterEmployee) params.employeeId = filterEmployee;
      if (filterDate) params.startDate = filterDate;
      if (filterDate) params.endDate = filterDate;
      const { data } = await api.get('/api/attendance', { params });
      setAllRecords(data.records || []);
    } catch (err) {
      console.error('Failed to load all records', err);
    } finally {
      setHrLoading(false);
    }
  }, [isHR, filterEmployee, filterDate]);

  const fetchEmployees = useCallback(async () => {
    if (!isHR) return;
    try {
      const { data } = await api.get('/api/attendance/employees-list');
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  }, [isHR]);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTodayRecord(), fetchHistory(), fetchEmployees(), fetchEarlyOutRequests(), fetchPendingEarlyOuts()]);
      setIsLoading(false);
    };
    load();
  }, [fetchTodayRecord, fetchHistory, fetchEmployees, fetchEarlyOutRequests, fetchPendingEarlyOuts]);

  useEffect(() => {
    if (activeTab === 'all' && isHR) {
      fetchAllRecords();
    }
  }, [activeTab, isHR, fetchAllRecords]);

  const handlePunch = async (action) => {
    setActionLoading(true);
    try {
      await api.post('/api/attendance/punch', { action });
      await fetchTodayRecord();
      await fetchHistory();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.requiresApproval) {
        if (confirm('You need an approved early-out or half-day request to clock out early. Would you like to submit a request now?')) {
          setShowEarlyOutForm(true);
        }
      } else {
        alert(errData?.error || `Failed to ${action}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEarlyOutSubmit = async (e) => {
    e.preventDefault();
    setEarlyOutLoading(true);
    try {
      const today = new Date();
      const pht = new Date(today.getTime() + (8 * 60 * 60 * 1000));
      const dateStr = pht.toISOString().split('T')[0];

      await api.post('/api/early-out', {
        date: dateStr,
        requestType: earlyOutForm.requestType,
        reason: earlyOutForm.reason,
        requestedClockOut: earlyOutForm.requestedClockOut || null,
      });

      alert(`${earlyOutForm.requestType === 'early_out' ? 'Early out' : 'Half day'} request submitted! Waiting for HR/Admin approval.`);
      setShowEarlyOutForm(false);
      setEarlyOutForm({ requestType: 'early_out', reason: '', requestedClockOut: '' });
      fetchEarlyOutRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setEarlyOutLoading(false);
    }
  };

  const handleEarlyOutAction = async (id, status, rejectionReason = '') => {
    try {
      await api.patch(`/api/early-out/${id}/status`, { status, rejectionReason });
      fetchPendingEarlyOuts();
      fetchEarlyOutRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update request');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-PH', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getNextAction = () => {
    if (!todayRecord) return 'clock-in';
    if (!todayRecord.clockIn) return 'clock-in';
    if (todayRecord.clockOut) return null; // Day complete
    if (!todayRecord.lunchOut) return 'lunch-out';
    if (!todayRecord.lunchIn) return 'lunch-in';
    return 'clock-out';
  };

  const getActionConfig = (action) => {
    const configs = {
      'clock-in': { label: '⏱️ Clock In', className: 'btn-success', desc: 'Start your work day' },
      'lunch-out': { label: '🍔 Lunch Break', className: 'btn-warning-solid', desc: 'Go on lunch break' },
      'lunch-in': { label: '🔙 Back from Lunch', className: 'btn-info-solid', desc: 'Return from lunch' },
      'clock-out': { label: '🚪 Clock Out', className: 'btn-danger', desc: 'End your work day' },
    };
    return configs[action] || {};
  };

  const getStatusBadge = (status) => {
    const map = {
      complete: { class: 'badge-success', label: '✓ Complete' },
      incomplete: { class: 'badge-warning', label: '⏳ Incomplete' },
      half_day: { class: 'badge-info', label: '½ Half Day' },
      absent: { class: 'badge-danger', label: '✕ Absent' },
      on_leave: { class: 'badge-primary', label: '🏖️ On Leave' },
    };
    return map[status] || { class: 'badge-muted', label: status };
  };

  const getRequestStatusBadge = (status) => {
    const map = {
      pending: { class: 'badge-warning', label: '⏳ Pending' },
      approved: { class: 'badge-success', label: '✅ Approved' },
      rejected: { class: 'badge-danger', label: '❌ Rejected' },
    };
    return map[status] || { class: 'badge-muted', label: status };
  };

  const nextAction = getNextAction();
  const officeStart = settings?.officeHours?.start || '08:00';
  const officeEnd = settings?.officeHours?.end || '17:00';
  const lunchStartTime = settings?.officeHours?.lunchStart || '12:00';
  const lunchEndTime = settings?.officeHours?.lunchEnd || '13:00';

  if (isLoading) {
    return <div className="page-container"><div className="loading-state">Loading attendance...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📅 Attendance</h1>
          <p className="page-subtitle">Philippine Standard: {officeStart} – {lunchStartTime} | Lunch {lunchStartTime} – {lunchEndTime} | {lunchEndTime} – {officeEnd}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>
          🕐 My Today
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📋 My History
        </button>
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          🚪 Early Out / Half Day
          {earlyOutRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="tab-badge">{earlyOutRequests.filter(r => r.status === 'pending').length}</span>
          )}
        </button>
        {isHR && (
          <>
            <button className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
              ✅ Approve Requests
              {pendingEarlyOuts.length > 0 && <span className="tab-badge">{pendingEarlyOuts.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
              👥 All Employees
            </button>
          </>
        )}
      </div>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <>
          {/* Live Clock */}
          <div className="dashboard-panels" style={{ marginBottom: '1.5rem' }}>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-primary)', letterSpacing: '2px' }}>
                {currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {currentTime.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {earlyOutApproval && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', background: 'var(--color-success-bg, rgba(46,204,113,0.1))', borderRadius: '8px', display: 'inline-block' }}>
                  ✅ You have an approved {earlyOutApproval.requestType === 'early_out' ? 'early out' : 'half day'} today
                </div>
              )}
            </div>
          </div>

          {/* Punch Button */}
          <div className="dashboard-panels" style={{ marginBottom: '1.5rem' }}>
            <div className="panel">
              <div className="panel-title">Time Clock</div>
              <div className="panel-body" style={{ textAlign: 'center', padding: '2rem' }}>
                {nextAction ? (
                  <>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                      {getActionConfig(nextAction).desc}
                    </p>
                    <button
                      className={getActionConfig(nextAction).className}
                      style={{ fontSize: '1.2rem', padding: '1rem 3rem', borderRadius: '12px', minWidth: '240px' }}
                      disabled={actionLoading}
                      onClick={() => handlePunch(nextAction)}
                    >
                      {actionLoading ? '⏳ Processing...' : getActionConfig(nextAction).label}
                    </button>
                    {nextAction === 'clock-out' && !earlyOutApproval && (
                      <div style={{ marginTop: '1rem' }}>
                        <button
                          className="btn-filter btn-sm"
                          onClick={() => setShowEarlyOutForm(true)}
                        >
                          📝 Request Early Out / Half Day
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--color-success)', fontSize: '1.1rem', fontWeight: '600' }}>
                    ✅ Your work day is complete!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Early Out Request Form (modal-like) */}
          {showEarlyOutForm && (
            <div className="dashboard-panels" style={{ marginBottom: '1.5rem' }}>
              <div className="panel" style={{ border: '2px solid var(--color-primary)' }}>
                <div className="panel-title">📝 Request Early Out / Half Day</div>
                <div className="panel-body">
                  <form onSubmit={handleEarlyOutSubmit}>
                    <div className="employee-form-grid">
                      <div className="form-group">
                        <label>Request Type</label>
                        <select
                          className="select-input"
                          value={earlyOutForm.requestType}
                          onChange={e => setEarlyOutForm({ ...earlyOutForm, requestType: e.target.value })}
                        >
                          <option value="early_out">🚪 Early Out</option>
                          <option value="half_day">🌗 Half Day</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Requested Clock Out Time</label>
                        <input
                          type="time"
                          value={earlyOutForm.requestedClockOut}
                          onChange={e => setEarlyOutForm({ ...earlyOutForm, requestedClockOut: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Reason *</label>
                        <textarea
                          placeholder="Explain why you need to leave early..."
                          value={earlyOutForm.reason}
                          onChange={e => setEarlyOutForm({ ...earlyOutForm, reason: e.target.value })}
                          style={{ minHeight: '80px', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary" disabled={earlyOutLoading}>
                        {earlyOutLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button type="button" className="btn-filter" onClick={() => setShowEarlyOutForm(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Today's Timeline */}
          <div className="dashboard-panels">
            <div className="panel">
              <div className="panel-title">Today's Timeline</div>
              <div className="panel-body">
                <div className="attendance-timeline">
                  <TimelineStep label="Clock In" icon="⏱️" time={formatTime(todayRecord?.clockIn)} expected={officeStart} isActive={!!todayRecord?.clockIn} />
                  <TimelineStep label="Lunch Out" icon="🍔" time={formatTime(todayRecord?.lunchOut)} expected={lunchStartTime} isActive={!!todayRecord?.lunchOut} />
                  <TimelineStep label="Lunch In" icon="🔙" time={formatTime(todayRecord?.lunchIn)} expected={lunchEndTime} isActive={!!todayRecord?.lunchIn} />
                  <TimelineStep label="Clock Out" icon="🚪" time={formatTime(todayRecord?.clockOut)} expected={officeEnd} isActive={!!todayRecord?.clockOut} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Lunch Out</th>
                <th>Lunch In</th>
                <th>Clock Out</th>
                <th>Work Hrs</th>
                <th>Late</th>
                <th>Undertime</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="9" className="empty-state">No attendance records found yet.</td></tr>
              ) : (
                history.map((rec) => {
                  const statusBadge = getStatusBadge(rec.status);
                  return (
                    <tr key={rec._id}>
                      <td className="cell-primary">{formatDate(rec.date)}</td>
                      <td>{formatTime(rec.clockIn)}</td>
                      <td>{formatTime(rec.lunchOut)}</td>
                      <td>{formatTime(rec.lunchIn)}</td>
                      <td>{formatTime(rec.clockOut)}</td>
                      <td style={{ fontWeight: '600' }}>{rec.totalWorkHours || 0}h</td>
                      <td style={{ color: rec.lateMinutes > 0 ? 'var(--color-danger)' : 'inherit' }}>
                        {rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '—'}
                      </td>
                      <td style={{ color: rec.undertimeMinutes > 0 ? 'var(--color-warning)' : 'inherit' }}>
                        {rec.undertimeMinutes > 0 ? `${rec.undertimeMinutes}m` : '—'}
                      </td>
                      <td><span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* EARLY OUT / HALF DAY REQUESTS TAB */}
      {activeTab === 'requests' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn-primary btn-sm" onClick={() => setShowEarlyOutForm(true)}>
              + New Request
            </button>
          </div>

          {showEarlyOutForm && (
            <div className="dashboard-panels" style={{ marginBottom: '1.5rem' }}>
              <div className="panel" style={{ border: '2px solid var(--color-primary)' }}>
                <div className="panel-title">📝 New Early Out / Half Day Request</div>
                <div className="panel-body">
                  <form onSubmit={handleEarlyOutSubmit}>
                    <div className="employee-form-grid">
                      <div className="form-group">
                        <label>Request Type</label>
                        <select className="select-input" value={earlyOutForm.requestType} onChange={e => setEarlyOutForm({ ...earlyOutForm, requestType: e.target.value })}>
                          <option value="early_out">🚪 Early Out</option>
                          <option value="half_day">🌗 Half Day</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Requested Clock Out Time</label>
                        <input type="time" value={earlyOutForm.requestedClockOut} onChange={e => setEarlyOutForm({ ...earlyOutForm, requestedClockOut: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Reason *</label>
                        <textarea
                          placeholder="Explain why you need to leave early..."
                          value={earlyOutForm.reason}
                          onChange={e => setEarlyOutForm({ ...earlyOutForm, reason: e.target.value })}
                          style={{ minHeight: '80px', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary" disabled={earlyOutLoading}>{earlyOutLoading ? 'Submitting...' : 'Submit Request'}</button>
                      <button type="button" className="btn-filter" onClick={() => setShowEarlyOutForm(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Clock Out</th>
                  <th>Status</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {earlyOutRequests.length === 0 ? (
                  <tr><td colSpan="6" className="empty-state">No early out or half day requests yet.</td></tr>
                ) : (
                  earlyOutRequests.map((req) => {
                    const statusBadge = getRequestStatusBadge(req.status);
                    return (
                      <tr key={req._id}>
                        <td className="cell-primary">{formatDate(req.date)}</td>
                        <td><span className="badge badge-info">{req.requestType === 'early_out' ? '🚪 Early Out' : '🌗 Half Day'}</span></td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                        <td>{req.requestedClockOut || '—'}</td>
                        <td><span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span></td>
                        <td>{req.approvedBy ? `${req.approvedBy.firstName} ${req.approvedBy.lastName}` : '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* HR: APPROVE EARLY OUT REQUESTS */}
      {activeTab === 'approvals' && isHR && (
        <div className="table-container">
          <h3 style={{ marginBottom: '1rem' }}>Pending Early Out / Half Day Requests</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Clock Out</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingEarlyOuts.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No pending requests. 🎉</td></tr>
              ) : (
                pendingEarlyOuts.map((req) => (
                  <tr key={req._id}>
                    <td className="cell-primary">{req.employeeId?.firstName} {req.employeeId?.lastName}</td>
                    <td>{formatDate(req.date)}</td>
                    <td><span className="badge badge-info">{req.requestType === 'early_out' ? '🚪 Early Out' : '🌗 Half Day'}</span></td>
                    <td style={{ maxWidth: '250px' }}>{req.reason}</td>
                    <td>{req.requestedClockOut || '—'}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn-sm btn-success" onClick={() => handleEarlyOutAction(req._id, 'approved')}>Approve</button>
                        <button className="btn-sm btn-danger" onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          handleEarlyOutAction(req._id, 'rejected', reason || '');
                        }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* HR: ALL EMPLOYEES TAB */}
      {activeTab === 'all' && isHR && (
        <>
          <div className="dashboard-panels" style={{ marginBottom: '1.5rem' }}>
            <div className="panel">
              <div className="panel-title">Filter Records</div>
              <div className="panel-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ minWidth: '200px' }}>
                  <label>Employee</label>
                  <select className="select-input" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: '180px' }}>
                  <label>Date</label>
                  <input type="date" className="select-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                </div>
                <button className="btn-primary" style={{ height: '42px' }} onClick={fetchAllRecords}>
                  🔍 Search
                </button>
              </div>
            </div>
          </div>

          <div className="table-container">
            {hrLoading ? (
              <div className="loading-state">Loading records...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Lunch Out</th>
                    <th>Lunch In</th>
                    <th>Clock Out</th>
                    <th>Work Hrs</th>
                    <th>Late</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecords.length === 0 ? (
                    <tr><td colSpan="10" className="empty-state">No records found.</td></tr>
                  ) : (
                    allRecords.map((rec) => {
                      const statusBadge = getStatusBadge(rec.status);
                      return (
                        <tr key={rec._id}>
                          <td className="cell-primary">{rec.employeeId?.firstName} {rec.employeeId?.lastName}</td>
                          <td>{rec.employeeId?.department || '—'}</td>
                          <td>{formatDate(rec.date)}</td>
                          <td>{formatTime(rec.clockIn)}</td>
                          <td>{formatTime(rec.lunchOut)}</td>
                          <td>{formatTime(rec.lunchIn)}</td>
                          <td>{formatTime(rec.clockOut)}</td>
                          <td style={{ fontWeight: '600' }}>{rec.totalWorkHours || 0}h</td>
                          <td style={{ color: rec.lateMinutes > 0 ? 'var(--color-danger)' : 'inherit' }}>
                            {rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '—'}
                          </td>
                          <td><span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TimelineStep({ label, icon, time, expected, isActive, isLate, lateInfo }) {
  return (
    <div className={`timeline-step ${isActive ? 'active' : ''} ${isLate ? 'late' : ''}`}>
      <div className="timeline-dot">
        <span>{icon}</span>
      </div>
      <div className="timeline-content">
        <div className="timeline-label">{label}</div>
        <div className="timeline-time">{time}</div>
        <div className="timeline-expected">Expected: {expected}</div>
        {lateInfo && <div className="timeline-late">{lateInfo}</div>}
      </div>
    </div>
  );
}
