import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/api/access/logs');
        setLogs(res.data);
      } catch (err) {
        console.error('Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
    
    // Auto-refresh logs every 10 seconds for real-time monitoring
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Access Control Logs</h1>
        <p className="page-subtitle">Real-time monitoring of IoT entry and exit points</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Device / Tag</th>
              <th>Direction</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log._id}>
                <td style={{ fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td className="cell-primary">{log.User?.email || 'Unknown User'}</td>
                <td><code>{log.deviceIdentifier}</code></td>
                <td>
                   <span className={`badge ${log.direction === 'IN' ? 'badge-primary' : 'badge-info'}`}>
                    {log.direction}
                  </span>
                </td>
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
        {logs.length === 0 && !isLoading && (
          <p className="empty-state">No access events recorded yet.</p>
        )}
      </div>
    </div>
  );
}
