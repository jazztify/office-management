const express = require('express');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { Payslip, EmployeeProfile, AttendanceLog, Holiday, User, DeductionProfile, Department, Tenant } = require('../models');

const router = express.Router();

/**
 * GET /api/payslips
 * List all payslips
 */
router.get('/', async (req, res) => {
  try {
    const { month, year, employeeId, status, payPeriod, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };
    if (month || year) {
      const periodFilter = {};
      if (month) periodFilter.month = parseInt(month);
      if (year) periodFilter.year = parseInt(year);
      filter.period = { [Op.contains]: periodFilter };
    }
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (payPeriod) filter.payPeriod = payPeriod;

    const { count, rows } = await Payslip.findAndCountAll({
      where: filter,
      include: [
        { 
          model: EmployeeProfile, 
          as: 'employeeProfile',
          attributes: ['firstName', 'lastName', 'salary'],
          include: [{ model: Department, attributes: ['name'] }]
        },
        { model: User, as: 'generator', attributes: ['email'] }
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      payslips: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('GET /payslips Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

/**
 * GET /api/payslips/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const payslip = await Payslip.findByPk(req.params.id, {
      include: [
        { 
          model: EmployeeProfile, 
          as: 'employeeProfile',
          attributes: ['firstName', 'lastName', 'salary'],
          include: [{ model: Department, attributes: ['name'] }]
        },
        { model: User, as: 'generator', attributes: ['email'] }
      ]
    });

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    res.json(payslip);
  } catch (err) {
    console.error('GET /payslips/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
});

/**
 * Helper: Calculate date range for a pay period
 */
function getPayPeriodDates(month, year, payPeriod) {
  const m = parseInt(month);
  const y = parseInt(year);

  if (payPeriod === 'first_half') {
    return {
      startDate: `${y}-${String(m).padStart(2, '0')}-01`,
      endDate: `${y}-${String(m).padStart(2, '0')}-15`,
    };
  } else if (payPeriod === 'second_half') {
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${y}-${String(m).padStart(2, '0')}-16`,
      endDate: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
    };
  } else {
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${y}-${String(m).padStart(2, '0')}-01`,
      endDate: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
    };
  }
}

/**
 * Helper: Calculate expected working days
 */
function getWorkingDays(startDate, endDate) {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Helper: Calculate 13th month pay
 */
async function calculate13thMonthPay(employeeId, year, monthlyBasicSalary, tenantId) {
  const existingPayslips = await Payslip.findAll({
    where: {
      employeeId,
      tenantId: tenantId, // PASS TENANT ID HERE
      period: {
        year: parseInt(year)
      },
      payPeriod: 'full_month',
    }
  });

  const totalEarned = existingPayslips.reduce((sum, p) => sum + (parseFloat(p.basicSalary) || 0), 0) + monthlyBasicSalary;
  return Math.round((totalEarned / 12) * 100) / 100;
}

/**
 * POST /api/payslips/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      payPeriod = 'full_month',
      allowances = {},
      deductions = {},
      notes,
      include13thMonth = false,
    } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ error: 'employeeId, month, and year are required' });
    }

    const employee = await EmployeeProfile.findByPk(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const existing = await Payslip.findOne({
      where: {
        employeeId,
        'period.month': parseInt(month),
        'period.year': parseInt(year),
        payPeriod,
        tenantId: req.tenantId
      }
    });

    if (existing) {
      return res.status(409).json({
        error: `Payslip already exists for ${payPeriod.replace('_', ' ')} of ${month}/${year}.`,
      });
    }

    const tenant = await Tenant.findByPk(req.tenantId, { attributes: ['settings'] });
    const globalStatutory = tenant?.settings?.statutoryDeductions || {};

    const monthlySalary = parseFloat(employee.salary) || 0;
    const { startDate, endDate } = getPayPeriodDates(month, year, payPeriod);
    const workingDaysInPeriod = getWorkingDays(startDate, endDate);
    const totalMonthWorkingDays = getWorkingDays(
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    );

    let basicSalary;
    if (payPeriod === 'full_month') {
      basicSalary = monthlySalary;
    } else {
      basicSalary = Math.round((monthlySalary / totalMonthWorkingDays) * workingDaysInPeriod * 100) / 100;
    }

    const logs = await AttendanceLog.findAll({
      where: {
        employeeId,
        date: { [Op.between]: [startDate, endDate] }
      }
    });

    let workHrs = 0;
    let lateMins = 0;
    let presentDays = 0;

    logs.forEach(log => {
      workHrs += (parseFloat(log.totalWorkHours) || 0);
      lateMins += (log.lateMinutes || 0);
      if (log.status !== 'absent' && (log.clockIn || log.totalWorkHours > 0)) {
        presentDays += 1;
      }
    });

    const totalLateHours = parseFloat((lateMins / 60).toFixed(2));
    const explicitAbsences = logs.filter(l => l.status === 'absent').length;
    const totalAbsentDays = Math.max(0, workingDaysInPeriod - presentDays);

    const monthHolidays = await Holiday.findAll({
      where: {
        tenantId: req.tenantId,
        date: { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] }
      }
    });

    let computedHolidayPay = 0;
    let computedHolidayDed = 0;
    const dailyRate = monthlySalary / totalMonthWorkingDays;

    if (monthHolidays.length > 0) {
      monthHolidays.forEach(holiday => {
        const hIso = new Date(new Date(holiday.date).getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];
        const logH = logs.find(l => l.date === hIso);
        const workedHoliday = logH && parseFloat(logH.totalWorkHours) > 0;
        
        // Simplified holiday logic for migration parity
        if (workedHoliday) {
          const multi = holiday.rateMultiplier || 2.0;
          computedHolidayPay += dailyRate * (multi - 1);
        } else if (holiday.isPaidUnworked) {
          // If they didn't work and it's paid, no deduction. 
          // If it's NOT paid and they didn't work, we'd deduct but standard is usually paid.
        }
      });
    }

    let thirteenthMonthPay = 0;
    if (include13thMonth || (parseInt(month) === 12 && payPeriod === 'full_month')) {
      thirteenthMonthPay = await calculate13thMonthPay(employeeId, parseInt(year), monthlySalary, req.tenantId);
    }

    // Fetch recurring deductions
    const deductionProfile = await DeductionProfile.findOne({ where: { employeeId, tenantId: req.tenantId } });
    const fixedTax = deductionProfile ? Number(deductionProfile.monthlyTax || 0) : Number(globalStatutory.monthlyTax || 0);
    const fixedSss = deductionProfile ? Number(deductionProfile.sssEmployee || 0) : Number(globalStatutory.sssEmployee || 0);
    const fixedPhilhealth = deductionProfile ? Number(deductionProfile.philhealthEmployee || 0) : Number(globalStatutory.philhealthEmployee || 0);
    const fixedPagibig = deductionProfile ? Number(deductionProfile.pagibigEmployee || 0) : Number(globalStatutory.pagibigEmployee || 0);
    const fixedInsurance = deductionProfile ? Number(deductionProfile.insuranceContribution || 0) : Number(globalStatutory.insuranceContribution || 0);
    const otherFixed = deductionProfile ? Number(deductionProfile.otherFixedDeductions || 0) : Number(globalStatutory.otherFixedDeductions || 0);

    // Dynamic fallback if no fixed values
    const sss = fixedSss || Math.min(1350, Math.round(monthlySalary * 0.045));
    const philhealth = fixedPhilhealth || Math.min(450, Math.round(monthlySalary * 0.025));
    const pagibig = fixedPagibig || 200;
    const tax = fixedTax || Math.round((basicSalary + computedHolidayPay) * 0.12);

    const finalAllowances = {
      housing: Number(allowances.housing) || 0,
      transport: Number(allowances.transport) || 0,
      meal: Number(allowances.meal) || 0,
      holidayPay: (Number(allowances.holidayPay) || 0) + computedHolidayPay,
      thirteenthMonthPay,
      other: Number(allowances.other) || 0,
    };

    const hourlyRate = dailyRate / 8;
    const lateDeduction = parseFloat((lateMins / 60 * hourlyRate).toFixed(2));
    const absenceDeduction = parseFloat((totalAbsentDays * dailyRate).toFixed(2));

    const finalDeductions = {
      tax,
      insurance: Number(deductions.insurance) || 0,
      sss,
      pagibig,
      philhealth,
      lateDeduction: (Number(deductions.lateDeduction) || 0) + lateDeduction,
      absenceDeduction: (Number(deductions.absenceDeduction) || 0) + absenceDeduction,
      holidayDeduction: (Number(deductions.holidayDeduction) || 0) + computedHolidayDed,
      insurance: (Number(deductions.insurance) || 0) + fixedInsurance,
      other: (Number(deductions.other) || 0) + otherFixed,
    };

    const totalAllowances = Object.values(finalAllowances).reduce((sum, v) => sum + v, 0);
    const totalDeductions = Object.values(finalDeductions).reduce((sum, v) => sum + v, 0);
    const grossPay = basicSalary + totalAllowances;
    const netPay = grossPay - totalDeductions;

    const payslip = await Payslip.create({
      tenantId: req.tenantId,
      employeeId,
      period: { month: parseInt(month), year: parseInt(year) },
      payPeriod,
      basicSalary,
      allowances: finalAllowances,
      deductions: finalDeductions,
      attendanceSummary: {
        totalWorkHours: parseFloat(workHrs.toFixed(2)),
        totalLateHours,
        totalAbsentDays,
      },
      grossPay,
      totalDeductions,
      netPay,
      generatedBy: req.user?._id,
      notes,
    });

    const populated = await Payslip.findByPk(payslip._id, {
      include: [
        { 
          model: EmployeeProfile, 
          as: 'employeeProfile',
          attributes: ['firstName', 'lastName', 'salary'],
          include: [{ model: Department, attributes: ['name'] }]
        },
        { model: User, as: 'generator', attributes: ['email'] }
      ]
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /payslips/generate Error:', err.message);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A payslip for this period already exists.' });
    }
    res.status(500).json({ error: 'Failed to generate payslip' });
  }
});

/**
 * POST /api/payslips/generate-bulk
 */
router.post('/generate-bulk', async (req, res) => {
  try {
    const { month, year, payPeriod = 'full_month', allowances = {}, deductions = {}, include13thMonth = false } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const employees = await EmployeeProfile.findAll({ where: { tenantId: req.tenantId } });
    const results = { created: 0, skipped: 0, errors: [] };

    const { startDate, endDate } = getPayPeriodDates(month, year, payPeriod);
    const workingDaysInPeriod = getWorkingDays(startDate, endDate);
    const totalMonthWorkingDays = getWorkingDays(
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    );

    const tenant = await Tenant.findByPk(req.tenantId, { attributes: ['settings'] });
    const globalStatutory = tenant?.settings?.statutoryDeductions || {};

    for (const emp of employees) {
      try {
        const existing = await Payslip.findOne({
          where: {
            employeeId: emp._id,
            'period.month': parseInt(month),
            'period.year': parseInt(year),
            payPeriod,
            tenantId: req.tenantId
          }
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const monthlySalary = parseFloat(emp.salary) || 0;
        let basicSalary = payPeriod === 'full_month' ? monthlySalary : Math.round((monthlySalary / totalMonthWorkingDays) * workingDaysInPeriod * 100) / 100;

        const logs = await AttendanceLog.findAll({
          where: { employeeId: emp._id, date: { [Op.between]: [startDate, endDate] } }
        });

        let workHrs = 0, lateMins = 0, presentDays = 0;
        logs.forEach(l => {
          workHrs += (parseFloat(l.totalWorkHours) || 0);
          lateMins += (l.lateMinutes || 0);
          if (l.status !== 'absent' && (l.clockIn || l.totalWorkHours > 0)) presentDays++;
        });

        const totalAbsentDays = Math.max(0, workingDaysInPeriod - presentDays);
        let computedHolidayPay = 0, computedHolidayDed = 0;
        const dailyRate = monthlySalary / totalMonthWorkingDays;

        const monthHolidays = await Holiday.findAll({
          where: { tenantId: req.tenantId, date: { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] } }
        });

        monthHolidays.forEach(h => {
          const hIso = new Date(new Date(h.date).getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];
          const logH = logs.find(l => l.date === hIso);
          if (logH && parseFloat(logH.totalWorkHours) > 0) computedHolidayPay += dailyRate * ((h.rateMultiplier || 2.0) - 1);
        });

        let thirteenthMonthPay = 0;
        if (include13thMonth || (parseInt(month) === 12 && payPeriod === 'full_month')) {
          thirteenthMonthPay = await calculate13thMonthPay(emp._id, parseInt(year), monthlySalary);
        }

        // Fetch recurring deductions
        const dProf = await DeductionProfile.findOne({ where: { employeeId: emp._id, tenantId: req.tenantId } });
        const fTax = dProf ? Number(dProf.monthlyTax || 0) : Number(globalStatutory.monthlyTax || 0);
        const fSss = dProf ? Number(dProf.sssEmployee || 0) : Number(globalStatutory.sssEmployee || 0);
        const fPh = dProf ? Number(dProf.philhealthEmployee || 0) : Number(globalStatutory.philhealthEmployee || 0);
        const fPag = dProf ? Number(dProf.pagibigEmployee || 0) : Number(globalStatutory.pagibigEmployee || 0);
        const fIns = dProf ? Number(dProf.insuranceContribution || 0) : Number(globalStatutory.insuranceContribution || 0);
        const fOther = dProf ? Number(dProf.otherFixedDeductions || 0) : Number(globalStatutory.otherFixedDeductions || 0);

        const empSss = fSss || Math.min(1350, Math.round(monthlySalary * 0.045));
        const empPhilhealth = fPh || Math.min(450, Math.round(monthlySalary * 0.025));
        const empPagibig = fPag || 200;
        const empTax = fTax || Math.round((basicSalary + computedHolidayPay) * 0.12);

        const empAllowances = {
          housing: Number(allowances.housing) || 0,
          transport: Number(allowances.transport) || 0,
          meal: Number(allowances.meal) || 0,
          holidayPay: (Number(allowances.holidayPay) || 0) + computedHolidayPay,
          thirteenthMonthPay,
          other: Number(allowances.other) || 0,
        };

        const empHourlyRate = dailyRate / 8;
        const empLateDed = parseFloat((lateMins / 60 * empHourlyRate).toFixed(2));
        const empAbsDed = parseFloat((totalAbsentDays * dailyRate).toFixed(2));

        const empDeductions = {
          tax: empTax,
          insurance: Number(deductions.insurance) || 0,
          sss: empSss,
          pagibig: empPagibig,
          philhealth: empPhilhealth,
          lateDeduction: empLateDed,
          absenceDeduction: empAbsDed,
          holidayDeduction: (Number(deductions.holidayDeduction) || 0) + computedHolidayDed,
          insurance: (Number(deductions.insurance) || 0) + fIns,
          other: (Number(deductions.other) || 0) + fOther,
        };

        const tAllow = Object.values(empAllowances).reduce((s, v) => s + v, 0);
        const tDed = Object.values(empDeductions).reduce((s, v) => s + v, 0);
        const gPay = basicSalary + tAllow;
        const nPay = gPay - tDed;

        await Payslip.create({
          tenantId: req.tenantId,
          employeeId: emp._id,
          period: { month: parseInt(month), year: parseInt(year) },
          payPeriod,
          basicSalary,
          allowances: empAllowances,
          deductions: empDeductions,
          attendanceSummary: { totalWorkHours: parseFloat(workHrs.toFixed(2)), totalLateHours: parseFloat((lateMins / 60).toFixed(2)), totalAbsentDays },
          grossPay: gPay,
          totalDeductions: tDed,
          netPay: nPay,
          generatedBy: req.user?._id,
        });

        results.created++;
      } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') results.skipped++;
        else results.errors.push({ employee: `${emp.firstName} ${emp.lastName}`, error: e.message });
      }
    }

    res.status(201).json({ success: true, message: `Bulk payslip generation complete`, results });
  } catch (err) {
    console.error('POST /payslips/generate-bulk Error:', err.message);
    res.status(500).json({ error: 'Failed to generate bulk payslips' });
  }
});

/**
 * PATCH /api/payslips/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'generated', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be draft, generated, or paid' });
    }

    const [updatedCount] = await Payslip.update({ status }, {
      where: { _id: req.params.id, tenantId: req.tenantId }
    });

    if (updatedCount === 0) return res.status(404).json({ error: 'Payslip not found' });

    const payslip = await Payslip.findByPk(req.params.id, {
      include: [
        { 
          model: EmployeeProfile, 
          as: 'employeeProfile',
          attributes: ['firstName', 'lastName', 'salary'],
          include: [{ model: Department, attributes: ['name'] }]
        },
        { model: User, as: 'generator', attributes: ['email'] }
      ]
    });

    res.json(payslip);
  } catch (err) {
    console.error('PATCH /payslips/:id/status Error:', err.message);
    res.status(500).json({ error: 'Failed to update payslip status' });
  }
});

/**
 * GET /api/payslips/check-duplicate
 */
router.get('/check-duplicate', async (req, res) => {
  try {
    const { month, year, payPeriod, employeeId } = req.query;
    const filter = {
      'period.month': parseInt(month),
      'period.year': parseInt(year),
      payPeriod: payPeriod || 'full_month',
      tenantId: req.tenantId
    };

    if (employeeId) filter.employeeId = employeeId;

    const existing = await Payslip.findOne({ where: filter });

    res.json({
      exists: !!existing,
      payslip: existing || null,
    });
  } catch (err) {
    console.error('GET /payslips/check-duplicate Error:', err.message);
    res.status(500).json({ error: 'Failed to check duplicate' });
  }
});

/**
 * GET /api/payslips/:id/pdf
 * Generate PDF version of the payslip
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const payslip = await Payslip.findByPk(req.params.id, {
      include: [
        { 
          model: EmployeeProfile,
          as: 'employeeProfile',
          include: [{ model: Department, attributes: ['name'] }]
        },
        { model: User, as: 'generator', attributes: ['email'] }
      ]
    });

    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `Payslip_${payslip.employeeProfile.lastName}_${payslip.period.month}_${payslip.period.year}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // --- Header ---
    doc.fontSize(20).text('PAYSLIP', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Period: ${payslip.payPeriod.replace('_', ' ').toUpperCase()} - ${payslip.period.month}/${payslip.period.year}`, { align: 'center' });
    doc.moveDown(2);

    // --- Employee Info ---
    doc.fontSize(12).text(`Employee: ${payslip.employeeProfile.firstName} ${payslip.employeeProfile.lastName}`, { bold: true });
    doc.fontSize(10).text(`Department: ${payslip.employeeProfile.Department?.name || 'N/A'}`);
    doc.text(`Salary: ${payslip.employeeProfile.salary || '0.00'}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // --- Earnings ---
    doc.fontSize(12).text('EARNINGS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Basic Salary: ${parseFloat(payslip.basicSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { indent: 20 });
    
    Object.entries(payslip.allowances || {}).forEach(([key, val]) => {
      if (val > 0) {
        doc.text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { indent: 20 });
      }
    });
    doc.moveDown();
    doc.text(`GROSS PAY: ${payslip.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { bold: true });
    doc.moveDown();

    // --- Deductions ---
    doc.fontSize(12).text('DEDUCTIONS', { underline: true });
    doc.moveDown(0.5);
    Object.entries(payslip.deductions || {}).forEach(([key, val]) => {
      if (val > 0) {
        doc.fontSize(10).text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { indent: 20 });
      }
    });
    doc.moveDown();
    doc.text(`TOTAL DEDUCTIONS: ${payslip.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { bold: true });
    doc.moveDown();

    // --- Summary ---
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(14).text(`NET PAY: ${payslip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { align: 'right', bold: true });
    
    doc.moveDown(3);
    doc.fontSize(8).text(`Generated by: ${payslip.generator?.email || 'System'} on ${new Date().toLocaleString()}`, { align: 'left', color: 'grey' });
    doc.text('This is a computer-generated document and does not require a signature.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF Generation Error:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF payslip' });
  }
});

module.exports = router;
