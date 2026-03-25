import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [simulation, setSimulation] = useState({ rfidCardNumber: '', resourceId: '' });
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const [logsRes, resRes] = await Promise.all([
        api.get('/api/access/logs'),
        api.get('/api/bookings/resources')
      ]);
      setLogs(logsRes.data);
      setResources(resRes.data);
    } catch (err) {
      console.error('Failed to fetch initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/access/logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs');
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimResult(null);
    try {
      const res = await api.post('/api/access/verify', simulation);
      setSimResult({ success: true, message: `ACCESS GRANTED: ${res.data.user.email} (${res.data.user.tier})` });
      fetchLogs();
    } catch (err) {
      setSimResult({ success: false, message: `ACCESS DENIED: ${err.response?.data?.reason || 'Unknown error'}` });
      fetchLogs();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Access Control Hub</h1>
          <p className="page-subtitle">Real-time monitoring and IoT simulation for facility entry</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Device / Tag</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                  <td className="cell-primary">{log.User?.email || <span className="text-muted">Unknown</span>}</td>
                  <td><code>{log.deviceIdentifier}</code></td>
                  <td>
                    <span className={`badge ${log.status === 'GRANTED' ? 'badge-success' : 'badge-danger'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>{log.denialReason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && !isLoading && <p className="empty-state">No access events.</p>}
        </div>

        <div className="panel" style={{ position: 'sticky', top: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📟 IoT Simulator</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Test your access logic without connecting physical hardware.
          </p>
          <form onSubmit={handleSimulate}>
            <div className="form-group">
              <label>RFID / Card Number</label>
              <input 
                type="text" 
                className="select-input"
                placeholder="e.g. 12345678"
                value={simulation.rfidCardNumber}
                onChange={e => setSimulation({...simulation, rfidCardNumber: e.target.value})}
                required
              />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Target Resource (Optional)</label>
              <select 
                className="select-input"
                value={simulation.resourceId}
                onChange={e => setSimulation({...simulation, resourceId: e.target.value})}
              >
                <option value="">-- Main Entrance --</option>
                {resources.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
              Simulate Swipe
            </button>
          </form>

          {simResult && (
            <div style={{ 
              marginTop: '1.5rem', padding: '1rem', borderRadius: '8px',
              background: simResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${simResult.success ? '#22c55e' : '#ef4444'}`,
              textAlign: 'center'
            }}>
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                {simResult.success ? '✅' : '❌'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{simResult.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
