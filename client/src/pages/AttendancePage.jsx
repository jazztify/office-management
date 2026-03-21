import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('today');

  // HR view states
  const [allRecords, setAllRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [hrLoading, setHrLoading] = useState(false);

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
      await Promise.all([fetchTodayRecord(), fetchHistory(), fetchEmployees()]);
      setIsLoading(false);
    };
    load();
  }, [fetchTodayRecord, fetchHistory, fetchEmployees]);

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
      alert(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
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
        {isHR && (
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            👥 All Employees
          </button>
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
                  </>
                ) : (
                  <div style={{ color: 'var(--color-success)', fontSize: '1.1rem', fontWeight: '600' }}>
                    ✅ Your work day is complete!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Timeline */}
          <div className="dashboard-panels">
            <div className="panel">
              <div className="panel-title">Today's Timeline</div>
              <div className="panel-body">
                <div className="attendance-timeline">
                  <TimelineStep
                    label="Clock In"
                    icon="⏱️"
                    time={formatTime(todayRecord?.clockIn)}
                    expected={officeStart}
                    isActive={!!todayRecord?.clockIn}
                  />
                  <TimelineStep
                    label="Lunch Out"
                    icon="🍔"
                    time={formatTime(todayRecord?.lunchOut)}
                    expected={lunchStartTime}
                    isActive={!!todayRecord?.lunchOut}
                  />
                  <TimelineStep
                    label="Lunch In"
                    icon="🔙"
                    time={formatTime(todayRecord?.lunchIn)}
                    expected={lunchEndTime}
                    isActive={!!todayRecord?.lunchIn}
                  />
                  <TimelineStep
                    label="Clock Out"
                    icon="🚪"
                    time={formatTime(todayRecord?.clockOut)}
                    expected={officeEnd}
                    isActive={!!todayRecord?.clockOut}
                  />
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
