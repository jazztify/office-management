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
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  if (tenant?.subdomain === 'admin') {
    return <Navigate to="/system-admin" replace />;
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, leavesRes, birthdaysRes] = await Promise.allSettled([
          api.get('/api/users'),
          api.get('/api/leaves?status=pending&limit=5'),
          api.get('/api/employees/birthdays'),
        ]);

        setStats({
          totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.length : 0,
          pendingLeaves: leavesRes.status === 'fulfilled' ? leavesRes.value.data.pagination?.total || 0 : 0,
        });

        if (birthdaysRes.status === 'fulfilled') {
          // Sort by upcoming birthday
          const today = new Date();
          const currentYear = today.getFullYear();
          const sorted = (birthdaysRes.value.data || [])
            .map(emp => {
              const dob = new Date(emp.dateOfBirth);
              let nextBday = new Date(currentYear, dob.getMonth(), dob.getDate());
              if (nextBday < today) {
                nextBday = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
              }
              const daysUntil = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24));
              return { ...emp, nextBday, daysUntil };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5); // Top 5 upcoming

          setUpcomingBirthdays(sorted);
        }
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
          <h3 className="panel-title">🎂 Upcoming Birthdays</h3>
          <div className="panel-body">
            {upcomingBirthdays.length > 0 ? (
              <div className="birthday-list">
                {upcomingBirthdays.map((emp, i) => (
                  <div key={i} className="birthday-item" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 0', borderBottom: '1px solid var(--color-border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="emp-avatar" style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f687b3, #d53f8c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: '700', color: '#fff',
                      }}>
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {new Date(emp.dateOfBirth).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}
                          {emp.department && ` · ${emp.department}`}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${emp.daysUntil === 0 ? 'badge-success' : emp.daysUntil <= 7 ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                      {emp.daysUntil === 0 ? '🎉 Today!' : emp.daysUntil === 1 ? 'Tomorrow' : `in ${emp.daysUntil} days`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ padding: '1rem 0' }}>No birthday data available yet. Add birthdays in the Employees page.</p>
            )}
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
