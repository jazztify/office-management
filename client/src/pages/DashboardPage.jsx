import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';

export default function DashboardPage() {
  const { user, permissions } = useAuth();
  const { tenant, activeModules } = useTenant();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEmployees: 0,
    pendingLeaves: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  if (tenant?.subdomain === 'admin') {
    return <Navigate to="/system-admin" replace />;
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, leavesRes] = await Promise.allSettled([
          api.get('/api/users'),
          api.get('/api/leaves?status=pending&limit=5'),
        ]);

        setStats({
          totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.length : 0,
          pendingLeaves: leavesRes.status === 'fulfilled' ? leavesRes.value.data.pagination?.total || 0 : 0,
        });
      } catch (err) {
        console.error('Dashboard stats error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          Welcome back to <strong>{tenant?.name || 'your workspace'}</strong>
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{isLoading ? '—' : stats.totalUsers}</span>
            <span className="stat-label">Team Members</span>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-value">{isLoading ? '—' : stats.pendingLeaves}</span>
            <span className="stat-label">Pending Leaves</span>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <span className="stat-value">{activeModules.length}</span>
            <span className="stat-label">Active Modules</span>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <span className="stat-value">{permissions.length}</span>
            <span className="stat-label">Permissions</span>
          </div>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h3 className="panel-title">Your Access</h3>
          <div className="panel-body">
            <div className="access-info">
              <div className="access-row">
                <span className="access-label">Email</span>
                <span className="access-value">{user?.email}</span>
              </div>
              <div className="access-row">
                <span className="access-label">Roles</span>
                <div className="badge-group">
                  {user?.roles?.map((role, i) => (
                    <span key={i} className="badge badge-primary">
                      {role.name}
                    </span>
                  )) || <span className="badge badge-muted">No roles</span>}
                </div>
              </div>
              <div className="access-row">
                <span className="access-label">Tier</span>
                <span className={`badge badge-tier-${tenant?.subscriptionTier || 'free'}`}>
                  {tenant?.subscriptionTier || 'free'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-title">Active Modules</h3>
          <div className="panel-body">
            {activeModules.length > 0 ? (
              <div className="module-list">
                {activeModules.map((mod, i) => (
                  <div key={i} className="module-item">
                    <span className="module-dot active"></span>
                    <span>{mod}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No premium modules active. Upgrade to unlock.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
