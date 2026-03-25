import { useState, useEffect } from 'react';
import api from '../services/api';

export default function MembershipsPage() {
  const [tiers, setTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTier, setNewTier] = useState({ name: '', price: 0, durationDays: 30, description: '' });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await api.get('/api/memberships/tiers');
      setTiers(res.data);
    } catch (err) {
      console.error('Failed to fetch tiers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTier = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/memberships/tiers', newTier);
      setNewTier({ name: '', price: 0, durationDays: 30, description: '' });
      setIsAdding(false);
      fetchTiers();
    } catch (err) {
      alert('Failed to create tier');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Membership Tiers</h1>
          <p className="page-subtitle">Define Silver, Gold, and Platinum levels for your members</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Create Tier'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreateTier} className="panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tier Name</label>
              <input 
                type="text" 
                placeholder="e.g. Platinum" 
                value={newTier.name}
                onChange={e => setNewTier({...newTier, name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label>Monthly Price (₱)</label>
              <input 
                type="number" 
                value={newTier.price}
                onChange={e => setNewTier({...newTier, price: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label>Duration (Days)</label>
              <input 
                type="number" 
                value={newTier.durationDays}
                onChange={e => setNewTier({...newTier, durationDays: e.target.value})}
                required 
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Description</label>
            <textarea 
              value={newTier.description}
              onChange={e => setNewTier({...newTier, description: e.target.value})}
              placeholder="What perks does this tier have?"
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Save Tier</button>
        </form>
      )}

      <div className="stats-grid">
        {tiers.map(tier => (
          <div key={tier._id} className="stat-card">
            <div className="stat-icon">🎫</div>
            <div className="stat-content">
              <span className="stat-value">₱{tier.price}</span>
              <span className="stat-label">{tier.name}</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                {tier.durationDays} Days · {tier.description || 'No description'}
              </p>
            </div>
          </div>
        ))}
        {tiers.length === 0 && !isLoading && (
          <p className="text-muted">No tiers defined yet. Create your first one!</p>
        )}
      </div>
    </div>
  );
}
