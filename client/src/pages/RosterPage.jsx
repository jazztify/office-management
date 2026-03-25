import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RosterPage() {
  const { hasPermission } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const canManage = hasPermission('manage_schedules') || hasPermission('*');

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const start = getStartOfWeek(currentWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const qs = `startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`;

      const [empRes, shiftRes, schedRes, leaveRes] = await Promise.all([
        api.get('/api/employees'),
        api.get('/api/shifts'),
        api.get(`/api/schedules?${qs}`),
        api.get(`/api/leaves?${qs}&status=approved`)
      ]);

      setEmployees(empRes.data);
      setShifts(shiftRes.data);
      setSchedules(schedRes.data);
      setLeaves(leaveRes.data);
    } catch (err) {
      console.error('Failed to load roster data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStartOfWeek = (d) => {
    const date = new Date(d);
    date.setHours(0,0,0,0);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  };

  const navigateWeek = (weeks) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setCurrentWeek(newDate);
  };

  const assignShift = async (employeeId, date, shiftId) => {
    try {
      if (!shiftId) {
        const existing = schedules.find(s => s.employeeId === employeeId && s.date === date);
        if (existing) {
          await api.delete(`/api/schedules/${existing._id}`);
        }
      } else {
        await api.post('/api/schedules', { employeeId, shiftId, date });
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update schedule');
    }
  };

  const startOfWeek = getStartOfWeek(currentWeek);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const getDayLeave = (empId, date) => {
    return leaves.find(l => 
      l.employeeId === empId && 
      date >= l.startDate && 
      date <= l.endDate
    );
  };

  if (isLoading) return <div className="loading-state">Loading visual roster...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🗓️ Visual Roster</h1>
          <p className="page-subtitle">Strategic shift planning & leave coordination</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <button className="btn-filter" onClick={() => navigateWeek(-1)}>◀</button>
            <button className="btn-filter active" style={{ minWidth: '220px' }}>
              {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </button>
            <button className="btn-filter" onClick={() => navigateWeek(1)}>▶</button>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <table className="data-table roster-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ minWidth: '220px', position: 'sticky', left: 0, background: 'var(--color-bg)', zIndex: 10, borderRight: '2px solid var(--color-border)' }}>Employee</th>
              {weekDates.map((date, i) => (
                <th key={date} style={{ textAlign: 'center', background: 'var(--color-bg)', borderRight: i < 6 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{DAYS[i]}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{new Date(date).getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp._id}>
                <td style={{ fontWeight: '600', position: 'sticky', left: 0, background: 'white', zIndex: 5, borderRight: '2px solid var(--color-border)' }}>
                  <div className="employee-cell">
                    <div className="emp-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem' }}>{emp.firstName} {emp.lastName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{emp.position}</span>
                    </div>
                  </div>
                </td>
                {weekDates.map((date, idx) => {
                  const assignment = schedules.find(s => s.employeeId === emp._id && s.date === date);
                  const leave = getDayLeave(emp._id, date);
                  
                  return (
                    <td key={date} style={{ 
                      textAlign: 'center', 
                      padding: '0.75rem', 
                      background: leave ? 'rgba(239, 68, 68, 0.05)' : assignment ? 'rgba(79, 70, 229, 0.03)' : 'transparent',
                      borderRight: idx < 6 ? '1px solid var(--color-border)' : 'none'
                    }}>
                      {leave ? (
                        <div className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '4px', width: '100%', borderRadius: '4px' }}>
                          🌴 {leave.type.toUpperCase()}
                        </div>
                      ) : canManage ? (
                        <select 
                          className="select-input" 
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '4px', 
                            width: '100%', 
                            border: assignment ? '1px solid var(--color-primary)' : '1px solid transparent',
                            background: assignment ? 'white' : 'transparent',
                            borderRadius: '6px'
                          }}
                          value={assignment?.shiftId?._id || ''}
                          onChange={(e) => assignShift(emp._id, date, e.target.value)}
                        >
                          <option value="">— OFF —</option>
                          {shifts.map(shift => (
                            <option key={shift._id} value={shift._id}>{shift.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: assignment ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: assignment ? '700' : '400' }}>
                          {assignment ? assignment.shiftId?.name : 'OFF'}
                        </div>
                      )}
                      {assignment && !leave && (
                        <div style={{ fontSize: '0.65rem', marginTop: '4px', color: 'var(--color-primary)', fontWeight: '600' }}>
                          {assignment.shiftId?.startTime} - {assignment.shiftId?.endTime}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="panel" style={{ marginTop: '2rem', display: 'flex', gap: '2rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(79, 70, 229, 0.1)', border: '1px solid var(--color-primary)' }}></div>
          <span>Active Shift</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)' }}></div>
          <span>On Approved Leave</span>
        </div>
      </div>
    </div>
  );
}
