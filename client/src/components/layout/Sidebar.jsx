import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import NotificationBell from '../shared/NotificationBell';

const MODULE_HEADERS = {
  dashboard: 'OVERVIEW',
  pos: 'POINT OF SALE',
  wallet: 'DIGITAL WALLET',
  returns: 'RETURNS & RMA',
  hr_payroll: 'PEOPLE & PAYROLL',
  inventory: 'INVENTORY',
  club_management: 'CLUB MEMBERSHIP',
  bookings: 'SERVICE BOOKING',
  access_control: 'IOT & ACCESS',
  crm: 'CRM & MARKETING',
  loyalty: 'LOYALTY REWARDS',
  user_portal: 'USER SELF-SERVICE',
  social_marketing: 'MULTI-SOCIAL BROADCAST',
  administration: 'SYSTEM ADMIN'
};

const navigationConfig = [
  {
    id: 'dashboard',
    title: 'Pulse Dashboard',
    route: '/dashboard',
    requiredPermission: null,
    moduleId: 'dashboard',
    icon: '📊',
  },
  // --- POS ---
  {
    id: 'pos',
    title: 'POS Terminal',
    route: '/pos',
    requiredPermission: null,
    requiredModule: 'pos',
    moduleId: 'pos',
    icon: '🛒',
  },
  {
    id: 'ledger',
    title: 'Transaction Logs',
    route: '/ledger',
    requiredPermission: 'view_ledger',
    requiredModule: 'pos',
    moduleId: 'pos',
    icon: '📜',
  },
  // --- WALLET ---
  {
    id: 'wallet',
    title: 'Digital Wallet',
    route: '/wallet',
    requiredPermission: null,
    requiredModule: 'wallet',
    moduleId: 'wallet',
    icon: '💳',
  },
  // --- RETURNS ---
  {
    id: 'returns',
    title: 'Returns & RMA',
    route: '/returns',
    requiredPermission: null,
    requiredModule: 'returns',
    moduleId: 'returns',
    icon: '🔄',
  },
  // --- HR & PAYROLL ---
  {
    id: 'employees',
    title: 'Employee Directory',
    route: '/employees',
    requiredPermission: 'manage_employees',
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '👥',
  },
  {
    id: 'attendance',
    title: 'Attendance & Logs',
    route: '/attendance',
    requiredPermission: null,
    requiredModule: 'hr_payroll',
    moduleId: 'hr_payroll',
    icon: '⌚',
  },
  // --- INVENTORY ---
  {
    id: 'inventory',
    title: 'Stock Control',
    route: '/inventory',
    requiredPermission: null,
    requiredModule: 'inventory',
    moduleId: 'inventory',
    icon: '📦',
  },
  // --- CLUB MANAGEMENT ---
  {
    id: 'members',
    title: 'Club Members',
    route: '/employees', // Using employees as placeholder
    requiredPermission: 'manage_employees',
    requiredModule: 'club_management',
    moduleId: 'club_management',
    icon: '🏸',
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
  // --- BOOKINGS ---
  {
    id: 'bookings',
    title: 'Booking Engine',
    route: '/bookings',
    requiredPermission: null,
    requiredModule: 'bookings',
    moduleId: 'bookings',
    icon: '📅',
  },
  // --- ACCESS CONTROL ---
  {
    id: 'access_control',
    title: 'IoT Access Logs',
    route: '/access-logs',
    requiredPermission: 'manage_settings',
    requiredModule: 'access_control',
    moduleId: 'access_control',
    icon: '🚪',
  },
  // --- CRM ---
  {
    id: 'crm',
    title: 'CRM Hub',
    route: '/crm',
    requiredPermission: null,
    requiredModule: 'crm',
    moduleId: 'crm',
    icon: '📧',
  },
  // --- LOYALTY ---
  {
    id: 'loyalty',
    title: 'Loyalty Rewards',
    route: '/loyalty',
    requiredPermission: null,
    requiredModule: 'loyalty',
    moduleId: 'loyalty',
    icon: '🎁',
  },
  // --- USER PORTAL ---
  {
    id: 'user_portal',
    title: 'Portal Config',
    route: '/portal-settings',
    requiredPermission: 'manage_settings',
    requiredModule: 'user_portal',
    moduleId: 'user_portal',
    icon: '📱',
  },
  // --- SOCIAL MARKETING ---
  {
    id: 'social_marketing',
    title: 'Multi-Post Broadcaster',
    route: '/social-marketing',
    requiredPermission: null,
    requiredModule: 'social_marketing',
    moduleId: 'social_marketing',
    icon: '🚀',
  },
  // --- ADMINISTRATION ---
  {
    id: 'roles',
    title: 'Roles & Security',
    route: '/roles',
    requiredPermission: 'manage_roles',
    moduleId: 'administration',
    icon: '🔐',
  },
  {
    id: 'system-admin',
    title: 'Owner Panel',
    route: '/system-admin',
    requiredPermission: null,
    moduleId: 'administration',
    icon: '👑',
  },
  {
    id: 'system-settings',
    title: 'Platform Config',
    route: '/system-settings',
    requiredPermission: null,
    moduleId: 'administration',
    icon: '🏢', // Changed icon to distinguish from tenant settings
  },
  {
    id: 'settings',
    title: 'Branch Settings', // Clarified for Super Admin context
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
      // Allow dashboard and tenant settings for Super Admin too
      if (isSystemOwner) {
        if (['dashboard', 'settings', 'system-settings', 'system-admin'].includes(item.id)) return true;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isSystemOwner && hasPermission('*') && (
            <a
              href={(() => {
                const token = localStorage.getItem('token');
                const hostname = window.location.hostname;
                const protocol = window.location.protocol;
                const port = window.location.port ? `:${window.location.port}` : '';
                
                // Use a more robust base domain detection
                let baseDomain = 'localhost';
                if (!hostname.includes('localhost') && hostname !== '127.0.0.1') {
                   const parts = hostname.split('.');
                   baseDomain = parts.slice(-2).join('.');
                }
                
                return `${protocol}//admin.${baseDomain}${port}/system-admin?token=${token}&subdomain=admin`;
              })()}
              className="notification-btn"
              style={{ 
                background: 'var(--color-primary)', 
                color: 'white',
                textDecoration: 'none',
                fontSize: '1.2rem',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
              title="Return to System Owner"
            >
              👑
            </a>
          )}
          {!isSystemOwner && <NotificationBell />}
        </div>
      </div>

      <nav className="sidebar-nav">
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
