const express = require('express');
const { Op } = require('sequelize');
const { EmployeeProfile, User } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');

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
        { model: EmployeeProfile, as: 'manager', attributes: ['firstName', 'lastName'] }
      ]
    });

    // Compute employment status dynamically
    const enriched = employees.map(emp => {
      const data = emp.toJSON();
      if (data.hireDate) {
        const now = new Date();
        const hire = new Date(data.hireDate);
        const diffMs = now - hire;
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        if (diffMonths < 1) data.employmentStatus = 'training';
        else if (diffMonths < 6) data.employmentStatus = 'probationary';
        else data.employmentStatus = 'regular';
      }
      return data;
    });

    res.json(enriched);
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
      attributes: ['_id', 'firstName', 'lastName', 'dateOfBirth', 'department']
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
        { model: EmployeeProfile, as: 'manager', attributes: ['firstName', 'lastName'] }
      ]
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const data = employee.toJSON();
    // Compute status
    if (data.hireDate) {
      const now = new Date();
      const hire = new Date(data.hireDate);
      const diffMs = now - hire;
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
      if (diffMonths < 1) data.employmentStatus = 'training';
      else if (diffMonths < 6) data.employmentStatus = 'probationary';
      else data.employmentStatus = 'regular';
    }

    res.json(data);
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
    const { userId, firstName, lastName, department, managerId, position, salary, dateOfBirth, hireDate } = req.body;

    if (!userId || !firstName || !lastName) {
      return res.status(400).json({ error: 'userId, firstName, and lastName are required' });
    }

    const employee = await EmployeeProfile.create({
      tenantId: req.tenantId,
      userId,
      firstName,
      lastName,
      department,
      managerId,
      position,
      salary,
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
      'firstName', 'lastName', 'department', 'managerId', 'leaveCredits',
      'position', 'salary', 'dateOfBirth', 'hireDate',
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

    const [updatedCount, updatedRows] = await EmployeeProfile.update(updates, {
      where: { _id: req.params.id, tenantId: req.tenantId },
      returning: true
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Re-fetch with associations
    const employee = await EmployeeProfile.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['email', 'isActive'] },
        { model: EmployeeProfile, as: 'manager', attributes: ['firstName', 'lastName'] }
      ]
    });

    res.json(employee);
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
