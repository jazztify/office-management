import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import NotificationBell from '../shared/NotificationBell';

const navigationConfig = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    route: '/dashboard',
    requiredPermission: null,
    icon: '📊',
  },
  {
    id: 'employees',
    title: 'Employees',
    route: '/employees',
    requiredPermission: 'manage_employees',
    icon: '👥',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    route: '/attendance',
    requiredPermission: null, // All employees can access their own attendance
    icon: '📅',
  },
  {
    id: 'leaves',
    title: 'Leave Requests',
    route: '/leaves',
    requiredPermission: null,
    icon: '🏖️',
  },
  {
    id: 'overtime',
    title: 'Overtime',
    route: '/overtime',
    requiredPermission: null,
    icon: '⏳',
  },
  {
    id: 'payslips',
    title: 'Payslips',
    route: '/payslips',
    requiredPermission: 'view_payroll',
    icon: '💰',
  },
  {
    id: 'shifts',
    title: 'Shifts',
    route: '/shifts',
    requiredPermission: 'manage_settings',
    icon: '⏱️',
  },
  {
    id: 'holidays',
    title: 'Holidays',
    route: '/holidays',
    requiredPermission: null,
    icon: '🎉',
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    route: '/roles',
    requiredPermission: 'manage_roles',
    icon: '🔐',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    route: '/inventory',
    requiredPermission: null,
    requiredModule: 'inventory',
    icon: '📦',
  },
  {
    id: 'settings',
    title: 'Settings',
    route: '/settings',
    requiredPermission: 'manage_settings',
    icon: '⚙️',
  },
];

export default function Sidebar() {
  const { user, hasPermission, logout } = useAuth();
  const { tenant, hasModule } = useTenant();
  const location = useLocation();

  const isSystemOwner = tenant?.subdomain === 'admin';

  const authorizedNavigation = useMemo(() => {
    return navigationConfig.filter((item) => {
      // System Owner manages companies, they don't use HR features
      if (isSystemOwner && item.id !== 'settings') {
        return false;
      }
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
        return false;
      }
      if (item.requiredModule && !hasModule(item.requiredModule)) {
        return false;
      }
      return true;
    });
  }, [hasPermission, hasModule, isSystemOwner]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt="Company Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }} />
          ) : (
            <span className="logo-icon">{isSystemOwner ? '👑' : '◆'}</span>
          )}
          <div>
            <h2 className="logo-title">{tenant?.name || 'SaaS Platform'}</h2>
            <span className="logo-tier">
              {isSystemOwner ? 'system owner' : `${tenant?.subscriptionTier || 'free'} tier`}
            </span>
          </div>
        </div>
        {/* Notification Bell */}
        {!isSystemOwner && <NotificationBell />}
      </div>

      <nav className="sidebar-nav">
        {/* System Owner Panel links - only for owner */}
        {isSystemOwner && (
          <>
            <Link
              to="/system-admin"
              className={`sidebar-link ${location.pathname === '/system-admin' ? 'active' : ''}`}
              style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem', paddingBottom: '0.75rem' }}
            >
              <span className="sidebar-icon">👑</span>
              <span className="sidebar-label">Owner Panel</span>
            </Link>
            <Link
              to="/system-settings"
              className={`sidebar-link ${location.pathname === '/system-settings' ? 'active' : ''}`}
            >
              <span className="sidebar-icon">⚙️</span>
              <span className="sidebar-label">System Settings</span>
            </Link>
          </>
        )}

        {authorizedNavigation.map((item) => {
          const isActive = location.pathname.startsWith(item.route);
          return (
            <Link
              key={item.id}
              to={item.route}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            {isSystemOwner ? '👑' : user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="user-info">
            <span className="user-email">{user?.email || 'user@example.com'}</span>
            <span className="user-role">
              {isSystemOwner ? 'System Owner' : user?.roles?.[0]?.name || 'Member'}
            </span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Logout">
          ↪
        </button>
      </div>
    </aside>
  );
}
