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

    // Compute employment status dynamically for each employee
    employees.forEach(emp => {
      if (emp.hireDate) {
        const now = new Date();
        const hire = new Date(emp.hireDate);
        const diffMs = now - hire;
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        if (diffMonths < 1) emp.employmentStatus = 'training';
        else if (diffMonths < 6) emp.employmentStatus = 'probationary';
        else emp.employmentStatus = 'regular';
      }
    });

    res.json(employees);
  } catch (err) {
    console.error('GET /employees Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

/**
 * GET /api/employees/birthdays
 * Get all employees with birthdays (for calendar)
 */
router.get('/birthdays', async (req, res) => {
  try {
    const { month } = req.query;
    const employees = await EmployeeProfile.find({
      tenantId: req.tenantId,
      dateOfBirth: { $ne: null },
    })
      .select('firstName lastName dateOfBirth department')
      .lean();

    // If month filter is provided, filter by birth month
    let filtered = employees;
    if (month) {
      const m = parseInt(month);
      filtered = employees.filter(emp => {
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
    const employee = await EmployeeProfile.findById(req.params.id)
      .populate('userId', 'email isActive')
      .populate('managerId', 'firstName lastName')
      .lean();

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Compute status
    if (employee.hireDate) {
      const now = new Date();
      const hire = new Date(employee.hireDate);
      const diffMs = now - hire;
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
      if (diffMonths < 1) employee.employmentStatus = 'training';
      else if (diffMonths < 6) employee.employmentStatus = 'probationary';
      else employee.employmentStatus = 'regular';
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
 * Update employee details (department, manager, leave credits, position, salary, birthday, hireDate)
 */
router.patch('/:id', async (req, res) => {
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

    // If hireDate is updated, recompute employmentStatus
    if (updates.hireDate) {
      const now = new Date();
      const hire = new Date(updates.hireDate);
      const diffMs = now - hire;
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
      if (diffMonths < 1) updates.employmentStatus = 'training';
      else if (diffMonths < 6) updates.employmentStatus = 'probationary';
      else updates.employmentStatus = 'regular';
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
