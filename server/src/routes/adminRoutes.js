const express = require('express');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Role = require('../models/Role');
const EmployeeProfile = require('../models/EmployeeProfile');
const { hashPassword } = require('../services/authService');

const router = express.Router();

/**
 * GET /api/admin/tenants
 * Super Admin: List all tenants with usage metrics
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await Tenant.find().lean();

    const tenantsWithMetrics = await Promise.all(
      tenants.map(async (tenant) => {
        const userCount = await User.countDocuments({ tenantId: tenant._id });
        const employeeCount = await EmployeeProfile.countDocuments({ tenantId: tenant._id });

        return {
          ...tenant,
          metrics: { userCount, employeeCount },
        };
      })
    );

    res.json(tenantsWithMetrics);
  } catch (err) {
    console.error('GET /admin/tenants Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

/**
 * POST /api/admin/tenants
 * Super Admin: Create a new tenant with its admin account
 * This creates the company/branch + admin user + default roles automatically
 */
router.post('/tenants', async (req, res) => {
  try {
    const {
      name,
      subdomain,
      subscriptionTier,
      activeModules,
      // Admin account details
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      logoUrl,
    } = req.body;

    if (!name || !subdomain) {
      return res.status(400).json({ error: 'Company name and subdomain are required' });
    }

    // Check for duplicate subdomain
    const existing = await Tenant.findOne({ subdomain });
    if (existing) {
      return res.status(409).json({ error: `Subdomain '${subdomain}' is already taken` });
    }

    // 1. Create the tenant
    const tenant = await Tenant.create({
      name,
      subdomain,
      subscriptionTier: subscriptionTier || 'free',
      activeModules: activeModules || [],
      logoUrl,
    });

    // 2. Create default roles for this tenant
    const adminRole = await Role.create({
      tenantId: tenant._id,
      name: 'Super Admin',
      description: 'Full access to everything',
      isSystemDefault: true,
      permissions: ['*'],
    });

    await Role.create({
      tenantId: tenant._id,
      name: 'HR Manager',
      description: 'Manages employees, attendance, leaves, payroll',
      permissions: [
        'manage_employees', 'edit_attendance', 'manage_leaves',
        'view_payroll', 'manage_roles', 'manage_settings',
        'manage_holidays', 'generate_payslip',
      ],
    });

    await Role.create({
      tenantId: tenant._id,
      name: 'Employee',
      description: 'Basic employee access',
      permissions: ['edit_attendance'],
    });

    // 3. Create admin user if credentials provided
    let adminUser = null;
    if (adminEmail && adminPassword) {
      const passwordHash = hashPassword(adminPassword);

      adminUser = await User.create({
        email: adminEmail,
        passwordHash,
        tenantId: tenant._id,
        roles: [adminRole._id],
      });

      // Create employee profile for admin
      await EmployeeProfile.create({
        tenantId: tenant._id,
        userId: adminUser._id,
        firstName: adminFirstName || 'Admin',
        lastName: adminLastName || name,
        department: 'Management',
        position: 'Administrator',
        salary: 0,
        leaveCredits: { vacation: 20, sick: 10, bereavement: 5 },
      });
    }

    res.status(201).json({
      message: `Tenant "${name}" created successfully!`,
      tenant,
      adminAccount: adminUser ? {
        email: adminUser.email,
        workspace: subdomain,
      } : null,
      roles: ['Super Admin', 'HR Manager', 'Employee'],
    });
  } catch (err) {
    console.error('POST /admin/tenants Error:', err.message);
    res.status(500).json({ error: 'Failed to create tenant: ' + err.message });
  }
});

/**
 * PATCH /api/admin/tenants/:id
 * Super Admin: Update tenant subscription, modules, or status
 */
router.patch('/tenants/:id', async (req, res) => {
  try {
    const allowedUpdates = ['name', 'status', 'subscriptionTier', 'activeModules', 'customDomain', 'logoUrl'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (err) {
    console.error('PATCH /admin/tenants/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * DELETE /api/admin/tenants/:id
 * Super Admin: Delete a tenant completely
 */
router.delete('/tenants/:id', async (req, res) => {
  try {
    const tenantId = req.params.id;
    
    // Check if tenant exists
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // You could also delete users, roles, employees, etc., but deleting the tenant record is the first step.
    await Tenant.findByIdAndDelete(tenantId);
    
    // Optionally delete cascading data:
    await User.deleteMany({ tenantId });
    await Role.deleteMany({ tenantId });
    await EmployeeProfile.deleteMany({ tenantId });
    // Any other scoped models can be left hanging or deleted via a cron job or here.

    res.json({ message: 'Tenant successfully deleted' });
  } catch (err) {
    console.error('DELETE /admin/tenants/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

/**
 * GET /api/admin/telemetry
 * Super Admin: System-wide telemetry
 */
router.get('/telemetry', async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'active' });
    const suspendedTenants = await Tenant.countDocuments({ status: 'suspended' });
    const totalUsers = await User.countDocuments();

    const userDistribution = await User.aggregate([
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    const enrichedDistribution = await Promise.all(
      userDistribution.map(async (entry) => {
        const tenant = await Tenant.findById(entry._id).select('name subdomain').lean();
        return {
          tenant: tenant ? tenant.name : 'Unknown',
          subdomain: tenant ? tenant.subdomain : 'unknown',
          userCount: entry.count,
        };
      })
    );

    res.json({
      overview: { totalTenants, activeTenants, suspendedTenants, totalUsers },
      noisyNeighborReport: enrichedDistribution,
    });
  } catch (err) {
    console.error('GET /admin/telemetry Error:', err.message);
    res.status(500).json({ error: 'Failed to generate telemetry' });
  }
});

module.exports = router;
