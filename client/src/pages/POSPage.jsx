import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [wallet, setWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchWallet(selectedUserId);
    } else {
      setWallet(null);
    }
  }, [selectedUserId]);

  const fetchData = async () => {
    try {
      const [prodRes, userRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/users')
      ]);
      setProducts(prodRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWallet = async (uid) => {
    try {
      const { data } = await api.get(`/api/wallets/${uid}`);
      setWallet(data);
    } catch (err) {
      console.error('Failed to load wallet:', err);
    }
  };

  const addToCart = (product) => {
    if (product.stockLevel <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stockLevel) return prev;
        return prev.map(item => 
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item._id === productId) {
        const newQty = item.quantity + delta;
        const prod = products.find(p => p._id === productId);
        if (newQty <= 0) return item;
        if (newQty > prod.stockLevel) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!selectedUserId) return alert('Please select a customer/user');
    if (!cart.length) return alert('Cart is empty');
    if (wallet && parseFloat(wallet.balance) < total) return alert('Insufficient balance');

    setIsProcessing(true);
    try {
      await api.post('/api/pos/checkout', {
        userId: selectedUserId,
        items: cart.map(item => ({ productId: item._id, quantity: item.quantity }))
      });
      alert('Transaction Successful!');
      setCart([]);
      setSelectedUserId('');
      fetchData(); // Refresh stock
    } catch (err) {
      alert(err.response?.data?.error || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="page-container">Loading POS...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🛒 Point of Sale</h1>
          <p className="page-subtitle">Cashless checkout system</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left: Product Grid */}
        <div>
          <div className="search-box" style={{ marginBottom: '1.5rem' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              className="search-input"
              style={{ width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {filteredProducts.map(product => (
              <div 
                key={product._id} 
                className={`panel ${product.stockLevel <= 0 ? 'disabled' : ''}`}
                style={{ 
                  cursor: product.stockLevel > 0 ? 'pointer' : 'not-allowed',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'transform 0.2s',
                  border: cart.find(i => i._id === product._id) ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'
                }}
                onClick={() => addToCart(product)}
              >
                <div style={{ height: '100px', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifySelf: 'center', borderRadius: '4px', overflow: 'hidden' }}>
                  {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem', opacity: 0.5 }}>📦</span>}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{product.name}</div>
                  <div style={{ color: 'var(--color-primary)', fontWeight: '700' }}>₱{Number(product.price).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{product.category || 'Misc'}</span>
                  <span style={{ fontSize: '0.75rem', color: product.stockLevel < 10 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    Qty: {product.stockLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="panel" style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8rem)', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🧺</span> Current Order
          </h3>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Customer / Member</label>
            <select 
              className="select-input" 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select Customer</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.email}</option>
              ))}
            </select>
            {wallet && (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                background: 'var(--color-bg)', 
                borderRadius: '8px',
                borderLeft: `4px solid ${parseFloat(wallet.balance) < total ? 'var(--color-danger)' : 'var(--color-success)'}`
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>₱{Number(wallet.balance).toLocaleString()}</div>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛒</div>
                <p>Basket is empty</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cart.map(item => (
                  <div key={item._id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>₱{Number(item.price).toLocaleString()} × {item.quantity}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button onClick={() => updateQuantity(item._id, -1)} style={{ width: '24px', height: '24px', background: 'var(--color-bg)', borderRadius: '4px' }}>-</button>
                      <span style={{ width: '24px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, 1)} style={{ width: '24px', height: '24px', background: 'var(--color-bg)', borderRadius: '4px' }}>+</button>
                    </div>
                    <button onClick={() => removeFromCart(item._id)} style={{ color: 'var(--color-danger)', fontSize: '1.2rem' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>Total Amount</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>₱{total.toLocaleString()}</span>
            </div>
            
            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '1rem' }}
              disabled={!cart.length || !selectedUserId || isProcessing || (wallet && parseFloat(wallet.balance) < total)}
              onClick={handleCheckout}
            >
              {isProcessing ? 'Processing...' : 'Complete Purchase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
