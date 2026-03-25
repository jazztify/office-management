const express = require('express');
const { DeductionProfile, EmployeeProfile } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * GET /api/deductions/:employeeId
 */
router.get('/:employeeId', async (req, res) => {
  try {
    const profile = await DeductionProfile.findOne({
      where: { employeeId: req.params.employeeId, tenantId: req.tenantId }
    });
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deduction profile' });
  }
});

/**
 * POST /api/deductions
 * Create or Update profile
 */
router.post('/', checkPermission('manage_employees'), async (req, res) => {
  try {
    const { employeeId, monthlyTax, sssEmployee, philhealthEmployee, pagibigEmployee, insuranceContribution, otherFixedDeductions } = req.body;
    
    let [profile, created] = await DeductionProfile.findOrCreate({
      where: { employeeId, tenantId: req.tenantId },
      defaults: { monthlyTax, sssEmployee, philhealthEmployee, pagibigEmployee, insuranceContribution, otherFixedDeductions }
    });

    if (!created) {
      await profile.update({ monthlyTax, sssEmployee, philhealthEmployee, pagibigEmployee, insuranceContribution, otherFixedDeductions });
    }

    res.json({ message: 'Deduction profile saved', profile });
  } catch (err) {
    console.error('Deduction Profile Save Error:', err.message);
    res.status(500).json({ error: 'Failed to save deduction profile' });
  }
});

module.exports = router;
