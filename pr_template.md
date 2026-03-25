# [PR Title]
## feat: Modernize Tenant Management UI & Unify Module Toggle Logic

## Description
This PR focuses on the complete modernization of the Super Admin "Tenant Management" experience and the implementation of a unified, reliable module toggling system.

### 🍱 UI/UX Modernization (Light & Minimalistic)
- **Refactor `SuperAdminPage.jsx`**: Replaced fragmented vertical forms with a high-performance, tabbed `TenantModal` (General, Modules, Billing).
- **Design System Update**: Updated global design tokens in `index.css` to a modern light theme (slate white backgrounds, indigo primary).
- **Module Selection Grid**: Replaced cluttered checkboxes with an interactive, category-based card selection UI.

### 🔄 Module Synchronization & Infrastructure
- **Unified Module Keys**: Unified the frontend (`Sidebar.jsx`) and backend toggles using canonical keys:
    - `hr_payroll`: Single toggle for the entire HR & Finance suite.
    - `club_management`: Unified control for Memberships, Bookings, and Access Logs.
- **Real-time Session Heartbeat**: Added a 5-minute heartbeat in `TenantContext.jsx` and an immediate refresh trigger in `AuthContext.jsx` to ensure administrative changes propagate without manual logouts.
- **Action Dashboard**: Re-implemented essential administrative actions (Suspend/Activate and Workspace Hotlinks) in the branch distribution table.

### 🛠️ Stability & Performance
- **Whitescreen Mitigation**: Fixed a `ReferenceError` related to `useEffect` in the context providers.
- **Middleware Stability**: Resolved earlier conflicts with `jwtAuthMiddleware` and restored Super Admin authorization helpers.

## Type of Change
- [x] New feature (non-breaking change which adds functionality)
- [x] Refactor (UI modernization and code cleanup)
- [x] Bug fix (Module sync and context crash fixes)

## Verification Plan
1. **Super Admin Audit**: Log in as `owner@system.com`, verify the new tabbed modal, and toggle modules for a test tenant.
2. **Tenant Consistency**: Log in as the test tenant and verify the sidebar navigation strictly matches the assigned `hr_payroll` or `club_management` permissions.
3. **Session Sync**: Update a tenant's modules while logged into that tenant in another tab; verify the sidebar updates automatically within the heartbeat period (or upon force refresh).

## Screenshots
Refer to the `walkthrough.md` for visual proof of the new Light Modern UI.
