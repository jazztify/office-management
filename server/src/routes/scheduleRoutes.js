const express = require('express');
const { WorkSchedule, EmployeeProfile, Shift, User } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * GET /api/schedules
 * Fetch schedules for a date range (e.g. for the weekly roster)
 */
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = { tenantId: req.tenantId };
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const schedules = await WorkSchedule.findAll({
      where,
      include: [
        { model: EmployeeProfile, attributes: ['_id', 'firstName', 'lastName'] },
        { model: Shift, attributes: ['_id', 'name', 'startTime', 'endTime'] }
      ],
      order: [['date', 'ASC']]
    });

    res.json(schedules);
  } catch (err) {
    console.error('GET /schedules Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

/**
 * POST /api/schedules
 * Assign a shift to an employee on a specific date
 */
router.post('/', async (req, res) => {
  try {
    const { employeeId, shiftId, date } = req.body;

    if (!employeeId || !shiftId || !date) {
      return res.status(400).json({ error: 'employeeId, shiftId, and date are required' });
    }

    // Upsert (since one employee has one shift per day in this simplified model)
    const [schedule, created] = await WorkSchedule.findOrCreate({
      where: { employeeId, date, tenantId: req.tenantId },
      defaults: { shiftId, employeeId, date, tenantId: req.tenantId }
    });

    if (!created) {
      await schedule.update({ shiftId });
    }

    const fullSchedule = await WorkSchedule.findByPk(schedule._id, {
      include: [
        { model: EmployeeProfile, attributes: ['_id', 'firstName', 'lastName'] },
        { model: Shift, attributes: ['_id', 'name', 'startTime', 'endTime'] }
      ]
    });

    res.status(201).json(fullSchedule);
  } catch (err) {
    console.error('POST /schedules Error:', err.message);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
});

/**
 * DELETE /api/schedules/:id
 * Remove a shift assignment
 */
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOne({
      where: { _id: req.params.id, tenantId: req.tenantId }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await schedule.destroy();
    res.json({ message: 'Shift unassigned successfully' });
  } catch (err) {
    console.error('DELETE /schedules/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to unassign shift' });
  }
});

module.exports = router;
