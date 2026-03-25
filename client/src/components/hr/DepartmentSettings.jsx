import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DepartmentSettings({ departments, onUpdate, initialData }) {
  const [formData, setFormData] = useState({ name: '', description: '', color: '#4f46e5' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        name: initialData.name, 
        description: initialData.description || '', 
        color: initialData.color || '#4f46e5' 
      });
      setEditingId(initialData._id);
    } else {
      setFormData({ name: '', description: '', color: '#4f46e5' });
      setEditingId(null);
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/api/departments/${editingId}`, formData);
      } else {
        await api.post('/api/departments', formData);
      }
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save department');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Are you sure? This will fail if there are active positions in this department.')) return;
    try {
      await api.delete(`/api/departments/${editingId}`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete department');
    }
  };

  return (
    <div className="node-editor-form animate-fade-in">
       <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="form-column">
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="matrix-label">Department Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  placeholder="e.g. Operations, Marketing..."
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="matrix-label">Identity Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="color" 
                    value={formData.color} 
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
                    style={{ height: '42px', width: '60px', padding: '2px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>HEX CODE</p>
                    <code style={{ fontSize: '0.9rem', color: formData.color }}>{formData.color.toUpperCase()}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-column">
              <div className="form-group">
                <label className="matrix-label">Department Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summarize the core responsibilities of this department..."
                  rows="6"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-save" style={{ margin: 0 }}>
                {editingId ? 'Update Department' : 'Create Department'}
              </button>
            </div>
            {editingId && (
              <button type="button" className="btn-delete" onClick={handleDelete} style={{ margin: 0 }}>
                Delete Department
              </button>
            )}
          </div>
       </form>

       <style>{`
          .matrix-label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block; }
          .btn-save { background: #0ea5e9; color: white; padding: 0.8rem 2.5rem; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
          .btn-delete { background: transparent; color: #ef4444; border: 1px solid #fee2e2; padding: 0.8rem 1.5rem; border-radius: 10px; font-weight: 600; cursor: pointer; }
       `}</style>
    </div>
  );
}
