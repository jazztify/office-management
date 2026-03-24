const express = require('express');
const { Op } = require('sequelize');
const { Holiday } = require('../models');

const router = express.Router();

/**
 * GET /api/holidays
 * List holidays
 */
router.get('/', async (req, res) => {
  try {
    const { all, year, type } = req.query;
    const filter = {};

    if (!all) {
      filter.date = { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) };
    }

    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31T23:59:59`);
      filter.date = { [Op.gte]: startOfYear, [Op.lte]: endOfYear };
    }

    if (type) filter.type = type;

    const holidays = await Holiday.findAll({
      where: filter,
      order: [['date', 'ASC']]
    });

    res.json(holidays);
  } catch (err) {
    console.error('GET /holidays Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

/**
 * POST /api/holidays
 */
router.post('/', async (req, res) => {
  try {
    const { name, date, type, description, isRecurring, isPaidUnworked, rateMultiplier } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'name and date are required' });
    }

    const holiday = await Holiday.create({
      tenantId: req.tenantId,
      name,
      date: new Date(date),
      type: type || 'regular',
      description,
      isPaidUnworked: isPaidUnworked !== undefined ? isPaidUnworked : true,
      rateMultiplier: rateMultiplier !== undefined ? Number(rateMultiplier) : 2.0,
      isRecurring: isRecurring || false,
    });

    res.status(201).json(holiday);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A holiday with this name already exists on that date' });
    }
    console.error('POST /holidays Error:', err.message);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

/**
 * DELETE /api/holidays/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const holiday = await Holiday.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });
    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    await holiday.destroy();
    res.json({ message: `Holiday '${holiday.name}' deleted successfully` });
  } catch (err) {
    console.error('DELETE /holidays/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

module.exports = router;
