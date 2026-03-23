import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const HOLIDAY_TYPES = {
  regular: { label: 'Regular Holiday (200%)', badge: 'badge-danger', icon: '🔴' }, // e.g. Christmas, New Year
  special_non_working: { label: 'Special Non-Working (130%)', badge: 'badge-warning', icon: '🟡' }, // e.g. Ninoy Aquino Day
  company: { label: 'Company Holiday', badge: 'badge-primary', icon: '🏢' },
  optional: { label: 'Optional', badge: 'badge-info', icon: '📌' },
};

export default function HolidaysPage() {
  const { hasPermission } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('upcoming');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState({ 
    name: '', 
    date: '', 
    type: 'regular', 
    description: '',
    isPaidUnworked: true,
    rateMultiplier: 2.0
  });

  const canManage = hasPermission('manage_holidays') || hasPermission('manage_settings') || hasPermission('*');

  useEffect(() => {
    fetchHolidays();
    fetchBirthdays();
  }, [filter]);

  const fetchBirthdays = async () => {
    try {
      const { data } = await api.get('/api/employees/birthdays');
      setBirthdays(data || []);
    } catch (err) {
      // Non-critical: user may not have manage_employees permission
      console.log('Could not fetch birthdays (may lack permission)');
    }
  };

  const fetchHolidays = async () => {
    try {
      let params = '';
      if (filter === 'upcoming') params = '';
      else if (filter === 'all') params = '?all=true';
      else params = `?type=${filter}`;

      const { data } = await api.get(`/api/holidays${params}`);
      setHolidays(data || []);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/holidays', formData);
      setFormData({ 
        name: '', date: '', type: 'regular', description: '', isPaidUnworked: true, rateMultiplier: 2.0 
      });
      setShowForm(false);
      fetchHolidays();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create holiday');
    }
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    let defPaid = true;
    let defMulti = 2.0;

    if (newType === 'special_non_working') {
      defPaid = false; // generally unpaid if unworked unless company policy differs, but default false
      defMulti = 1.3;  // 130%
    } else if (newType === 'regular') {
      defPaid = true;
      defMulti = 2.0;
    } else {
      defPaid = false;
      defMulti = 1.0;
    }

    setFormData({
      ...formData,
      type: newType,
      isPaidUnworked: defPaid,
      rateMultiplier: defMulti,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.delete(`/api/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      alert('Failed to delete holiday');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today! 🎉';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `in ${diff} days`;
  };

  const getDaysUntilClass = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'countdown-today';
    if (diff <= 7) return 'countdown-soon';
    if (diff <= 30) return 'countdown-near';
    return 'countdown-far';
  };

  // Group holidays by month
  const groupedHolidays = holidays.reduce((acc, h) => {
    const d = new Date(h.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = { label, items: [] };
    acc[key].items.push(h);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📅 Holidays</h1>
          <p className="page-subtitle">Company and national holidays calendar</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            {['upcoming', 'all', 'regular', 'special_non_working', 'company', 'optional'].map((f) => {
              const label = f === 'regular' ? 'Regular' : f === 'special_non_working' ? 'Special Non-Working' : f.charAt(0).toUpperCase() + f.slice(1);
              return (
              <button
                key={f}
                className={`btn-filter ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setIsLoading(true); }}
              >
                {label}
              </button>
            )})}
          </div>
          {canManage && (
            <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Holiday'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form className="panel" onSubmit={handleCreate} style={{ marginBottom: '1.5rem', background: 'var(--color-bg-hover)' }}>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Holiday Name</label>
              <input type="text" className="select-input" placeholder="e.g. Christmas Day" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" className="select-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="select-input" value={formData.type} onChange={handleTypeChange}>
                <option value="regular">Regular Holiday (200% Pay)</option>
                <option value="special_non_working">Special Non-Working (130% Pay)</option>
                <option value="company">Company Custom Holiday</option>
                <option value="optional">Optional Holiday</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Pay Multiplier if Worked</label>
              <input type="number" step="0.1" className="select-input" value={formData.rateMultiplier} onChange={(e) => setFormData({ ...formData, rateMultiplier: e.target.value })} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>e.g. 2.0 = 200%, 1.3 = 130%</span>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <input type="checkbox" id="paidUnworked" checked={formData.isPaidUnworked} onChange={(e) => setFormData({ ...formData, isPaidUnworked: e.target.checked })} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="paidUnworked" style={{ margin: 0, cursor: 'pointer' }}>Paid if Unworked?</label>
            </div>
            <div className="form-group">
              <label>Optional Description</label>
              <input type="text" className="select-input" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
          <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary">💾 Save Holiday</button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Calendar View */}
      <div className="panel" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white', color: 'black' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .rbc-calendar { font-family: inherit; }
          .rbc-event { padding: 4px 8px; font-size: 0.8rem; }
          .rbc-toolbar button { color: #333; outline: none !important; box-shadow: none !important; }
          .rbc-toolbar button.rbc-active { background: #e2e8f0; color: #1e293b; box-shadow: none !important; }
        `}} />
        <Calendar
          localizer={localizer}
          events={[
            // Holiday events
            ...holidays.map(h => {
              const d = new Date(h.date);
              return {
                title: `${HOLIDAY_TYPES[h.type]?.icon || '📅'} ${h.name}`,
                start: d,
                end: d,
                allDay: true,
                resource: { ...h, _eventType: 'holiday' },
              };
            }),
            // Birthday events (show in current year)
            ...birthdays.map(emp => {
              const dob = new Date(emp.dateOfBirth);
              const thisYearBday = new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate());
              return {
                title: `🎂 ${emp.firstName} ${emp.lastName}'s Birthday`,
                start: thisYearBday,
                end: thisYearBday,
                allDay: true,
                resource: { _eventType: 'birthday', employee: emp },
              };
            }),
          ]}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          views={['month', 'week', 'day']}
          onSelectSlot={canManage ? ({ start }) => {
            const tzAdjusted = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
            const dateStr = tzAdjusted.toISOString().split('T')[0];
            setFormData({ ...formData, date: dateStr });
            setShowForm(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } : undefined}
          selectable={canManage}
          eventPropGetter={(event) => {
            const r = event.resource;
            if (r._eventType === 'birthday') {
              return { style: { backgroundColor: '#f687b3', border: 'none', color: '#1a202c', fontWeight: 'bold' } };
            }
            const bgMap = {
              regular: '#fc8181',
              special_non_working: '#f6ad55',
              company: '#63b3ed',
              optional: '#4fd1c5'
            };
            return { style: { backgroundColor: bgMap[r.type] || '#718096', border: 'none', color: '#1a202c', fontWeight: 'bold' } };
          }}
        />
      </div>

      {isLoading ? (
        <div className="loading-state">Loading holidays...</div>
      ) : holidays.length === 0 ? (
        <div className="empty-card">
          <div className="empty-card-icon">📅</div>
          <h3>No holidays found</h3>
          <p>No upcoming holidays to display. {canManage ? 'Add one to get started!' : ''}</p>
        </div>
      ) : (
        <div className="holidays-container">
          {Object.entries(groupedHolidays).map(([key, group]) => (
            <div key={key} className="holiday-group">
              <h3 className="holiday-group-title">{group.label}</h3>
              <div className="holiday-cards">
                {group.items.map((holiday) => {
                  const typeInfo = HOLIDAY_TYPES[holiday.type] || HOLIDAY_TYPES.regular;
                  return (
                    <div key={holiday._id} className="holiday-card">
                      <div className="holiday-card-left">
                        <div className="holiday-date-box">
                          <span className="holiday-day">{new Date(holiday.date).getDate()}</span>
                          <span className="holiday-month-short">
                            {new Date(holiday.date).toLocaleDateString('en', { month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="holiday-card-center">
                        <div className="holiday-name">
                          <span className="holiday-type-icon">{typeInfo.icon}</span>
                          {holiday.name}
                          {holiday.isRecurring && <span className="recurring-badge" title="Recurring yearly">🔄</span>}
                        </div>
                        <div className="holiday-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className={`badge ${typeInfo.badge}`}>{typeInfo.label}</span>
                          <span className="badge badge-muted">
                            Pays: {holiday.rateMultiplier ? (holiday.rateMultiplier * 100).toFixed(0) + '%' : '100%'}
                          </span>
                          {!holiday.isPaidUnworked && (
                            <span className="badge" style={{ background: 'var(--color-danger)', color: 'white' }}>No Pay if Unworked</span>
                          )}
                          <span className="holiday-weekday" style={{ marginLeft: 'auto' }}>{formatDate(holiday.date)}</span>
                        </div>
                        {holiday.description && (
                          <p className="holiday-description">{holiday.description}</p>
                        )}
                      </div>
                      <div className="holiday-card-right">
                        <span className={`holiday-countdown ${getDaysUntilClass(holiday.date)}`}>
                          {getDaysUntil(holiday.date)}
                        </span>
                        {canManage && (
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(holiday._id)}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
