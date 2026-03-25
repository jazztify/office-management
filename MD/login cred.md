# Login Details Summary

I have extracted the following login credentials from the system's seed data and testing scripts.

## 👑 System Level (Super Admin)
These credentials provide access to the system-wide administration panel.

| Email | Password | Workspace (Subdomain) |
| :--- | :--- | :--- |
| `owner@system.com` | `password123` | `admin` |
| `admin@system.com` | `adminpassword123` | `admin` |

---

## 🔑 How to Log In
When logging in, the system requires three pieces of information:
1.  **Workspace**: This is your tenant's subdomain (e.g., `admin`, `acme`, or `starter`).
2.  **Email Address**: Your registered email.
3.  **Password**: Your account password.

> [!TIP]
> To access the **Super Admin Panel**, use the workspace `admin`. To access a specific company, use their respective subdomain.

---

## 🏢 Acme Corp (Default Tenant)
Typical setup for a medium-sized company.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Company Admin** | `admin@acme.com` | `password123` |
| **HR Manager** | `hr@acme.com` | `password123` |
| **Employee** | `employee@acme.com` | `password123` |
| **Viewer** | `viewer@acme.com` | `password123` |

---

## 🚀 Starter Co (Small Business Tenant)
Simplified setup for a smaller company.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Company Admin** | `admin@starter.com` | `password123` |

> [!NOTE]
> All passwords except for the alternate test user are set to `password123` by default in the [seed.js](file:///z:/Leznar/Xampp/htdocs/SaaS/office-management/server/seed.js) file.
