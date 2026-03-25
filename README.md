# Office Management System (SaaS)

A comprehensive Office Management System built with a modern stack (**Node.js, Express, PostgreSQL, Sequelize, React**). This platform supports multi-tenancy, allowing multiple companies to manage their employees, attendance, payroll, and more.

## 🚀 Features

- **Multi-tenancy**: Isolated data for each company (tenant) with unique subdomains.
- **Authentication & RBAC**: Secure login with Role-Based Access Control (Super Admin, Admin, HR Manager, Employee, etc.).
- **Employee Management**: Manage employee profiles, roles, and permissions within each tenant.
- **Attendance Tracking**: Clock-in/out functionality with support for overtime and automatic late/absent calculations.
- **Holiday Management**: Configuration of company-wide and government holidays.
- **Payroll**: Automated payslip generation with support for Philippine statutory deductions (SSS, PhilHealth, Pag-IBIG), 13th month pay, and holiday pay.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), React Router, Vanilla CSS (Premium Design), Axios.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (Sequelize ORM).
- **Testing**: Jest, Supertest.

## 📦 Project Structure

```text
/
├── client/           # React frontend (Vite)
└── server/           # Express backend (Node.js/Sequelize)
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (Running locally or via Amazon RDS/Supabase)

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jazztify/office-management.git
   cd office-management
   ```

2. **Server Setup**:
   ```bash
   cd server
   npm install
   # Create a .env file (copy from example if available)
   npm run setup    # Initial migration and seeding
   npm run dev      # Start dev server
   ```

3. **Client Setup**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

### 🔑 Default Credentials
After running `npm run setup`, you can log in with:
- **Tenant (Subdomain):** `admin`
- **Email:** `admin@system.com`
- **Password:** `adminpassword123`

## 🤝 Collaboration

This repository is set up for collaborative development. Please branch out for new features and create pull requests for review.

## 📜 License

Internal / ISC License.
