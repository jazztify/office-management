import { useState, useEffect } from 'react';
import api from '../services/api';

export default function LedgerPage() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data } = await api.get('/api/pos/transactions');
      setTransactions(data);
    } catch (err) {
      setError('Failed to load ledger');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d) => {
    return new Date(d).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) return <div className="page-container">Loading ledger...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📜 Financial Ledger</h1>
          <p className="page-subtitle">Real-time audit log of all cashless transactions</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Reference</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Description</th>
              <th className="cell-money">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No transactions recorded yet.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx._id}>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{formatDate(tx.createdAt)}</td>
                  <td>
                    <code style={{ fontSize: '0.75rem', background: 'var(--color-bg)', padding: '2px 4px', borderRadius: '4px' }}>
                      {tx.referenceId ? tx.referenceId.substring(0, 8) : 'MANUAL'}
                    </code>
                  </td>
                  <td className="cell-primary">
                    {tx.Wallet?.User?.email || 'System'}
                  </td>
                  <td>
                    <span className={`badge ${
                      tx.type === 'DEPOSIT' ? 'badge-success' : 
                      tx.type === 'PURCHASE' ? 'badge-primary' : 
                      tx.type === 'WITHDRAWAL' ? 'badge-danger' : 'badge-muted'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tx.description}>
                    {tx.description}
                  </td>
                  <td className={`cell-money`} style={{ 
                    fontWeight: '700', 
                    color: parseFloat(tx.amount) > 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {parseFloat(tx.amount) > 0 ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
