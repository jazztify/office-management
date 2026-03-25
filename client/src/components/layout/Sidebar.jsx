import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import NotificationBell from '../shared/NotificationBell';

const MODULE_HEADERS = {
  dashboard: 'OVERVIEW',
  hr_payroll: 'HR & PAYROLL',
  inventory: 'INVENTORY MANAGEMENT',
  pos: 'SALES & POS',
  club_management: 'CLUB & BOOKING',
  administration: 'ADMINISTRATION'
};

const navigationConfig = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    route: '/dashboard',
    requiredPermission: null,
    moduleId: 'dashboard',
    icon: '📊',
  },
  {
    id: 'employees',
    title: 'Employees',
    route: '/employees',
    requiredPermission: 'manage_employees',
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '👥',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    route: '/attendance',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '📅',
  },
  {
    id: 'leaves',
    title: 'Leave Requests',
    route: '/leaves',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '🏖️',
  },
  {
    id: 'overtime',
    title: 'Overtime',
    route: '/overtime',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '⏳',
  },
  {
    id: 'payslips',
    title: 'Payslips',
    route: '/payslips',
    requiredPermission: 'view_payroll',
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '💰',
  },
  {
    id: 'shifts',
    title: 'Shifts',
    route: '/shifts',
    requiredPermission: 'manage_settings',
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '⏱️',
  },
  {
    id: 'holidays',
    title: 'Holidays',
    route: '/holidays',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '🎉',
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    route: '/roles',
    requiredPermission: 'manage_roles',
    moduleId: 'administration',
    icon: '🔐',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    route: '/inventory',
    requiredPermission: null,
    requiredModule: 'inventory',
    moduleId: 'inventory',
    icon: '📦',
  },
  {
    id: 'pos',
    title: 'POS',
    route: '/pos',
    requiredPermission: null,
    requiredModule: 'pos',
    moduleId: 'pos',
    icon: '🛒',
  },
  {
    id: 'ledger',
    title: 'Financial Ledger',
    route: '/ledger',
    requiredPermission: 'view_ledger',
    requiredModule: 'pos',
    moduleId: 'pos',
    icon: '📜',
  },
  {
    id: 'members',
    title: 'Members',
    route: '/employees',
    requiredPermission: 'manage_employees',
    requiredModule: 'club_management',
    moduleId: 'club_management',
    icon: '👤',
  },
  {
    id: 'memberships',
    title: 'Membership Tiers',
    route: '/memberships',
    requiredPermission: 'manage_settings',
    requiredModule: 'club_management',
    moduleId: 'club_management',
    icon: '🎫',
  },
  {
    id: 'resources',
    title: 'Resources (Courts)',
    route: '/resources',
    requiredPermission: 'manage_settings',
    requiredModule: 'club_management',
    moduleId: 'club_management',
    icon: '🏛️',
  },
  {
    id: 'bookings',
    title: 'Court Bookings',
    route: '/bookings',
    requiredPermission: null,
    requiredModule: 'club_management',
    moduleId: 'club_management',
    icon: '🎾',
  },
  {
    id: 'access-logs',
    title: 'Access Logs',
    route: '/access-logs',
    requiredPermission: 'manage_settings',
    requiredModule: 'club_management',
    moduleId: 'club_management',
    icon: '🚪',
  },
  {
    id: 'settings',
    title: 'Settings',
    route: '/settings',
    requiredPermission: 'manage_settings',
    moduleId: 'administration',
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
        {!isSystemOwner && <NotificationBell />}
      </div>

      <nav className="sidebar-nav">
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
          let currentModuleId = null;
          
          authorizedNavigation.forEach((item) => {
            if (item.moduleId !== currentModuleId) {
              currentModuleId = item.moduleId;
              sections.push({ type: 'header', title: MODULE_HEADERS[currentModuleId] });
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
