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
    category: 'OVERVIEW',
  },
  {
    id: 'employees',
    title: 'Employees',
    route: '/employees',
    requiredPermission: 'manage_employees',
    requiredModule: 'hr_payroll',
    icon: '👥',
    category: 'CORE HR',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    route: '/attendance',
    requiredPermission: null, // All employees can access their own attendance
    requiredModule: 'hr_payroll',
    icon: '📅',
    category: 'CORE HR',
  },
  {
    id: 'leaves',
    title: 'Leave Requests',
    route: '/leaves',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    icon: '🏖️',
    category: 'CORE HR',
  },
  {
    id: 'overtime',
    title: 'Overtime',
    route: '/overtime',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    icon: '⏳',
    category: 'CORE HR',
  },
  {
    id: 'payslips',
    title: 'Payslips',
    route: '/payslips',
    requiredPermission: 'view_payroll',
    requiredModule: 'hr_payroll',
    icon: '💰',
    category: 'FINANCE',
  },
  {
    id: 'shifts',
    title: 'Shifts',
    route: '/shifts',
    requiredPermission: 'manage_settings',
    requiredModule: 'hr_payroll',
    icon: '⏱️',
    category: 'CORE HR',
  },
  {
    id: 'holidays',
    title: 'Holidays',
    route: '/holidays',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    icon: '🎉',
    category: 'CORE HR',
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    route: '/roles',
    requiredPermission: 'manage_roles',
    icon: '🔐',
    category: 'ADMINISTRATION',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    route: '/inventory',
    requiredPermission: null,
    requiredModule: 'inventory',
    icon: '📦',
    category: 'OPERATIONS',
  },
  {
    id: 'pos',
    title: 'POS',
    route: '/pos',
    requiredPermission: null,
    requiredModule: 'pos',
    icon: '🛒',
    category: 'OPERATIONS',
  },
  {
    id: 'ledger',
    title: 'Financial Ledger',
    route: '/ledger',
    requiredPermission: 'view_ledger',
    requiredModule: 'pos',
    icon: '📜',
    category: 'OPERATIONS',
  },
  {
    id: 'members',
    title: 'Members',
    route: '/employees', // Using employees page for now as a base
    requiredPermission: 'manage_employees',
    requiredModule: 'club_management',
    icon: '👤',
    category: 'CLUB MEMBERSHIP',
  },
  {
    id: 'memberships',
    title: 'Membership Tiers',
    route: '/memberships',
    requiredPermission: 'manage_settings',
    requiredModule: 'club_management',
    icon: '🎫',
    category: 'CLUB MEMBERSHIP',
  },
  {
    id: 'resources',
    title: 'Resources (Courts)',
    route: '/resources',
    requiredPermission: 'manage_settings',
    requiredModule: 'club_management',
    icon: '🏛️',
    category: 'RESOURCES & BOOKING',
  },
  {
    id: 'bookings',
    title: 'Court Bookings',
    route: '/bookings',
    requiredPermission: null,
    requiredModule: 'club_management',
    icon: '🎾',
    category: 'RESOURCES & BOOKING',
  },
  {
    id: 'access-logs',
    title: 'Access Logs',
    route: '/access-logs',
    requiredPermission: 'manage_settings',
    requiredModule: 'club_management',
    icon: '🚪',
    category: 'RESOURCES & BOOKING',
  },
  {
    id: 'settings',
    title: 'Settings',
    route: '/settings',
    requiredPermission: 'manage_settings',
    icon: '⚙️',
    category: 'ADMINISTRATION',
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
          <div className="nav-section">
            <div className="nav-section-title">ADMIN PANEL</div>
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
          </div>
        )}

        {(() => {
          const sections = [];
          let currentCategory = null;
          
          authorizedNavigation.forEach((item) => {
            if (item.category !== currentCategory) {
              currentCategory = item.category;
              sections.push({ type: 'header', title: currentCategory });
            }
            sections.push({ type: 'link', ...item });
          });

          return sections.map((sec, idx) => {
            if (sec.type === 'header') {
              return (
                <div key={`head-${idx}`} className="nav-section-title" style={{ 
                  fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-text-muted)',
                  marginTop: '1.25rem', marginBottom: '0.5rem', letterSpacing: '0.05em', padding: '0 0.75rem'
                }}>
                  {sec.title}
                </div>
              );
            }
            const isActive = location.pathname.startsWith(sec.route);
            return (
              <Link
                key={sec.id}
                to={sec.route}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{sec.icon}</span>
                <span className="sidebar-label">{sec.title}</span>
              </Link>
            );
          });
        })()}
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
