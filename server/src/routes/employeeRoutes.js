const express = require('express');
const EmployeeProfile = require('../models/EmployeeProfile');

const router = express.Router();

/**
 * GET /api/employees
 * List all employees in the current tenant workspace
 */
router.get('/', async (req, res) => {
  try {
    const employees = await EmployeeProfile.find()
      .populate('userId', 'email isActive')
      .populate('managerId', 'firstName lastName')
      .lean();
    res.json(employees);
  } catch (err) {
    console.error('GET /employees Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

/**
 * GET /api/employees/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const employee = await EmployeeProfile.findById(req.params.id)
      .populate('userId', 'email isActive')
      .populate('managerId', 'firstName lastName')
      .lean();

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
 * Create an employee profile linked to a user
 */
router.post('/', async (req, res) => {
  try {
    const { userId, firstName, lastName, department, managerId, position, salary } = req.body;

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
    });

    res.status(201).json(employee);
  } catch (err) {
    console.error('POST /employees Error:', err.message);
    res.status(500).json({ error: 'Failed to create employee profile' });
  }
});

/**
 * PATCH /api/employees/:id
 * Update employee details (department, manager, leave credits, position, salary)
 */
router.patch('/:id', async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'department', 'managerId', 'leaveCredits', 'position', 'salary'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const employee = await EmployeeProfile.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('userId', 'email isActive')
      .populate('managerId', 'firstName lastName');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('PATCH /employees/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

/**
 * DELETE /api/employees/:id
 * Remove an employee profile
 */
router.delete('/:id', async (req, res) => {
  try {
    const employee = await EmployeeProfile.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: `Employee '${employee.firstName} ${employee.lastName}' removed successfully` });
  } catch (err) {
    console.error('DELETE /employees/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
