import { useState, useEffect } from 'react';
import api from '../services/api';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerData, setRegisterData] = useState({ email: '', firstName: '', lastName: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // Assignment State
  const [selectedMember, setSelectedMember] = useState(null);
  const [assignmentData, setAssignmentData] = useState({ tierId: '', tokenValue: '', type: 'RFID', expiresAt: '' });
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, tiersRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/memberships/tiers')
      ]);
      setMembers(membersRes.data);
      setTiers(tiersRes.data);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      await api.post('/api/memberships/register', registerData);
      setShowRegisterModal(false);
      setRegisterData({ email: '', firstName: '', lastName: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register member');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenAssign = (member) => {
    setSelectedMember(member);
    setAssignmentData({
      tierId: member.membershipTierId || '',
      tokenValue: '', // Always empty for new assignment in this UI
      type: 'RFID',
      expiresAt: member.membershipExpiresAt ? new Date(member.membershipExpiresAt).toISOString().split('T')[0] : ''
    });
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      await api.post('/api/memberships/assign', {
        userId: selectedMember._id,
        ...assignmentData
      });
      setSelectedMember(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign membership');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Club Member Directory</h1>
          <p className="page-subtitle">Manage member profiles, tiers, and access credentials</p>
        </div>
        <button className="btn-primary" onClick={() => setShowRegisterModal(true)}>
          + Register Member
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member Email</th>
              <th>Membership Tier</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && !isLoading ? (
              <tr><td colSpan="5" className="empty-state">No members found in this workspace.</td></tr>
            ) : (
              members.map(member => (
                <tr key={member._id}>
                  <td className="cell-primary">{member.email}</td>
                  <td>
                    {tiers.find(t => t._id === member.membershipTierId)?.name || (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${member.membershipStatus === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {member.membershipStatus || 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {member.membershipExpiresAt ? new Date(member.membershipExpiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleOpenAssign(member)}>
                      {member.membershipTierId ? 'Manage Identity' : 'Assign Tier'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Register New Member</h3>
              <button className="btn-close" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegister} className="modal-body">
              <div className="form-group">
                <label>Email Address *</label>
                <input 
                  type="email" 
                  value={registerData.email} 
                  onChange={e => setRegisterData({...registerData, email: e.target.value})} 
                  required 
                  className="select-input"
                  placeholder="member@example.com"
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>First Name (Optional)</label>
                <input 
                  type="text" 
                  value={registerData.firstName} 
                  onChange={e => setRegisterData({...registerData, firstName: e.target.value})} 
                  className="select-input"
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Last Name (Optional)</label>
                <input 
                  type="text" 
                  value={registerData.lastName} 
                  onChange={e => setRegisterData({...registerData, lastName: e.target.value})} 
                  className="select-input"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isRegistering}>
                  {isRegistering ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Identity & Tier Modal */}
      {selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '0' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', background: 'var(--color-surface-hover)' }}>
              <div>
                <h3 style={{ margin: 0 }}>🆔 Identity & Membership</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Configure access rights for {selectedMember.email}</p>
              </div>
              <button className="btn-close" onClick={() => setSelectedMember(null)}>✕</button>
            </div>

            <form onSubmit={handleAssign} className="modal-body" style={{ padding: '2rem' }}>
              
              <div className="form-section">
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span>🎫</span> Select Membership Tier
                </h4>
                <div className="module-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {tiers.map(t => {
                    const isSelected = assignmentData.tierId === t._id;
                    return (
                      <div 
                        key={t._id} 
                        className={`module-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setAssignmentData({...assignmentData, tierId: t._id})}
                        style={{ height: 'auto', padding: '1.25rem' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.25rem' }}>🏅</span>
                          <div className="module-check">{isSelected && '✓'}</div>
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                           <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                           <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>₱{t.price.toLocaleString()} / {t.durationDays} Days</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '2.5rem' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span>💳</span> Hardware Token / Access Card
                </h4>
                <div style={{ 
                  background: 'var(--color-surface-hover)', 
                  padding: '1.5rem', 
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Token Value</label>
                      <input 
                        type="text" 
                        autoFocus
                        className="select-input"
                        value={assignmentData.tokenValue}
                        onChange={e => setAssignmentData({...assignmentData, tokenValue: e.target.value})}
                        placeholder="Scan or tap card now..."
                        style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '500', 
                          background: '#fff',
                          letterSpacing: assignmentData.tokenValue ? '2px' : 'normal'
                        }}
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Type</label>
                      <select 
                        className="select-input" 
                        value={assignmentData.type}
                        onChange={e => setAssignmentData({...assignmentData, type: e.target.value})}
                        style={{ background: '#fff' }}
                      >
                        <option value="RFID">RFID</option>
                        <option value="NFC">NFC</option>
                        <option value="QR">QR CODE</option>
                      </select>
                    </div>
                  </div>
                  
                  {assignmentData.tokenValue ? (
                    <div className="fade-in" style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--color-success)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      fontWeight: 'bold'
                    }}>
                      <span>✨</span> Ready to bind token. Previous active tokens will be revoked.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <div className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                       Waiting for card interaction...
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '2.5rem' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span>📅</span> Optional Override
                </h4>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Expiry Date (Leave blank for default tier duration)</label>
                  <input 
                    type="date" 
                    className="select-input"
                    value={assignmentData.expiresAt}
                    onChange={e => setAssignmentData({...assignmentData, expiresAt: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '3rem', padding: '0', display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, height: '48px', fontSize: '1rem' }} disabled={isAssigning || !assignmentData.tierId}>
                  {isAssigning ? 'Synchronizing Intelligence...' : 'Activate Membership'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setSelectedMember(null)} style={{ height: '48px', padding: '0 1.5rem' }}>
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

