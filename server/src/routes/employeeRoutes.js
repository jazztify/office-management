const express = require('express');
const { Op } = require('sequelize');
const { EmployeeProfile, User, Role, Department, Position } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');
const { hashPassword } = require('../services/authService');

const router = express.Router();

/**
 * GET /api/employees
 * List all employees in the current tenant workspace
 */
router.get('/', checkPermission('manage_employees'), async (req, res) => {
  try {
    const employees = await EmployeeProfile.findAll({
      where: { tenantId: req.tenantId },
      include: [
        { model: User, attributes: ['email', 'isActive'] },
        { model: Role, attributes: ['name', 'color'] },
        { model: Department, attributes: ['name', 'color'] },
        { model: Position, attributes: ['name'] }
      ]
    });

    res.json(employees);
  } catch (err) {
    console.error('GET /employees Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

/**
 * GET /api/employees/birthdays
 */
router.get('/birthdays', async (req, res) => {
  try {
    const { month } = req.query;
    const employees = await EmployeeProfile.findAll({
      where: {
        tenantId: req.tenantId,
        dateOfBirth: { [Op.ne]: null },
      },
      attributes: ['_id', 'firstName', 'lastName', 'dateOfBirth'],
      include: [{ model: Department, attributes: ['name'] }]
    });

    // If month filter is provided, filter by birth month
    let filtered = employees.map(e => e.toJSON());
    if (month) {
      const m = parseInt(month);
      filtered = filtered.filter(emp => {
        const dob = new Date(emp.dateOfBirth);
        return dob.getMonth() + 1 === m;
      });
    }

    res.json(filtered);
  } catch (err) {
    console.error('GET /employees/birthdays Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

/**
 * GET /api/employees/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const employee = await EmployeeProfile.findOne({
      where: { _id: req.params.id, tenantId: req.tenantId },
      include: [
        { model: User, attributes: ['email', 'isActive'] },
        { model: EmployeeProfile, as: 'manager', attributes: ['firstName', 'lastName'] },
        { model: Role, attributes: ['name', 'color'] },
        { model: Department, attributes: ['name', 'color'] },
        { model: Position, attributes: ['name'] }
      ]
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('GET /employees/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

/**
 * POST /api/employees
 */
router.post('/', checkPermission('manage_employees'), async (req, res) => {
  try {
    let { 
      userId, firstName, lastName, departmentId, managerId, positionId, 
      salary, dateOfBirth, hireDate, createAccount, email, password, 
      hourlyRate, commissionRate, onboardingStatus, staffType 
    } = req.body;

    // Handle optional account creation
    if (createAccount) {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required for account creation' });
      }

      // Check if user already exists in this tenant
      const existingUser = await User.findOne({ where: { email, tenantId: req.tenantId } });
      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists in this workspace' });
      }

      // Create User
      const user = await User.create({
        email,
        passwordHash: hashPassword(password),
        tenantId: req.tenantId,
        isActive: true
      });

      // Assign 'Employee' role
      const employeeRole = await Role.findOne({ where: { name: 'Employee', tenantId: req.tenantId } });
      if (employeeRole) {
        await user.addRole(employeeRole._id);
      }

      userId = user._id;
    }

    if (!userId || !firstName || !lastName) {
      return res.status(400).json({ error: 'userId (or createAccount credentials), firstName, and lastName are required' });
    }

    const employee = await EmployeeProfile.create({
      tenantId: req.tenantId,
      userId,
      firstName,
      lastName,
      departmentId,
      managerId,
      positionId,
      staffType,
      employmentStatus: req.body.employmentStatus || 'training',
      offboardingStatus: req.body.offboardingStatus || 'none',
      roleId: req.body.roleId || null,
      salary,
      hourlyRate: hourlyRate || 0,
      commissionRate: commissionRate || 0,
      onboardingStatus: onboardingStatus || 'IN_PROGRESS',
      documentLinks: req.body.documentLinks || [],
      emergencyContact: req.body.emergencyContact || null,
      dateOfBirth: dateOfBirth || null,
      hireDate: hireDate || new Date(),
    });

    res.status(201).json(employee);
  } catch (err) {
    console.error('POST /employees Error:', err.message);
    res.status(500).json({ error: 'Failed to create employee profile' });
  }
});

/**
 * PATCH /api/employees/:id
 */
router.patch('/:id', checkPermission('manage_employees'), async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 'lastName', 'departmentId', 'positionId', 'managerId', 'leaveCredits',
      'salary', 'dateOfBirth', 'hireDate', 'hourlyRate',
      'onboardingStatus', 'documentLinks', 'emergencyContact', 'commissionRate', 'staffType', 'roleId', 'employmentStatus', 'offboardingStatus'
    ];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // If hireDate is updated, recompute employmentStatus is handled via hook or just let it be dynamic
    // In original code it was setting employmentStatus explicitly in updates, but we removed that field from model in migration.
    // So we don't need to set it.

    const [updatedCount] = await EmployeeProfile.update(updates, {
      where: { _id: req.params.id, tenantId: req.tenantId }
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Handle account metadata updates (email, password)
    const employee = await EmployeeProfile.findOne({
      where: { _id: req.params.id, tenantId: req.tenantId },
      include: [{ model: User }]
    });

    if (employee && employee.User) {
      const userUpdates = {};
      if (req.body.email && req.body.email !== employee.User.email) {
        // Check uniqueness
        const existing = await User.findOne({ where: { email: req.body.email, tenantId: req.tenantId } });
        if (existing) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        userUpdates.email = req.body.email;
      }
      if (req.body.password) {
        userUpdates.passwordHash = hashPassword(req.body.password);
      }

      if (Object.keys(userUpdates).length > 0) {
        await employee.User.update(userUpdates);
      }
    }

    // Re-fetch with associations
    const finalEmployee = await EmployeeProfile.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['email', 'isActive'] },
        { model: EmployeeProfile, as: 'manager', attributes: ['firstName', 'lastName'] },
        { model: Role, attributes: ['name', 'color'] },
        { model: Department, attributes: ['name', 'color'] },
        { model: Position, attributes: ['name'] }
      ]
    });

    res.json(finalEmployee);
  } catch (err) {
    console.error('PATCH /employees/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

/**
 * DELETE /api/employees/:id
 */
router.delete('/:id', checkPermission('manage_employees'), async (req, res) => {
  try {
    const employee = await EmployeeProfile.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const name = `${employee.firstName} ${employee.lastName}`;
    await employee.destroy();
    
    res.json({ message: `Employee '${name}' removed successfully` });
  } catch (err) {
    console.error('DELETE /employees/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
