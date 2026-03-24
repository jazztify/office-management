const express = require('express');
const { Op } = require('sequelize');
const { Tenant, User, Role, EmployeeProfile, sequelize } = require('../models');
const { hashPassword } = require('../services/authService');

const router = express.Router();

/**
 * GET /api/admin/tenants
 * Super Admin: List all tenants with usage metrics
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await Tenant.findAll();

    const tenantsWithMetrics = await Promise.all(
      tenants.map(async (tenant) => {
        const userCount = await User.count({ where: { tenantId: tenant._id } });
        const employeeCount = await EmployeeProfile.count({ where: { tenantId: tenant._id } });

        return {
          ...tenant.toJSON(),
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
 */
router.post('/tenants', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      subdomain,
      subscriptionTier,
      activeModules,
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
    const existing = await Tenant.findOne({ where: { subdomain } });
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
    }, { transaction });

    // 2. Create default roles
    const adminRole = await Role.create({
      tenantId: tenant._id,
      name: 'Super Admin',
      description: 'Full access to everything',
      isSystemDefault: true,
      permissions: ['*'],
    }, { transaction });

    await Role.create({
      tenantId: tenant._id,
      name: 'HR Manager',
      description: 'Manages employees, attendance, leaves, payroll',
      permissions: [
        'manage_employees', 'edit_attendance', 'manage_leaves',
        'view_payroll', 'manage_roles', 'manage_settings',
        'manage_holidays', 'generate_payslip',
      ],
    }, { transaction });

    await Role.create({
      tenantId: tenant._id,
      name: 'Employee',
      description: 'Basic employee access',
      permissions: ['edit_attendance'],
    }, { transaction });

    // 3. Create admin user
    let adminUser = null;
    if (adminEmail && adminPassword) {
      const passwordHash = hashPassword(adminPassword);

      adminUser = await User.create({
        email: adminEmail,
        passwordHash,
        tenantId: tenant._id,
      }, { transaction });

      // Associate role
      await adminUser.addRole(adminRole, { transaction });

      // Create employee profile
      await EmployeeProfile.create({
        tenantId: tenant._id,
        userId: adminUser._id,
        firstName: adminFirstName || 'Admin',
        lastName: adminLastName || name,
        department: 'Management',
        position: 'Administrator',
        salary: 0,
        leaveCredits: { vacation: 20, sick: 10, bereavement: 5 },
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      message: `Tenant "${name}" created successfully!`,
      tenant,
      adminAccount: adminUser ? {
        email: adminUser.email,
        workspace: subdomain,
      } : null,
    });
  } catch (err) {
    await transaction.rollback();
    console.error('POST /admin/tenants Error:', err.message);
    res.status(500).json({ error: 'Failed to create tenant: ' + err.message });
  }
});

/**
 * PATCH /api/admin/tenants/:id
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

    const [updatedCount, updatedRows] = await Tenant.update(updates, {
      where: { _id: req.params.id },
      returning: true
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(updatedRows[0]);
  } catch (err) {
    console.error('PATCH /admin/tenants/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * DELETE /api/admin/tenants/:id
 */
router.delete('/tenants/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const tenantId = req.params.id;
    
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Cascading delete across all scoped models
    await User.destroy({ where: { tenantId }, transaction });
    await Role.destroy({ where: { tenantId }, transaction });
    await EmployeeProfile.destroy({ where: { tenantId }, transaction });
    await Tenant.destroy({ where: { _id: tenantId }, transaction });

    await transaction.commit();
    res.json({ message: 'Tenant successfully deleted' });
  } catch (err) {
    await transaction.rollback();
    console.error('DELETE /admin/tenants/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

/**
 * GET /api/admin/telemetry
 */
router.get('/telemetry', async (req, res) => {
  try {
    const totalTenants = await Tenant.count();
    const activeTenants = await Tenant.count({ where: { status: 'active' } });
    const suspendedTenants = await Tenant.count({ where: { status: 'suspended' } });
    const totalUsers = await User.count();

    // Group users by tenant
    const userDistribution = await User.findAll({
      attributes: [
        'tenantId',
        [sequelize.fn('COUNT', sequelize.col('_id')), 'count']
      ],
      group: ['tenantId'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 20,
    });

    const enrichedDistribution = await Promise.all(
      userDistribution.map(async (entry) => {
        const tenant = await Tenant.findByPk(entry.tenantId, {
          attributes: ['name', 'subdomain']
        });
        return {
          tenant: tenant ? tenant.name : 'Unknown',
          subdomain: tenant ? tenant.subdomain : 'unknown',
          userCount: parseInt(entry.get('count')),
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
