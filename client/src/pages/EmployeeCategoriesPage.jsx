import { useState, useEffect } from 'react';
import api from '../services/api';

const COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

export default function EmployeeCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', color: COLORS[0] });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/employee-categories');
      setCategories(data);
      setError(null);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/api/employee-categories/${editingId}`, formData);
      } else {
        await api.post('/api/employee-categories', formData);
      }
      setFormData({ name: '', description: '', color: COLORS[0] });
      setShowForm(false);
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/api/employee-categories/${id}`);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Deletion failed');
    }
  };

  const startEdit = (cat) => {
    setFormData({ name: cat.name, description: cat.description || '', color: cat.color });
    setEditingId(cat._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && categories.length === 0) return <div className="p-8 text-center">Loading Categories...</div>;

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-text)' }}>
            🏷️ Employee Categories
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Define custom labels to classify and group your workforce.
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingId(null);
          }}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
        >
          {showForm ? 'Cancel' : '+ New Category'}
        </button>
      </header>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
          <strong>⚠️ Error:</strong> {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem', borderRadius: '16px', background: 'white', border: '1px solid var(--color-primary-subtle)', boxShadow: 'var(--shadow-lg)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
            {editingId ? 'Edit Category' : 'Create New Category'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Category Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Full-time, Consultant, Intern"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly describe what this category represents..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '1rem' }}>Label Color</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    style={{
                      height: '48px',
                      borderRadius: '12px',
                      background: c,
                      border: formData.color === c ? '4px solid white' : 'none',
                      boxShadow: formData.color === c ? '0 0 0 2px var(--color-primary)' : 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.1s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
              <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-background)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Preview Badge:</span>
                <span style={{ 
                  background: formData.color, 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>
                  {formData.name || 'Category Name'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
              {editingId ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {categories.map(cat => (
          <div key={cat._id} className="glass-panel card" style={{ padding: '1.5rem', borderRadius: '16px', position: 'relative', overflow: 'hidden', border: '1px solid #edf2f7' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: cat.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ 
                background: cat.color, 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '0.7rem', 
                fontWeight: '800',
                textTransform: 'uppercase'
              }}>
                {cat.name}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => startEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✏️</button>
                <button onClick={() => handleDelete(cat._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
              {cat.description || 'No description provided.'}
            </p>
          </div>
        ))}

        {categories.length === 0 && !loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0 }}>No categories defined yet.</p>
            <button onClick={() => setShowForm(true)} style={{ marginTop: '1rem', color: 'var(--color-primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Create your first category
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
