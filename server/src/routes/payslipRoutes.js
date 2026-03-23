const express = require('express');
const Payslip = require('../models/Payslip');
const EmployeeProfile = require('../models/EmployeeProfile');
const AttendanceLog = require('../models/AttendanceLog');
const Holiday = require('../models/Holiday');

const router = express.Router();

/**
 * GET /api/payslips
 * List all payslips (filterable by month, year, employee, status, payPeriod)
 */
router.get('/', async (req, res) => {
  try {
    const { month, year, employeeId, status, payPeriod, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (month) filter['period.month'] = parseInt(month);
    if (year) filter['period.year'] = parseInt(year);
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (payPeriod) filter.payPeriod = payPeriod;

    const payslips = await Payslip.find(filter)
      .populate('employeeId', 'firstName lastName department salary')
      .populate('generatedBy', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Payslip.countDocuments(filter);

    res.json({
      payslips,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('GET /payslips Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

/**
 * GET /api/payslips/:id
 * Get a single payslip by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employeeId', 'firstName lastName department salary')
      .populate('generatedBy', 'email')
      .lean();

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
    // full_month
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${y}-${String(m).padStart(2, '0')}-01`,
      endDate: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
    };
  }
}

/**
 * Helper: Calculate expected working days in a date range (exclude weekends)
 */
function getWorkingDays(startDate, endDate) {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // Skip Sunday(0) and Saturday(6)
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Helper: Calculate 13th month pay
 * Formula: Total basic salary earned in the year ÷ 12
 */
async function calculate13thMonthPay(employeeId, year, monthlyBasicSalary) {
  // Count how many months they've had payslips this year (already generated)
  const existingPayslips = await Payslip.find({
    employeeId,
    'period.year': year,
    payPeriod: 'full_month', // only count full month payslips for 13th month
  }).lean();

  // Total basic salary earned this year from existing payslips + current month
  const totalEarned = existingPayslips.reduce((sum, p) => sum + (p.basicSalary || 0), 0) + monthlyBasicSalary;

  return Math.round((totalEarned / 12) * 100) / 100;
}

/**
 * POST /api/payslips/generate
 * HR: Generate payslip for an employee
 * Uses employee's actual salary from their profile (dynamic, not hardcoded)
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

    if (!['first_half', 'second_half', 'full_month'].includes(payPeriod)) {
      return res.status(400).json({ error: 'payPeriod must be first_half, second_half, or full_month' });
    }

    // Verify employee exists and get their salary dynamically
    const employee = await EmployeeProfile.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // ─── DUPLICATE CHECK ─────────────────────────────────
    const existing = await Payslip.findOne({
      employeeId,
      'period.month': parseInt(month),
      'period.year': parseInt(year),
      payPeriod,
    });
    if (existing) {
      return res.status(409).json({
        error: `Payslip already exists for ${payPeriod.replace('_', ' ')} of ${month}/${year}. Cannot generate duplicate.`,
      });
    }

    // Use employee's salary from their profile (dynamic)
    const monthlySalary = employee.salary || 0;

    // Calculate basic salary based on pay period
    let basicSalary;
    const { startDate, endDate } = getPayPeriodDates(month, year, payPeriod);
    const workingDaysInPeriod = getWorkingDays(startDate, endDate);
    const totalMonthWorkingDays = getWorkingDays(
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    );

    if (payPeriod === 'full_month') {
      basicSalary = monthlySalary;
    } else {
      // Proportional salary based on working days in the period
      basicSalary = Math.round((monthlySalary / totalMonthWorkingDays) * workingDaysInPeriod * 100) / 100;
    }

    // Calculate attendance summary for the pay period
    const logs = await AttendanceLog.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    let workHrs = 0;
    let lateMins = 0;
    let presentDays = 0;

    logs.forEach(log => {
      workHrs += (log.totalWorkHours || 0);
      lateMins += (log.lateMinutes || 0);
      if (log.status !== 'absent' && (log.clockIn || log.totalWorkHours > 0)) {
        presentDays += 1;
      }
    });

    const totalLateHours = parseFloat((lateMins / 60).toFixed(2));
    const explicitAbsences = logs.filter(l => l.status === 'absent').length;
    const calculatedAbsences = Math.max(0, workingDaysInPeriod - presentDays);
    const totalAbsentDays = explicitAbsences > 0 ? explicitAbsences : calculatedAbsences;

    const summary = {
      totalWorkHours: parseFloat(workHrs.toFixed(2)),
      totalLateHours,
      totalAbsentDays,
    };

    // Holiday Pay Calculation
    const monthHolidays = await Holiday.find({
      tenantId: req.tenantId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59'),
      }
    }).lean();

    let computedHolidayPay = 0;
    let computedHolidayDed = 0;
    const dailyRate = monthlySalary / totalMonthWorkingDays;

    if (monthHolidays.length > 0) {
      const empLogs = await AttendanceLog.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      }).lean();

      monthHolidays.forEach(holiday => {
        const hDate = new Date(holiday.date);
        const nextDate = new Date(holiday.date);
        nextDate.setDate(nextDate.getDate() + 1);

        const hIso = new Date(hDate.getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];
        const nIso = new Date(nextDate.getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];

        const logH = empLogs.find(l => l.date === hIso);
        const logN = empLogs.find(l => l.date === nIso);

        const workedHoliday = logH && logH.totalWorkHours > 0;
        const absentNextDay = !logN || logN.status === 'absent' || logN.totalWorkHours === 0;

        if (workedHoliday) {
          if (!absentNextDay) {
            const multi = holiday.rateMultiplier || 2.0;
            computedHolidayPay += dailyRate * (multi - 1);
          }
        } else {
          if (holiday.isPaidUnworked && absentNextDay) {
            computedHolidayDed += dailyRate;
          }
        }
      });
    }

    allowances.holidayPay = (Number(allowances.holidayPay) || 0) + computedHolidayPay;
    deductions.holidayDeduction = (Number(deductions.holidayDeduction) || 0) + computedHolidayDed;

    // 13th Month Pay (only for December full_month or if explicitly requested)
    let thirteenthMonthPay = 0;
    if (include13thMonth || (parseInt(month) === 12 && payPeriod === 'full_month')) {
      thirteenthMonthPay = await calculate13thMonthPay(employeeId, parseInt(year), monthlySalary);
    }
    allowances.thirteenthMonthPay = thirteenthMonthPay;

    // Calculate totals
    const finalTotalAllowances = Object.values(allowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const finalTotalDeductions = Object.values(deductions).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const finalGrossPay = basicSalary + finalTotalAllowances;
    const finalNetPay = finalGrossPay - finalTotalDeductions;

    const payslip = await Payslip.create({
      tenantId: req.tenantId,
      employeeId,
      period: { month: parseInt(month), year: parseInt(year) },
      payPeriod,
      basicSalary,
      allowances: {
        housing: Number(allowances.housing) || 0,
        transport: Number(allowances.transport) || 0,
        meal: Number(allowances.meal) || 0,
        holidayPay: Number(allowances.holidayPay) || 0,
        thirteenthMonthPay,
        other: Number(allowances.other) || 0,
      },
      deductions: {
        tax: Number(deductions.tax) || 0,
        insurance: Number(deductions.insurance) || 0,
        sss: Number(deductions.sss) || 0,
        pagibig: Number(deductions.pagibig) || 0,
        philhealth: Number(deductions.philhealth) || 0,
        holidayDeduction: Number(deductions.holidayDeduction) || 0,
        other: Number(deductions.other) || 0,
      },
      attendanceSummary: summary,
      grossPay: finalGrossPay,
      totalDeductions: finalTotalDeductions,
      netPay: finalNetPay,
      generatedBy: req.user?._id,
      notes,
    });

    const populated = await Payslip.findById(payslip._id)
      .populate('employeeId', 'firstName lastName department salary')
      .populate('generatedBy', 'email')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /payslips/generate Error:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A payslip for this period already exists. Duplicate generation is not allowed.' });
    }
    res.status(500).json({ error: 'Failed to generate payslip' });
  }
});

/**
 * POST /api/payslips/generate-bulk
 * HR: Generate payslips for all employees at once
 * Uses each employee's OWN salary (dynamic, not hardcoded)
 */
router.post('/generate-bulk', async (req, res) => {
  try {
    const { month, year, payPeriod = 'full_month', allowances = {}, deductions = {}, include13thMonth = false } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    if (!['first_half', 'second_half', 'full_month'].includes(payPeriod)) {
      return res.status(400).json({ error: 'payPeriod must be first_half, second_half, or full_month' });
    }

    const employees = await EmployeeProfile.find({ tenantId: req.tenantId }).lean();
    const results = { created: 0, skipped: 0, errors: [] };

    const { startDate, endDate } = getPayPeriodDates(month, year, payPeriod);
    const workingDaysInPeriod = getWorkingDays(startDate, endDate);
    const totalMonthWorkingDays = getWorkingDays(
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    );

    for (const emp of employees) {
      try {
        // ─── DUPLICATE CHECK ───────────────────────
        const existing = await Payslip.findOne({
          employeeId: emp._id,
          'period.month': parseInt(month),
          'period.year': parseInt(year),
          payPeriod,
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Use THIS employee's salary (dynamic)
        const monthlySalary = emp.salary || 0;
        let basicSalary;

        if (payPeriod === 'full_month') {
          basicSalary = monthlySalary;
        } else {
          basicSalary = Math.round((monthlySalary / totalMonthWorkingDays) * workingDaysInPeriod * 100) / 100;
        }

        // Attendance summary
        const logs = await AttendanceLog.find({
          employeeId: emp._id,
          date: { $gte: startDate, $lte: endDate },
        }).lean();

        let workHrs = 0;
        let lateMins = 0;
        let presentDays = 0;

        logs.forEach(log => {
          workHrs += (log.totalWorkHours || 0);
          lateMins += (log.lateMinutes || 0);
          if (log.status !== 'absent' && (log.clockIn || log.totalWorkHours > 0)) {
            presentDays += 1;
          }
        });

        const totalLateHours = parseFloat((lateMins / 60).toFixed(2));
        const explicitAbsences = logs.filter(l => l.status === 'absent').length;
        const calculatedAbsences = Math.max(0, workingDaysInPeriod - presentDays);
        const totalAbsentDays = explicitAbsences > 0 ? explicitAbsences : calculatedAbsences;

        // Clone allowances/deductions per employee to avoid mutation
        const empAllowances = { ...allowances };
        const empDeductions = { ...deductions };

        // Holiday Pay for this employee
        const monthHolidays = await Holiday.find({
          tenantId: req.tenantId,
          date: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') },
        }).lean();

        let computedHolidayPay = 0;
        let computedHolidayDed = 0;
        const dailyRate = monthlySalary / totalMonthWorkingDays;

        if (monthHolidays.length > 0) {
          const empLogs = await AttendanceLog.find({
            employeeId: emp._id,
            date: { $gte: startDate, $lte: endDate },
          }).lean();

          monthHolidays.forEach(holiday => {
            const hDate = new Date(holiday.date);
            const nextDate = new Date(holiday.date);
            nextDate.setDate(nextDate.getDate() + 1);

            const hIso = new Date(hDate.getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];
            const nIso = new Date(nextDate.getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];

            const logH = empLogs.find(l => l.date === hIso);
            const logN = empLogs.find(l => l.date === nIso);

            const workedHoliday = logH && logH.totalWorkHours > 0;
            const absentNextDay = !logN || logN.status === 'absent' || logN.totalWorkHours === 0;

            if (workedHoliday) {
              if (!absentNextDay) {
                const multi = holiday.rateMultiplier || 2.0;
                computedHolidayPay += dailyRate * (multi - 1);
              }
            } else {
              if (holiday.isPaidUnworked && absentNextDay) {
                computedHolidayDed += dailyRate;
              }
            }
          });
        }

        empAllowances.holidayPay = (Number(empAllowances.holidayPay) || 0) + computedHolidayPay;
        empDeductions.holidayDeduction = (Number(empDeductions.holidayDeduction) || 0) + computedHolidayDed;

        // 13th Month Pay
        let thirteenthMonthPay = 0;
        if (include13thMonth || (parseInt(month) === 12 && payPeriod === 'full_month')) {
          thirteenthMonthPay = await calculate13thMonthPay(emp._id, parseInt(year), monthlySalary);
        }
        empAllowances.thirteenthMonthPay = thirteenthMonthPay;

        const finalTotalAllowances = Object.values(empAllowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const finalTotalDed = Object.values(empDeductions).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const finalGrossPay = basicSalary + finalTotalAllowances;
        const finalNetPay = finalGrossPay - finalTotalDed;

        await Payslip.create({
          tenantId: req.tenantId,
          employeeId: emp._id,
          period: { month: parseInt(month), year: parseInt(year) },
          payPeriod,
          basicSalary,
          allowances: {
            housing: Number(empAllowances.housing) || 0,
            transport: Number(empAllowances.transport) || 0,
            meal: Number(empAllowances.meal) || 0,
            holidayPay: Number(empAllowances.holidayPay) || 0,
            thirteenthMonthPay,
            other: Number(empAllowances.other) || 0,
          },
          deductions: {
            tax: Number(empDeductions.tax) || 0,
            insurance: Number(empDeductions.insurance) || 0,
            sss: Number(empDeductions.sss) || 0,
            pagibig: Number(empDeductions.pagibig) || 0,
            philhealth: Number(empDeductions.philhealth) || 0,
            holidayDeduction: Number(empDeductions.holidayDeduction) || 0,
            other: Number(empDeductions.other) || 0,
          },
          attendanceSummary: {
            totalWorkHours: parseFloat(workHrs.toFixed(2)) || 0,
            totalLateHours,
            totalAbsentDays,
          },
          grossPay: finalGrossPay,
          totalDeductions: finalTotalDed,
          netPay: finalNetPay,
          generatedBy: req.user?._id,
        });

        results.created++;
      } catch (e) {
        if (e.code === 11000) {
          results.skipped++;
        } else {
          results.errors.push({ employee: `${emp.firstName} ${emp.lastName}`, error: e.message });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk payslip generation complete`,
      results,
    });
  } catch (err) {
    console.error('POST /payslips/generate-bulk Error:', err.message);
    res.status(500).json({ error: 'Failed to generate bulk payslips' });
  }
});

/**
 * PATCH /api/payslips/:id/status
 * Update payslip status (e.g., mark as paid)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'generated', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be draft, generated, or paid' });
    }

    const payslip = await Payslip.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('employeeId', 'firstName lastName department salary')
      .populate('generatedBy', 'email');

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    res.json(payslip);
  } catch (err) {
    console.error('PATCH /payslips/:id/status Error:', err.message);
    res.status(500).json({ error: 'Failed to update payslip status' });
  }
});

/**
 * GET /api/payslips/check-duplicate
 * Check if a payslip already exists for the given parameters
 */
router.get('/check-duplicate', async (req, res) => {
  try {
    const { month, year, payPeriod, employeeId } = req.query;

    const filter = {
      'period.month': parseInt(month),
      'period.year': parseInt(year),
      payPeriod: payPeriod || 'full_month',
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const existing = await Payslip.findOne(filter).lean();

    res.json({
      exists: !!existing,
      payslip: existing || null,
    });
  } catch (err) {
    console.error('GET /payslips/check-duplicate Error:', err.message);
    res.status(500).json({ error: 'Failed to check duplicate' });
  }
});

module.exports = router;
