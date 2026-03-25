const express = require('express');
const { Tenant } = require('../models');

const router = express.Router();

const DEFAULT_SETTINGS = {
  officeHours: { start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
  deductions: {
    latePerMinute: 5,
    undertimePerMinute: 5,
    absencePerDay: 500,
    halfDayDeduction: 250,
    lunchOvertime: 0,
    maxLunchMinutes: 60,
  },
  overtime: {
    requiresApproval: true,
    rateMultiplier: 1.25,
    restDayMultiplier: 1.3,
    holidayMultiplier: 2.0,
    maxHoursPerDay: 4,
  },
  gracePeriod: 15,
  statutoryDeductions: {
    monthlyTax: 0,
    sssEmployee: 0,
    philhealthEmployee: 0,
    pagibigEmployee: 0,
    insuranceContribution: 0,
    otherFixedDeductions: 0
  }
};

/**
 * GET /api/settings
 * HR: Get tenant settings
 */
router.get('/', async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.tenantId, { attributes: ['settings'] });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Merge with defaults to ensure all fields exist
    const settings = {
      officeHours: { ...DEFAULT_SETTINGS.officeHours, ...tenant.settings?.officeHours },
      deductions: { ...DEFAULT_SETTINGS.deductions, ...tenant.settings?.deductions },
      overtime: { ...DEFAULT_SETTINGS.overtime, ...tenant.settings?.overtime },
      gracePeriod: tenant.settings?.gracePeriod ?? DEFAULT_SETTINGS.gracePeriod,
      statutoryDeductions: { ...DEFAULT_SETTINGS.statutoryDeductions, ...tenant.settings?.statutoryDeductions },
    };

    res.json(settings);
  } catch (err) {
    console.error('GET /settings Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/settings
 * HR: Update tenant settings
 */
router.patch('/', async (req, res) => {
  try {
    const updates = req.body;

    const tenant = await Tenant.findByPk(req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const currentSettings = tenant.settings || {};

    if (updates.officeHours) {
      currentSettings.officeHours = { ...currentSettings.officeHours, ...updates.officeHours };
    }
    if (updates.deductions) {
      currentSettings.deductions = { ...currentSettings.deductions, ...updates.deductions };
    }
    if (updates.overtime) {
      currentSettings.overtime = { ...currentSettings.overtime, ...updates.overtime };
    }
    if (updates.gracePeriod !== undefined) {
      currentSettings.gracePeriod = updates.gracePeriod;
    }
    if (updates.statutoryDeductions) {
      currentSettings.statutoryDeductions = { ...currentSettings.statutoryDeductions, ...updates.statutoryDeductions };
    }

    // Explicitly set the field as modified if it's JSONB
    tenant.settings = { ...currentSettings };
    await tenant.save();

    res.json(tenant.settings);
  } catch (err) {
    console.error('PATCH /settings Error:', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
