import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function AttendanceLogsPage() {
  const { user } = useAuth();
  const [allRecords, setAllRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/api/attendance/employees-list');
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  }, []);

  const fetchAllRecords = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = {};
      if (filterEmployee) params.employeeId = filterEmployee;
      if (filterDate) {
        params.startDate = filterDate;
        params.endDate = filterDate;
      }
      const { data } = await api.get('/api/attendance', { params });
      setAllRecords(data.records || []);
    } catch (err) {
      console.error('Failed to load attendance logs', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [filterEmployee, filterDate]);

  useEffect(() => {
    const init = async () => {
      await fetchEmployees();
      await fetchAllRecords();
    };
    init();
  }, [fetchEmployees, fetchAllRecords]);

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

  if (isLoading) {
    return <div className="page-container"><div className="loading-state">Loading global logs...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>👥 Global Attendance Logs</h1>
          <p className="page-subtitle">Centralized oversight of workforce clock-in/out activities.</p>
        </div>
      </div>

      <div className="dashboard-panels" style={{ marginBottom: '1.5rem' }}>
        <div className="panel">
          <div className="panel-title">Filter Log Data</div>
          <div className="panel-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ minWidth: '200px' }}>
              <label>Employee Name</label>
              <select className="select-input" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                <option value="">All Personnel</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: '180px' }}>
              <label>Target Date</label>
              <input type="date" className="select-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ height: '42px' }} onClick={fetchAllRecords} disabled={isRefreshing}>
              {isRefreshing ? '🔍 Searching...' : '🔍 Fetch Logs'}
            </button>
            {(filterEmployee || filterDate) && (
              <button className="btn-filter" style={{ height: '42px' }} onClick={() => { setFilterEmployee(''); setFilterDate(''); }}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="table-container shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Department</th>
              <th>Date</th>
              <th>Clock In</th>
              <th>Lunch Break</th>
              <th>Clock Out</th>
              <th>Work Hours</th>
              <th>Late</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allRecords.length === 0 ? (
              <tr><td colSpan="9" className="empty-state">No attendance logs found matching the filters.</td></tr>
            ) : (
              allRecords.map((rec) => {
                const statusBadge = getStatusBadge(rec.status);
                const lunchTime = (rec.lunchOut && rec.lunchIn) 
                  ? `${formatTime(rec.lunchOut)} - ${formatTime(rec.lunchIn)}`
                  : (rec.lunchOut ? 'Break Started' : '—');

                return (
                  <tr key={rec._id}>
                    <td className="cell-primary">
                      <div style={{ fontWeight: '600' }}>{rec.employeeProfile?.firstName} {rec.employeeProfile?.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{rec.employeeProfile?.Position?.name || 'Staff'}</div>
                    </td>
                    <td>{rec.employeeProfile?.Department?.name || '—'}</td>
                    <td>{formatDate(rec.date)}</td>
                    <td>{formatTime(rec.clockIn)}</td>
                    <td style={{ fontSize: '0.85rem' }}>{lunchTime}</td>
                    <td>{formatTime(rec.clockOut)}</td>
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{rec.totalWorkHours || 0}h</td>
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
      </div>
    </div>
  );
}
