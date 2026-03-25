import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', sku: '', price: '', stockLevel: '', category: '', imageUrl: ''
  });

  const canManage = hasPermission('manage_inventory') || hasPermission('*');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/api/products');
      setProducts(data);
    } catch (err) {
      setError('Failed to load inventory');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        stockLevel: Number(formData.stockLevel) || 0,
      };

      if (editingId) {
        await api.patch(`/api/products/${editingId}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEdit = (prod) => {
    setEditingId(prod._id);
    setFormData({
      name: prod.name,
      description: prod.description || '',
      sku: prod.sku || '',
      price: prod.price,
      stockLevel: prod.stockLevel,
      category: prod.category || '',
      imageUrl: prod.imageUrl || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', sku: '', price: '', stockLevel: '', category: '', imageUrl: '' });
  };

  const filteredProducts = products.filter((p) => {
    const search = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search) ||
      p.category?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Inventory</h1></div>
        <div className="loading-state">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📦 Inventory</h1>
          <p className="page-subtitle">{products.length} products in stock</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          {canManage && (
            <button className="btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
              {showForm && !editingId ? 'Cancel' : '+ Add Product'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="employee-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <h3 className="form-section-title">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="employee-form-grid">
            <div className="form-group">
              <label>Product Name</label>
              <input type="text" placeholder="e.g. Bottled Water" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>SKU / Barcode</label>
              <input type="text" placeholder="Optional SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Price (₱)</label>
              <input type="number" step="0.01" placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Stock Level</label>
              <input type="number" placeholder="0" value={formData.stockLevel} onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" placeholder="e.g. Beverages" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input type="text" placeholder="https://..." value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea placeholder="Brief description of the product" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Add Product'}</button>
            <button type="button" className="btn-filter" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="empty-state">
                  {searchTerm ? 'No products match your search.' : 'No products found in inventory.'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p._id}>
                  <td className="cell-primary">
                    <div className="employee-cell">
                      <div className="emp-avatar" style={{ borderRadius: '4px' }}>
                        {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{p.name}</span>
                        <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{p.description}</small>
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: '0.8rem', background: 'var(--color-bg)', padding: '2px 4px', borderRadius: '4px' }}>{p.sku || '—'}</code></td>
                  <td><span className="badge badge-muted">{p.category || 'Uncategorized'}</span></td>
                  <td className="cell-money">₱{Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ fontWeight: '600', color: p.stockLevel < 10 ? 'var(--color-danger)' : 'inherit' }}>
                    {p.stockLevel}
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div className="action-group">
                        <button className="btn-sm btn-view" onClick={() => handleEdit(p)}>Edit</button>
                        <button className="btn-sm btn-danger" onClick={() => handleDelete(p._id, p.name)}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
