const express = require('express');
const cors = require('cors');

const { tenantMiddleware } = require('./src/middlewares/tenantMiddleware');
const { jwtAuthMiddleware } = require('./src/middlewares/jwtAuthMiddleware');
const { checkPermission } = require('./src/middlewares/checkPermission');
const { requireModule } = require('./src/middlewares/requireModule');
const { User, Tenant, EmployeeProfile, Department, Position } = require('./src/models');

// Import route modules
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const deductionRoutes = require('./src/routes/deductionRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const positionRoutes = require('./src/routes/positionRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const payslipRoutes = require('./src/routes/payslipRoutes');
const holidayRoutes = require('./src/routes/holidayRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const overtimeRoutes = require('./src/routes/overtimeRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const earlyOutRoutes = require('./src/routes/earlyOutRoutes');
const productRoutes = require('./src/routes/productRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const membershipRoutes = require('./src/routes/membershipRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const accessRoutes = require('./src/routes/accessRoutes');
const scheduleRoutes = require('./src/routes/scheduleRoutes');

const app = express();

// ─── CORS (client on :5173 ↔ server on :5000) ───────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
    ];

    // Allow any subdomain of localhost or app.com (for local dev)
    const isAllowedSubdomain = 
      origin.endsWith('.localhost:5173') || 
      origin.endsWith('.localhost:5174') ||
      origin.endsWith('.app.com:5173') ||
      origin.endsWith('.app.com');

    if (allowedOrigins.indexOf(origin) !== -1 || isAllowedSubdomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));

app.use(express.json());

// ─── Health Check (public) ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public Auth Routes (login — no middleware) ──────────────
app.use('/api/auth', authRoutes);

// ─── Auth + Tenant Middleware (all routes below are protected) ─
app.use(jwtAuthMiddleware);
app.use(tenantMiddleware);

// ─── Protected: GET /api/me (session hydration for frontend) ─
app.get('/api/me', async (req, res) => {
  try {
    console.log(`[GET /me] UserID: ${req.user?._id}, Requested TenantID (from header): ${req.tenantId}`);
    
    if (!req.user) {
      console.log('[GET /me] Error: req.user is missing');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenant = await Tenant.findByPk(req.tenantId, {
      attributes: ['_id', 'name', 'subdomain', 'activeModules', 'subscriptionTier', 'logoUrl']
    });

    if (!tenant) {
      console.log(`[GET /me] Error: Tenant not found for ID ${req.tenantId}`);
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const employee = await EmployeeProfile.findOne({ 
      where: { userId: req.user._id },
      attributes: ['_id', 'firstName', 'lastName'],
      include: [
        { model: EmployeeProfile, as: 'manager', attributes: ['firstName', 'lastName'] },
        { model: Department, attributes: ['name', 'color'] },
        { model: Position, attributes: ['name'] }
      ]
    });

    const roles = req.user.Roles || [];
    const permissions = [...new Set(roles.flatMap(role => role.permissions || []))];

    console.log(`[GET /me] Success: User ${req.user.email} accessing ${tenant.subdomain}`);

    res.json({
      user: {
        _id: req.user._id,
        email: req.user.email,
        tenantId: req.user.tenantId,
        roles: roles.map(r => ({ _id: r._id, name: r.name, permissions: r.permissions })),
        permissions,
        employeeProfileId: employee?._id || null,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
      },
      tenant,
    });
  } catch (error) {
    console.error('[GET /me] Exception:', error.stack);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

// ─── Core API Routes (tenant-scoped) ─────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/deductions', deductionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/roles', checkPermission('manage_roles'), roleRoutes);
app.use('/api/settings', checkPermission('manage_settings'), settingsRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/early-out', earlyOutRoutes);

// ─── HR Modules ──────────────────────────────────────────────
app.use('/api/payslips', checkPermission('view_payroll'), payslipRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/deductions', deductionRoutes);

// ─── POS & Wallet Modules ───────────────────────────────────
app.use('/api/products', requireModule('inventory'), productRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/pos', requireModule('pos'), transactionRoutes);
app.use('/api/memberships', requireModule('club_management'), membershipRoutes);
app.use('/api/bookings', requireModule('bookings'), bookingRoutes);
app.use('/api/access', requireModule('access_control'), accessRoutes);
app.use('/api/schedules', requireModule('hr_payroll'), scheduleRoutes);

// ─── Entitlement-Gated Premium Modules ───────────────────────
app.get('/api/v1/payroll', checkPermission('view_payroll'), (req, res) => {
  res.json({ message: 'Payroll accessed' });
});

app.get('/api/v1/inventory', requireModule('inventory'), (req, res) => {
  res.json({ message: 'Inventory accessed' });
});

// ─── Super Admin Routes ──────────────────────────────────────
app.use('/api/admin', adminRoutes);

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

module.exports = app;
