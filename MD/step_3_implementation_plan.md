# Step 3 Implementation Plan: POS, Digital Wallet & Financial Ledger 💳💰

This document is a comprehensive guide for an AI (or developer) to implement **Step 3 of the Master Build Sequence**: The Point of Sale (POS), Digital Wallet, and Financial Ledger module.

## Context
- **Stack:** Node.js (Express), React, PostgreSQL (Sequelize ORM).
- **Core Requirement:** Multi-tenancy must be strictly enforced. Every model must belong to a `tenantId`.
- **Primary IDs:** The existing system uses UUIDs (`DataTypes.UUIDV4`) as the primary key `_id` and for references. 

---

## 1. Database Schema Definitions (Sequelize Models)

Create the following models in `server/src/models/`:

### A. `Product.js`
The central inventory item for the cashless POS.
- `_id`: UUID, Primary Key.
- `tenantId`: UUID, Foreign Key (Tenants).
- `name`: String, required.
- `description`: String.
- `SKU`: String.
- `price`: Decimal/Float, required.
- `stockLevel`: Integer, default: 0.
- `isActive`: Boolean, default: true.

### B. `Wallet.js`
The digital wallet for Members/Users to store pre-loaded funds.
- `_id`: UUID, Primary Key.
- `tenantId`: UUID, Foreign Key (Tenants).
- `memberId`: UUID, Foreign Key (Member Profiles - pending Step 4 completion, but set up the reference now if Member exists, otherwise user/employee reference based on who holds the wallet).
- `balance`: Decimal, default: 0.00.
- `currency`: String, default: 'USD'.
- `status`: Enum (Active, Frozen), default 'Active'.

### C. `Transaction.js`
The immutable financial ledger for all money movement.
- `_id`: UUID, Primary Key.
- `tenantId`: UUID, Foreign Key (Tenants).
- `walletId`: UUID, Foreign Key (Wallet).
- `type`: Enum (DEPOSIT, WITHDRAWAL, PURCHASE, REFUND).
- `amount`: Decimal, required (positive for deposits/refunds, negative for purchases/withdrawals).
- `referenceId`: UUID (could link to an order or specific event).
- `description`: String.
- `processedBy`: UUID (Employee/User who processed it, if applicable).

### D. `Order.js` (Optional but Recommended)
To record a POS basket.
- `_id`: UUID, Primary Key.
- `tenantId`: UUID, Foreign Key.
- `walletId`: UUID, Foreign Key (Who paid).
- `totalAmount`: Decimal.
- `items`: JSONB (Array of products, quantities, and snapshotted prices).

---

## 2. Model Associations & Sync

In `server/setup_database.js` (or your associations config):
- `Tenant` has many `Product`, `Wallet`, `Transaction`.
- `Wallet` has many `Transaction`.
- `Transaction` belongs to `Wallet`.
- **Crucial:** Define composite unique constraints if necessary (e.g., `SKU` + `tenantId` must be unique).

---

## 3. Backend API Routes & Controllers

Create routes (e.g., `productRoutes.js`, `walletRoutes.js`, `transactionRoutes.js`) wrapped in existing middlewares:
- Use `tenantMiddleware.js` to ensure the correct tenant scope.
- Use `requireModule.js` (if a distinct module gatekeeper is needed for POS).
- Use `checkPermission.js` for RBAC (e.g., only roles with `manage_inventory` can create products).

**Core Endpoints to Build:**
1. `GET /api/pos/products` (List tenant products)
2. `POST /api/pos/products` (Create product)
3. `POST /api/wallets/fund` (Top-up a wallet - creates a DEPOSIT transaction)
4. `POST /api/pos/checkout` (Process an order: deducts from wallet, verifies balance, creates PURCHASE transaction, creates Order record, updates Product stock).

---

## 4. Frontend Implementation

Create the following UI blocks in `client/src/pages/`:

### A. `InventoryPage.jsx`
- Data table listing products.
- Button to add a new product (Modal to set Name, Price, SKU).
- React Context or Redux slice for inventory state.

### B. `POSPage.jsx`
- The core cashier interface.
- **Left Side:** Grid of products with photos/buttons.
- **Right Side:** Shopping cart/basket with total calculation.
- **Checkout Action:** Requires scanning an NFC / searching a Member's Wallet ID to deduct the funds.

### C. `LedgerPage.jsx`
- A read-only audit log of the `Transactions` table for managers.
- Shows time, type, amount, and associated wallet.

---

## Execution Constraints for the AI

1. **Do not use Mongoose!** The system recently migrated to PostgreSQL. Use standard `sequelize.define` definitions matching `server/src/models/User.js`.
2. Do not introduce hard-coded foreign keys without ensuring the referenced table exists (`Tenants`, `Users`, etc).
3. Always prefix backend routes with the tenant-resolver pattern if that is strict, and use `tenantId` in all queries to prevent data leaks between tenants.
