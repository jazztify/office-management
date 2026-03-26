# SaaS Management Platform

A high-performance, multi-tenant enterprise suite designed for modern office management, Filipino HR/Payroll, and IoT-integrated access control.

## 🚀 Unified System Setup

Manage your database and initial system state with a single command for the entire team:

```bash
cd server
npm install
npm run setup
```

This will automatically create your `.env` (if missing), verify the Postgres connection, and initialize the Super Admin and mandatory business roles.

---

## 🏗️ Module Breakdown

The system is architected into 10 core functional modules, each designed for high scalability and secure multi-tenancy.

### 1. Core Infrastructure & Multi-Tenancy
-   **Current Features:**
    *   Subdomain-based tenant isolation.
    *   Subscription tier management (Essentials, Corporate, Enterprise).
    *   Usage telemetry and "Noisy Neighbor" reporting for Super Admins.
    *   Dynamic module activation/deactivation per tenant.
-   **Future Features:**
    *   Custom domain mapping.
    *   White-labeling (Custom CSS/Branding).

### 2. Identity & Access Management (IAM)
-   **Current Features:**
    *   JWT-based authentication with 24h expiration.
    *   Role-Based Access Control (RBAC) with granular permissions.
    *   System-default roles (Super Admin, Admin, Employee, Coach).
    *   Multi-workspace login capabilities.
-   **Future Features:**
    *   Two-Factor Authentication (2FA).
    *   SSO Integration (Google/Office 365).

### 3. Human Capital Management (HCM)
-   **Current Features:**
    *   Rich employee profiles with hierarchical reporting.
    *   Nested Department and Position management.
    *   Advanced classification system for unified roles.
    *   Employee lifecycle tracking (Active/Resigned/Onboarding).
-   **Future Features:**
    *   Automated onboarding/offboarding workflows.
    *   Skill-set & Certification tracking.

### 4. Time & Attendance (T&A)
-   **Current Features:**
    *   **Dual-Punch System**: Manual web-based punching and IoT/RFID hardware punching.
    *   Automated work metrics (Total hours, Late minutes, Undertime).
    *   Grace period and office hour settings per tenant.
    *   Manual overrides with full audit logging (`OverrideLog`).
    *   PHT (Manila) timezone-aware logic.
-   **Future Features:**
    *   Facial Recognition via IoT endpoints.
    *   Geofencing for mobile clock-ins.
    *   AI-powered anomaly detection in attendance patterns.

### 5. Requests & Lifecycle
-   **Current Features:**
    *   **Leave Management**: Vacation, Sick, and Bereavement workflows.
    *   **Overtime & Early-Out**: Manager-approved early clock-out and OT requests.
    *   Multi-level approval status (Pending, Approved, Declined).
-   **Future Features:**
    *   Automated leave credit replenishment.
    *   Shift swapping & trading.

### 6. Payroll & Statutory Deductions
-   **Current Features:**
    *   Bulk payslip generation for entire teams.
    *   **PhilHealth/SSS/Pag-IBIG**: Automatic calculation based on local statutory rules.
    *   Late and Absence deductions based on hourly/daily rates.
    *   Recurring deduction profiles per employee.
    *   Automated 13th-month pay calculation.
    *   Professional PDF export for payslips.
-   **Future Features:**
    *   Tax (BIR) automated filing.
    *   Multi-currency support for international teams.

### 7. Financial & Wallet Suite
-   **Current Features:**
    *   Digital user wallets for cashless internal transactions.
    *   Manual deposit/funding via admin interface.
    *   Commission Ledger for tracking staff incentives/coaching fees.
    *   Real-time transaction history.
-   **Future Features:**
    *   External payment gateway integration (GCash, PayMaya, Stripe).
    *   Subscription billing for Tenants.

### 8. Commerce & POS Engine
-   **Current Features:**
    *   Basic product management and order tracking.
    *   Membership tiers integrated with tenant features.
-   **Future Features:**
    *   Full Point-of-Sale (POS) terminal interface.
    *   Inventory management with low-stock alerts.
    *   Loyalty points & Rewards system.

### 9. Resource & Booking
-   **Current Features:**
    *   Shared resource management (Rooms, Equipment).
    *   Booking system with overlap prevention.
-   **Future Features:**
    *   Recurring booking schedules.
    *   Booking analytics and utilization heatmaps.

### 10. Hardware & Intelligent Office
-   **Current Features:**
    *   IoT Device status monitoring (Online/Offline/Idle).
    *   Hardware Token (RFID/NFC) assignment to users.
    *   Automated Hardware Access logs.
-   **Future Features:**
    *   Direct door-lock control via MQTT/API.
    *   Hardware-triggered notifications.

---

## 🛠️ Technology Stack
-   **Backend**: Node.js & Express
-   **Database**: PostgreSQL
-   **ORM**: Sequelize
-   **Real-time**: WebSockets (ws)
-   **Documentation**: PDFKit (Payslips)
-   **Environment**: Dotenv for universal team configuration.

## 🤝 Contribution
1.  Check the [.env.example](file:///home/ranzel/Projects/officemanagement/office-management/server/.env.example) for required keys.
2.  Follow the [Sprint Board] for active tasks.
3.  Run `npm test` before pushing any database or route changes.
