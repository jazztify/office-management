export default function InventoryPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📦 Inventory</h1>
          <p className="page-subtitle">Track assets, supplies, and stock levels</p>
        </div>
      </div>
      
      <div className="dashboard-panels">
        <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>All Systems Nominal</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Inventory module coming soon!</p>
        </div>
      </div>
    </div>
  );
}
