const express = require('express');
const { Shift, EmployeeProfile } = require('../models');

const router = express.Router();

/**
 * GET /api/shifts
 * List all shifts
 */
router.get('/', async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      where: { tenantId: req.tenantId },
      include: [{
        model: EmployeeProfile,
        as: 'assignedEmployees',
        attributes: ['firstName', 'lastName'],
        through: { attributes: [] }
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(shifts);
  } catch (err) {
    console.error('GET /shifts Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

/**
 * POST /api/shifts
 * Create a new shift
 */
router.post('/', async (req, res) => {
  try {
    const { name, startTime, endTime, lunchStart, lunchEnd, workDays, description } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'name, startTime, and endTime are required' });
    }

    const shift = await Shift.create({
      tenantId: req.tenantId,
      name,
      startTime,
      endTime,
      lunchStart,
      lunchEnd,
      workDays: workDays || [1, 2, 3, 4, 5], // default Mon-Fri
      description,
    });

    res.status(201).json(shift);
  } catch (err) {
    console.error('POST /shifts Error:', err.message);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

/**
 * PATCH /api/shifts/:id/assign
 * Assign employees to shift
 */
router.patch('/:id/assign', async (req, res) => {
  try {
    const { employeeIds } = req.body; // Array of IDs
    const shift = await Shift.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    await shift.setAssignedEmployees(employeeIds);
    
    // Re-fetch to return full object
    const updatedShift = await Shift.findByPk(shift._id, {
      include: [{
        model: EmployeeProfile,
        as: 'assignedEmployees',
        through: { attributes: [] }
      }]
    });

    res.json({ message: 'Employees assigned successfully', shift: updatedShift });
  } catch (err) {
    console.error('PATCH /shifts/:id/assign Error:', err.message);
    res.status(500).json({ error: 'Failed to assign employees' });
  }
});

/**
 * DELETE /api/shifts/:id
 * Delete a shift
 */
router.delete('/:id', async (req, res) => {
  try {
    const shift = await Shift.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    await shift.destroy();
    res.json({ message: 'Shift deleted successfully' });
  } catch (err) {
    console.error('DELETE /shifts/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

module.exports = router;
