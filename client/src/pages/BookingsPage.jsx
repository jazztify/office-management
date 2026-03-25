import { useState, useEffect } from 'react';
import api from '../services/api';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

export default function BookingsPage() {
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [newBooking, setNewBooking] = useState({ userId: '', startTime: '', endTime: '', notes: '' });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedResource) {
      fetchBookings();
    }
  }, [selectedResource, selectedDate]);

  const fetchInitialData = async () => {
    try {
      const [resRes, userRes] = await Promise.all([
        api.get('/api/bookings/resources'),
        api.get('/api/users')
      ]);
      setResources(resRes.data);
      setUsers(userRes.data);
      if (resRes.data.length > 0) setSelectedResource(resRes.data[0]);
    } catch (err) {
      console.error('Failed to fetch initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/api/bookings');
      // Filter for selected resource and date
      const filtered = res.data.filter(b => 
        b.resourceId === selectedResource._id && 
        b.startTime.startsWith(selectedDate)
      );
      setBookings(filtered);
    } catch (err) {
      console.error('Failed to fetch bookings');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build full ISO strings
      const start = `${selectedDate}T${newBooking.startTime}:00`;
      const end = `${selectedDate}T${newBooking.endTime}:00`;
      
      await api.post('/api/bookings', {
        ...newBooking,
        resourceId: selectedResource._id,
        startTime: start,
        endTime: end
      });
      setShowBookingModal(false);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Booking failed');
    }
  };

  const getBookingForHour = (hour) => {
    return bookings.find(b => {
      const startHour = new Date(b.startTime).getHours();
      return startHour === hour;
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Interactive Scheduling</h1>
          <p className="page-subtitle">Reserve courts, coaches, and equipment in real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input 
            type="date" 
            className="select-input" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
          />
          <select 
            className="select-input"
            value={selectedResource?._id || ''}
            onChange={e => setSelectedResource(resources.find(r => r._id === e.target.value))}
          >
            {resources.map(r => <option key={r._id} value={r._id}>{r.name} ({r.type})</option>)}
          </select>
          <button className="btn-primary" onClick={() => setShowBookingModal(true)}>
            + Quick Booking
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ padding: '0.75rem', fontWeight: 700, textAlign: 'center', background: '#f8fafc' }}>TIME</div>
          <div style={{ padding: '0.75rem', fontWeight: 700, background: '#f8fafc' }}>
            {selectedResource?.name ? `${selectedResource.name} Schedule` : 'Select a resource'}
          </div>
        </div>
        
        {HOURS.map(hour => {
          const booking = getBookingForHour(hour);
          return (
            <div key={hour} style={{ 
              display: 'grid', gridTemplateColumns: '80px 1fr', 
              minHeight: '60px', borderBottom: '1px solid var(--color-border)',
              transition: 'background 0.2s'
            }}>
              <div style={{ 
                padding: '1rem 0', textAlign: 'center', 
                fontSize: '0.75rem', color: 'var(--color-text-secondary)',
                borderRight: '1px solid var(--color-border)'
              }}>
                {hour}:00
              </div>
              <div style={{ padding: '0.25rem' }}>
                {booking ? (
                  <div style={{ 
                    height: '100%', borderRadius: '4px', 
                    background: 'rgba(79, 70, 229, 0.1)', border: '1px solid var(--color-primary)',
                    padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>{booking.User?.email}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{booking.notes || 'No notes'}</span>
                    </div>
                    <span className="badge badge-success">BOOKED</span>
                  </div>
                ) : (
                  <div 
                    style={{ height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => {
                      setNewBooking({ 
                        ...newBooking, 
                        startTime: String(hour).padStart(2, '0') + ':00',
                        endTime: String((hour + 1)).padStart(2, '0') + ':00'
                      });
                      setShowBookingModal(true);
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '1rem' }}>
                      + Available
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Create Reservation</h3>
              <button className="btn-close" onClick={() => setShowBookingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleBookingSubmit} className="modal-body">
              <div className="form-group">
                <label>Resource</label>
                <input type="text" value={selectedResource?.name} disabled className="select-input" />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Member / User</label>
                <select 
                  className="select-input"
                  value={newBooking.userId}
                  onChange={e => setNewBooking({...newBooking, userId: e.target.value})}
                  required
                >
                  <option value="">-- Select Member --</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.email}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Start Time</label>
                  <input 
                    type="time" 
                    className="select-input"
                    value={newBooking.startTime}
                    onChange={e => setNewBooking({...newBooking, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input 
                    type="time" 
                    className="select-input"
                    value={newBooking.endTime}
                    onChange={e => setNewBooking({...newBooking, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Internal Notes</label>
                <input 
                  type="text" 
                  className="select-input"
                  value={newBooking.notes}
                  onChange={e => setNewBooking({...newBooking, notes: e.target.value})}
                  placeholder="e.g. Needs racket rental"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Confirm Booking
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowBookingModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
