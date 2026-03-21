# Office Management System (SaaS)

A comprehensive Office Management System built with the MERN stack (MongoDB, Express, React, Node.js). This platform supports multi-tenancy, allowing multiple companies to manage their employees, attendance, payroll, and more.

## 🚀 Features

- **Multi-tenancy**: Isolated data for each company (tenant).
- **Authentication & RBAC**: Secure login with Role-Based Access Control (Super Admin, Admin, HR Manager, Employee, Viewer).
- **Employee Management**: Manage employee profiles, roles, and permissions.
- **Attendance Tracking**: Clock-in/out functionality with lunch break tracking.
- **Holiday Management**: Configuration of company-wide and government holidays.
- **Payroll**: (In Progress) Processing payroll based on attendance and deductions.
- **Support for Subdomains**: (Simulated) Tenant identification via headers.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), React Router, TailwindCSS (for styling), Axios.
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Mongoose).
- **Testing**: Jest, Supertest.

## 📦 Project Structure

```text
/
├── client/           # React frontend (Vite)
└── server/           # Express backend
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or via Atlas)

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
   # Create a .env file based on example
   npm run dev
   ```

3. **Client Setup**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

## 🤝 Collaboration

This repository is set up for collaborative development. Please branch out for new features and create pull requests for review.

## 📜 License

Internal / ISC License.
