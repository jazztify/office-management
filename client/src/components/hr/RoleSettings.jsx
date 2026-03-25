import { useState, useEffect } from 'react';
import api from '../../services/api';

const COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#64748b', '#0f172a'
];

const PERMISSION_KEYS = [
  { id: 'hierarchy', label: '🌳 Hierarchy View & Structure' },
  { id: 'employees', label: '👥 Employee Data & Management' },
  { id: 'payroll', label: '💰 Payroll & Compensations' },
  { id: 'attendance', label: '⌚ Attendance & IoT Logs' },
  { id: 'pos', label: '🛒 POS & Sales Terminals' },
  { id: 'inventory', label: '📦 Inventory & Stock Control' },
  { id: 'settings', label: '⚙️ System & Global Settings' },
];

export default function RoleSettings({ roles: initialRoles, onUpdate, initialData }) {
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [], color: COLORS[0] });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        name: initialData.name, 
        description: initialData.description || '', 
        permissions: Array.isArray(initialData.permissions) ? initialData.permissions : [],
        color: initialData.color || COLORS[0]
      });
      setEditingId(initialData._id);
    } else {
      setFormData({ name: '', description: '', permissions: [], color: COLORS[0] });
      setEditingId(null);
    }
  }, [initialData]);

  const hasPermission = (key, level) => formData.permissions.includes(`${key}:${level}`);

  const togglePermission = (key, level) => {
    const permString = `${key}:${level}`;
    let newPermissions = [...formData.permissions];

    if (newPermissions.includes(permString)) {
      // Remove this level and higher ones
      if (level === 'read') {
        newPermissions = newPermissions.filter(p => !p.startsWith(`${key}:`));
      } else if (level === 'write') {
        newPermissions = newPermissions.filter(p => p !== `${key}:write` && p !== `${key}:manage`);
      } else {
        newPermissions = newPermissions.filter(p => p !== `${key}:manage`);
      }
    } else {
      // Add this level and lower ones
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
    try {
      if (editingId) {
        await api.patch(`/api/roles/${editingId}`, formData);
      } else {
        await api.post('/api/roles', formData);
      }
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/api/roles/${editingId}`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  return (
    <div className="role-matrix-editor animate-fade-in">
        <form onSubmit={handleSubmit}>
          <div className="matrix-layout">
            {/* Left Column: Metadata */}
            <div className="matrix-metadata">
              <div className="form-group">
                <label className="matrix-label">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Lead"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="matrix-label">Description</label>
                <textarea
                  placeholder="Provide context for this role..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label className="matrix-label">Identity Color</label>
                <div className="color-grid">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`color-btn ${formData.color === c ? 'active' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="matrix-footer">
                <button type="submit" className="btn-save">Save Roles & Permissions</button>
                {editingId && !initialData?.isSystemDefault && (
                  <button type="button" className="btn-delete" onClick={handleDelete}>Delete Role</button>
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
          
          .matrix-metadata { display: flex; flex-direction: column; gap: 1.5rem; }
          .matrix-label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block; }
          
          .color-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
          .color-btn { height: 32px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
          .color-btn.active { border-color: #fff; box-shadow: 0 0 0 2px var(--color-primary); transform: scale(1.1); }

          .matrix-permissions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
          .matrix-header { display: grid; grid-template-columns: 1fr 80px 80px 80px; padding: 1rem 1.5rem; background: white; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 0.85rem; color: #475569; }
          .matrix-row { display: grid; grid-template-columns: 1fr 80px 80px 80px; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; align-items: center; transition: background 0.2s; }
          .matrix-row:hover { background: #fff; }
          .matrix-row:last-child { border-bottom: none; }
          
          .col-opt { display: flex; justify-content: center; }
          .perm-label { font-size: 0.9rem; font-weight: 600; color: #1e293b; }

          .btn-save { background: #0ea5e9; color: white; padding: 0.8rem; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; margin-top: 1rem; transition: opacity 0.2s; }
          .btn-save:hover { opacity: 0.9; }
          .btn-delete { background: transparent; color: #ef4444; border: 1px solid #fee2e2; padding: 0.6rem; border-radius: 10px; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }

          /* Toggle Component Styles */
          .toggle-wrapper { width: 44px; height: 22px; background: #e2e8f0; border-radius: 20px; position: relative; cursor: pointer; transition: background 0.3s; }
          .toggle-wrapper.active { background: #0ea5e9; }
          .toggle-thumb { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .toggle-wrapper.active .toggle-thumb { left: 24px; }
        `}</style>
    </div>
  );
}

function Toggle({ active, onClick }) {
  return (
    <div className={`toggle-wrapper ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="toggle-thumb" />
    </div>
  );
}
