import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ShiftsPage() {
  const { hasPermission } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    description: '',
    workDays: [1, 2, 3, 4, 5],
  });
  
  const canManage = hasPermission('manage_settings') || hasPermission('*');

  useEffect(() => {
    fetchShifts();
    if (canManage) fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    try {
      const { data } = await api.get('/api/shifts');
      setShifts(data || []);
    } catch (err) {
      console.error('Failed to load shifts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/shifts', formData);
      setFormData({
        name: '', startTime: '08:00', endTime: '17:00',
        lunchStart: '12:00', lunchEnd: '13:00', description: '', workDays: [1, 2, 3, 4, 5]
      });
      setShowForm(false);
      fetchShifts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create shift');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      await api.delete(`/api/shifts/${id}`);
      fetchShifts();
    } catch (err) {
      alert('Failed to delete shift');
    }
  };

  const handleAssign = async (shiftId, updatedAssignedList) => {
    try {
      await api.patch(`/api/shifts/${shiftId}/assign`, { employeeIds: updatedAssignedList });
      fetchShifts();
    } catch (err) {
      alert('Failed to assign employees');
    }
  };

  const toggleWorkDay = (day) => {
    setFormData(prev => {
      const days = [...prev.workDays];
      if (days.includes(day)) {
        return { ...prev, workDays: days.filter(d => d !== day).sort((a,b)=>a-b) };
      } else {
        return { ...prev, workDays: [...days, day].sort((a,b)=>a-b) };
      }
    });
  };

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>⏱️ Shift Management</h1>
          <p className="page-subtitle">Manage work schedules and assign them to employees</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Create Shift'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="panel" onSubmit={handleCreate} style={{ marginBottom: '1.5rem', background: 'var(--color-bg-hover)' }}>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Shift Name</label>
              <input type="text" className="select-input" placeholder="e.g. Night Shift" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input type="text" className="select-input" placeholder="Notes..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" className="select-input" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" className="select-input" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Lunch Start</label>
              <input type="time" className="select-input" value={formData.lunchStart} onChange={e => setFormData({...formData, lunchStart: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Lunch End</label>
              <input type="time" className="select-input" value={formData.lunchEnd} onChange={e => setFormData({...formData, lunchEnd: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Work Days</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {DAY_NAMES.map((d, i) => (
                  <button 
                    type="button" 
                    key={i} 
                    onClick={() => toggleWorkDay(i)}
                    className={`btn-filter ${formData.workDays.includes(i) ? 'active' : ''}`}
                    style={{ minWidth: '40px' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary">💾 Save Shift</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="loading-state">Loading shifts...</div>
      ) : shifts.length === 0 ? (
        <div className="empty-card">
          <div className="empty-card-icon">⏱️</div>
          <h3>No shifts configured</h3>
          <p>Create a customized shift schedule to assign to employees.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {shifts.map(shift => (
            <div key={shift._id} className="panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem' }}>{shift.name}</h3>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {shift.startTime} - {shift.endTime} (Lunch: {shift.lunchStart || 'N/A'} - {shift.lunchEnd || 'N/A'})
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {DAY_NAMES.map((d, i) => (
                    <span key={i} style={{ 
                      padding: '0.1rem 0.3rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      background: shift.workDays.includes(i) ? 'var(--color-primary)' : 'var(--color-bg-hover)',
                      color: shift.workDays.includes(i) ? 'white' : 'var(--color-text-muted)'
                    }}>{d}</span>
                  ))}
                </div>
                {shift.description && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>{shift.description}</p>}
                
                {/* Assignment UI */}
                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Assigned Employees ({shift.assignedEmployees?.length || 0}):</strong>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {shift.assignedEmployees?.map(emp => (
                      <span key={emp._id} className="badge badge-primary">{emp.firstName} {emp.lastName}</span>
                    ))}
                  </div>
                  {canManage && (
                    <select 
                      className="select-input" 
                      style={{ marginTop: '0.5rem', maxWidth: '250px', fontSize: '0.85rem' }}
                      value=""
                      onChange={(e) => {
                        const newId = e.target.value;
                        if (!newId) return;
                        if (shift.assignedEmployees.some(emp => emp._id === newId)) return;
                        const newIds = [...shift.assignedEmployees.map(e => e._id), newId];
                        handleAssign(shift._id, newIds);
                      }}
                    >
                      <option value="">+ Assign Employee</option>
                      {employees.filter(emp => !shift.assignedEmployees.some(e => e._id === emp._id)).map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  )}
                  {canManage && shift.assignedEmployees?.length > 0 && (
                     <button className="btn-sm btn-ghost" style={{ marginLeft: '1rem', color: 'var(--color-danger)' }} onClick={() => handleAssign(shift._id, [])}>Clear Assignments</button>
                  )}
                </div>
              </div>
              <div>
                {canManage && <button className="btn-sm btn-danger" onClick={() => handleDelete(shift._id)}>✕ Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
