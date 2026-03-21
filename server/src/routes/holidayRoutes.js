const express = require('express');
const Holiday = require('../models/Holiday');

const router = express.Router();

/**
 * GET /api/holidays
 * List holidays (defaults to upcoming only; pass ?all=true for all)
 */
router.get('/', async (req, res) => {
  try {
    const { all, year, type } = req.query;
    const filter = {};

    if (!all) {
      // Default: Show only upcoming holidays (today and forward)
      filter.date = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
    }

    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31T23:59:59`);
      filter.date = { $gte: startOfYear, $lte: endOfYear };
    }

    if (type) filter.type = type;

    const holidays = await Holiday.find(filter)
      .sort({ date: 1 })
      .lean();

    res.json(holidays);
  } catch (err) {
    console.error('GET /holidays Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

/**
 * POST /api/holidays
 * HR/Admin: Create a new holiday
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
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A holiday with this name already exists on that date' });
    }
    console.error('POST /holidays Error:', err.message);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

/**
 * DELETE /api/holidays/:id
 * HR/Admin: Delete a holiday
 */
router.delete('/:id', async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json({ message: `Holiday '${holiday.name}' deleted successfully` });
  } catch (err) {
    console.error('DELETE /holidays/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

module.exports = router;
