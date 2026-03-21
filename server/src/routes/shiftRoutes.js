const express = require('express');
const Shift = require('../models/Shift');
const EmployeeProfile = require('../models/EmployeeProfile');

const router = express.Router();

/**
 * GET /api/shifts
 * List all shifts
 */
router.get('/', async (req, res) => {
  try {
    const shifts = await Shift.find({ tenantId: req.tenantId })
      .populate('assignedEmployees', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
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
      assignedEmployees: []
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
    const shift = await Shift.findById(req.params.id);

    if (!shift || shift.tenantId.toString() !== req.tenantId) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    shift.assignedEmployees = employeeIds;
    await shift.save();

    res.json({ message: 'Employees assigned successfully', shift });
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
    const shift = await Shift.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted successfully' });
  } catch (err) {
    console.error('DELETE /shifts/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

module.exports = router;
