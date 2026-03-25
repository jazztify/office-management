import { useState, useEffect } from 'react';
import api from '../services/api';

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newResource, setNewResource] = useState({ name: '', type: 'COURT', hourlyRate: 0 });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await api.get('/api/bookings/resources');
      setResources(res.data);
    } catch (err) {
      console.error('Failed to fetch resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Need backend route for creating resource (currently only have getAllResources)
      // For now, assume POST /api/bookings/resources exists or I will add it
      await api.post('/api/bookings/resources', newResource);
      setNewResource({ name: '', type: 'COURT', hourlyRate: 0 });
      setIsAdding(false);
      fetchResources();
    } catch (err) {
      alert('Failed to create resource');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Resources & Courts</h1>
          <p className="page-subtitle">Manage your tennis courts, coaches, and equipment</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Resource'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Resource Name</label>
              <input 
                type="text" 
                placeholder="e.g. Court 1" 
                value={newResource.name}
                onChange={e => setNewResource({...newResource, name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select 
                value={newResource.type}
                onChange={e => setNewResource({...newResource, type: e.target.value})}
                className="select-input"
              >
                <option value="COURT">Court</option>
                <option value="COACH">Coach</option>
                <option value="ROOM">Room</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Hourly Rate (₱)</label>
              <input 
                type="number" 
                value={newResource.hourlyRate}
                onChange={e => setNewResource({...newResource, hourlyRate: e.target.value})}
                required 
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Save Resource</button>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Hourly Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map(res => (
              <tr key={res._id}>
                <td className="cell-primary">{res.name}</td>
                <td>{res.type}</td>
                <td>₱{res.hourlyRate}</td>
                <td>
                  <span className={`badge ${res.isActive ? 'badge-success' : 'badge-muted'}`}>
                    {res.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resources.length === 0 && !isLoading && (
          <p className="empty-state">No resources added yet.</p>
        )}
      </div>
    </div>
  );
}
