import { useState, useEffect } from 'react';
import api from '../../services/api';

const PERMISSION_KEYS = [
  { id: 'hierarchy', label: '🌳 Hierarchy View & Structure' },
  { id: 'employees', label: '👥 Employee Data & Management' },
  { id: 'payroll', label: '💰 Payroll & Compensations' },
  { id: 'attendance', label: '⌚ Attendance & IoT Logs' },
  { id: 'pos', label: '🛒 POS & Sales Terminals' },
  { id: 'inventory', label: '📦 Inventory & Stock Control' },
  { id: 'settings', label: '⚙️ System & Global Settings' },
];

function Toggle({ active, onClick }) {
  return (
    <div 
      className={`toggle-wrapper ${active ? 'active' : ''}`} 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="toggle-thumb" />
    </div>
  );
}

export default function PositionSettings({ positions, departments, onUpdate, initialData }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    departmentId: '', 
    parentPositionId: '', 
    permissions: [],
    description: '', 
    salaryRangeMin: 0, 
    salaryRangeMax: 0 
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        name: initialData.name, 
        departmentId: initialData.departmentId, 
        parentPositionId: initialData.parentPositionId || '',
        permissions: Array.isArray(initialData.permissions) ? initialData.permissions : [],
        description: initialData.description || '', 
        salaryRangeMin: initialData.salaryRangeMin || 0,
        salaryRangeMax: initialData.salaryRangeMax || 0
      });
      setEditingId(initialData._id);
    } else {
      setFormData({ name: '', departmentId: '', parentPositionId: '', permissions: [], description: '', salaryRangeMin: 0, salaryRangeMax: 0 });
      setEditingId(null);
    }
  }, [initialData]);

  const hasPermission = (key, level) => formData.permissions.includes(`${key}:${level}`);

  const togglePermission = (key, level) => {
    const permString = `${key}:${level}`;
    let newPermissions = [...formData.permissions];

    if (newPermissions.includes(permString)) {
      if (level === 'read') {
        newPermissions = newPermissions.filter(p => !p.startsWith(`${key}:`));
      } else if (level === 'write') {
        newPermissions = newPermissions.filter(p => p !== `${key}:write` && p !== `${key}:manage`);
      } else {
        newPermissions = newPermissions.filter(p => p !== `${key}:manage`);
      }
    } else {
      if (level === 'manage') {
        newPermissions.push(`${key}:manage`, `${key}:write`, `${key}:read`);
      } else if (level === 'write') {
        newPermissions.push(`${key}:write`, `${key}:read`);
      } else {
        newPermissions.push(`${key}:read`);
      }
    }
    setFormData({ ...formData, permissions: [...new Set(newPermissions)] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.departmentId) return alert('Please select a department');
    
    const payload = {
      ...formData,
      parentPositionId: formData.parentPositionId === '' ? null : formData.parentPositionId,
      salaryRangeMin: parseInt(formData.salaryRangeMin) || 0,
      salaryRangeMax: parseInt(formData.salaryRangeMax) || 0
    };

    try {
      if (editingId) {
        await api.patch(`/api/positions/${editingId}`, payload);
      } else {
        await api.post('/api/positions', payload);
      }
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save position');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Are you sure? This will fail if there are active employees in this position.')) return;
    try {
      await api.delete(`/api/positions/${editingId}`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete position');
    }
  };

  const availableParents = positions.filter(p => p._id !== editingId);

  return (
    <div className="node-editor-form animate-fade-in">
       <form onSubmit={handleSubmit}>
          <div className="matrix-layout">
            {/* Left Column: Metadata */}
            <div className="matrix-metadata">
              <div className="form-group">
                <label className="matrix-label">Position Title</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  placeholder="e.g. Senior Developer, HR Manager..."
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="matrix-label">Department Assignment</label>
                <select 
                  className="select-input" 
                  value={formData.departmentId} 
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} 
                  required
                  style={{ width: '100%' }}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="matrix-label">Reporting Hierarchy</label>
                <select 
                  className="select-input" 
                  value={formData.parentPositionId} 
                  onChange={(e) => setFormData({ ...formData, parentPositionId: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">No Parent (Top-Level Position)</option>
                  {availableParents.map(pos => (
                     <option key={pos._id} value={pos._id}>{pos.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="matrix-label">Salary Range (Monthly Gross)</label>
                <div className="salary-inputs">
                  <div className="range-field">
                    <span>₱</span>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={formData.salaryRangeMin} 
                      onChange={(e) => setFormData({ ...formData, salaryRangeMin: e.target.value })} 
                    />
                  </div>
                  <span className="range-sep">→</span>
                  <div className="range-field">
                    <span>₱</span>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={formData.salaryRangeMax} 
                      onChange={(e) => setFormData({ ...formData, salaryRangeMax: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="matrix-label">Position Summary</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline the core objectives and expectations..."
                  rows="3"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div className="matrix-footer">
                <button type="submit" className="btn-save">
                  {editingId ? 'Update Position' : 'Create Position'}
                </button>
                {editingId && (
                  <button type="button" className="btn-delete" onClick={handleDelete}>Delete</button>
                )}
              </div>
            </div>

            {/* Right Column: Permissions Matrix */}
            <div className="matrix-permissions">
                <div className="matrix-header">
                  <div className="col-key">Access Permissions</div>
                  <div className="col-opt">Read</div>
                  <div className="col-opt">Write</div>
                  <div className="col-opt">Manage</div>
                </div>
                
                <div className="matrix-body">
                  {PERMISSION_KEYS.map(perm => (
                    <div key={perm.id} className="matrix-row">
                      <div className="col-key">
                        <span className="perm-label">{perm.label}</span>
                      </div>
                      <div className="col-opt">
                        <Toggle active={hasPermission(perm.id, 'read')} onClick={() => togglePermission(perm.id, 'read')} />
                      </div>
                      <div className="col-opt">
                        <Toggle active={hasPermission(perm.id, 'write')} onClick={() => togglePermission(perm.id, 'write')} />
                      </div>
                      <div className="col-opt">
                        <Toggle active={hasPermission(perm.id, 'manage')} onClick={() => togglePermission(perm.id, 'manage')} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>
       </form>

       <style>{`
          .matrix-layout { display: grid; grid-template-columns: 320px 1fr; gap: 2.5rem; }
          .matrix-metadata { display: flex; flex-direction: column; gap: 1.25rem; }
          .matrix-label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; display: block; }
          
          .salary-inputs { display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; padding: 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0; }
          .range-field { position: relative; flex: 1; }
          .range-field span { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.8rem; }
          .range-field input { padding-left: 1.75rem; width: 100%; border: 1px solid transparent; background: white; height: 32px; font-size: 0.85rem; }
          .range-sep { color: #cbd5e1; font-weight: 800; }

          .matrix-permissions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; height: fit-content; }
          .matrix-header { display: grid; grid-template-columns: 1fr 60px 60px 60px; padding: 0.8rem 1.25rem; background: white; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 0.75rem; color: #475569; }
          .matrix-row { display: grid; grid-template-columns: 1fr 60px 60px 60px; padding: 0.8rem 1.25rem; border-bottom: 1px solid #f1f5f9; align-items: center; transition: background 0.2s; }
          .matrix-row:hover { background: #fff; }
          .matrix-row:last-child { border-bottom: none; }
          
          .col-opt { display: flex; justify-content: center; }
          .perm-label { font-size: 0.8rem; font-weight: 600; color: #1e293b; }

          .matrix-footer { display: flex; gap: 0.75rem; margin-top: 1rem; border-top: 1px solid #f1f5f9; padding-top: 1.5rem; }
          .btn-save { flex: 1; background: #0ea5e9; color: white; padding: 0.7rem; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
          .btn-delete { background: transparent; color: #ef4444; border: 1px solid #fee2e2; padding: 0.7rem 1rem; border-radius: 10px; font-weight: 600; cursor: pointer; }

          .toggle-wrapper { width: 34px; height: 18px; background: #e2e8f0; border-radius: 20px; position: relative; cursor: pointer; transition: background 0.3s; }
          .toggle-wrapper.active { background: #0ea5e9; }
          .toggle-thumb { width: 14px; height: 14px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: left 0.3s; }
          .toggle-wrapper.active .toggle-thumb { left: 18px; }
       `}</style>
    </div>
  );
}
