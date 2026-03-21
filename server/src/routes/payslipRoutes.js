const express = require('express');
const Payslip = require('../models/Payslip');
const EmployeeProfile = require('../models/EmployeeProfile');
const AttendanceLog = require('../models/AttendanceLog');
const Holiday = require('../models/Holiday');

const router = express.Router();

/**
 * GET /api/payslips
 * List all payslips (filterable by month, year, employee, status)
 */
router.get('/', async (req, res) => {
  try {
    const { month, year, employeeId, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (month) filter['period.month'] = parseInt(month);
    if (year) filter['period.year'] = parseInt(year);
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    const payslips = await Payslip.find(filter)
      .populate('employeeId', 'firstName lastName department')
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
      .populate('employeeId', 'firstName lastName department')
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
 * POST /api/payslips/generate
 * HR: Generate payslip for an employee
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      basicSalary,
      allowances = {},
      deductions = {},
      notes,
    } = req.body;

    if (!employeeId || !month || !year || !basicSalary) {
      return res.status(400).json({ error: 'employeeId, month, year, and basicSalary are required' });
    }

    // Verify employee exists
    const employee = await EmployeeProfile.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check for duplicate
    const existing = await Payslip.findOne({
      employeeId,
      'period.month': parseInt(month),
      'period.year': parseInt(year),
    });
    if (existing) {
      return res.status(409).json({ error: `Payslip already exists for ${month}/${year}` });
    }

    // Calculate totals
    const totalAllowances = Object.values(allowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const totalDeductions = Object.values(deductions).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const grossPay = Number(basicSalary) + totalAllowances;
    const netPay = grossPay - totalDeductions;

    // Calculate attendance summary if not provided manually
    let summary = req.body.attendanceSummary;
    if (!summary) {
      const yearMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      const logs = await AttendanceLog.find({
        employeeId,
        date: { $regex: `^${yearMonthPrefix}` }
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
      // Estimate absent days based on a standard 22 working day month or explicit 'absent' logs
      const explicitAbsences = logs.filter(l => l.status === 'absent').length;
      const calculatedAbsences = Math.max(0, 22 - presentDays); 
      // User requested "how many absent". Let's just use calculatedAbsences if they didn't manually punch absences.
      const totalAbsentDays = explicitAbsences > 0 ? explicitAbsences : calculatedAbsences;

      summary = {
        totalWorkHours: parseFloat(workHrs.toFixed(2)),
        totalLateHours,
        totalAbsentDays
      };
    }

    // Holiday Pay Calculation
    const monthHolidays = await Holiday.find({
      tenantId: req.tenantId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59)
      }
    }).lean();

    let computedHolidayPay = 0;
    let computedHolidayDed = 0;
    const dailyRate = Number(basicSalary) / 22; // rough PH standard estimate

    if (monthHolidays.length > 0) {
      const startIso = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endIso = new Date(year, month, 7).toISOString().split('T')[0]; // +7 to cover next days of end of month
      const logs = await AttendanceLog.find({
        employeeId,
        date: { $gte: startIso, $lte: endIso }
      }).lean();

      monthHolidays.forEach(holiday => {
        const hDate = new Date(holiday.date);
        const nextDate = new Date(holiday.date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Adjust for timezone differences safely (Manila)
        const hIso = new Date(hDate.getTime() + 8*3600*1000).toISOString().split('T')[0];
        const nIso = new Date(nextDate.getTime() + 8*3600*1000).toISOString().split('T')[0];

        const logH = logs.find(l => l.date === hIso);
        const logN = logs.find(l => l.date === nIso);

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

    // Recalculate totals
    const finalTotalAllowances = Object.values(allowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const finalTotalDeductions = Object.values(deductions).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const finalGrossPay = Number(basicSalary) + finalTotalAllowances;
    const finalNetPay = finalGrossPay - finalTotalDeductions;

    const payslip = await Payslip.create({
      tenantId: req.tenantId,
      employeeId,
      period: { month: parseInt(month), year: parseInt(year) },
      basicSalary: Number(basicSalary),
      allowances: {
        housing: Number(allowances.housing) || 0,
        transport: Number(allowances.transport) || 0,
        meal: Number(allowances.meal) || 0,
        holidayPay: Number(allowances.holidayPay) || 0,
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
      attendanceSummary: {
        totalWorkHours: Number(summary.totalWorkHours) || 0,
        totalLateHours: Number(summary.totalLateHours) || 0,
        totalAbsentDays: Number(summary.totalAbsentDays) || 0,
      },
      grossPay: finalGrossPay,
      totalDeductions: finalTotalDeductions,
      netPay: finalNetPay,
      generatedBy: req.user?._id,
      notes,
    });

    const populated = await Payslip.findById(payslip._id)
      .populate('employeeId', 'firstName lastName department')
      .populate('generatedBy', 'email')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /payslips/generate Error:', err.message);
    res.status(500).json({ error: 'Failed to generate payslip' });
  }
});

/**
 * POST /api/payslips/generate-bulk
 * HR: Generate payslips for all employees at once
 */
router.post('/generate-bulk', async (req, res) => {
  try {
    const { month, year, basicSalary, allowances = {}, deductions = {} } = req.body;

    if (!month || !year || !basicSalary) {
      return res.status(400).json({ error: 'month, year, and basicSalary are required' });
    }

    const employees = await EmployeeProfile.find().lean();
    const results = { created: 0, skipped: 0, errors: [] };

    for (const emp of employees) {
      try {
        const existing = await Payslip.findOne({
          employeeId: emp._id,
          'period.month': parseInt(month),
          'period.year': parseInt(year),
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const totalAllowances = Object.values(allowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const totalDed = Object.values(deductions).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const grossPay = Number(basicSalary) + totalAllowances;
        const netPay = grossPay - totalDed;

        // Calculate attendance summary
        const yearMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
        const logs = await AttendanceLog.find({
          employeeId: emp._id,
          date: { $regex: `^${yearMonthPrefix}` }
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
        const calculatedAbsences = Math.max(0, 22 - presentDays); 
        const totalAbsentDays = explicitAbsences > 0 ? explicitAbsences : calculatedAbsences;

        // Holiday Pay Calculation for Bulk
        const monthHolidays = await Holiday.find({
          tenantId: req.tenantId,
          date: { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) }
        }).lean();

        let computedHolidayPay = 0;
        let computedHolidayDed = 0;
        const dailyRate = Number(basicSalary) / 22;

        if (monthHolidays.length > 0) {
          const startIso = new Date(year, month - 1, 1).toISOString().split('T')[0];
          const endIso = new Date(year, month, 7).toISOString().split('T')[0];
          const empLogs = await AttendanceLog.find({ employeeId: emp._id, date: { $gte: startIso, $lte: endIso } }).lean();

          monthHolidays.forEach(holiday => {
            const hDate = new Date(holiday.date);
            const nextDate = new Date(holiday.date);
            nextDate.setDate(nextDate.getDate() + 1);

            const hIso = new Date(hDate.getTime() + 8*3600*1000).toISOString().split('T')[0];
            const nIso = new Date(nextDate.getTime() + 8*3600*1000).toISOString().split('T')[0];

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

        const finalTotalAllowances = Object.values(allowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const finalTotalDed = Object.values(deductions).reduce((sum, v) => sum + (Number(v) || 0), 0);
        const finalGrossPay = Number(basicSalary) + finalTotalAllowances;
        const finalNetPay = finalGrossPay - finalTotalDed;

        await Payslip.create({
          tenantId: req.tenantId,
          employeeId: emp._id,
          period: { month: parseInt(month), year: parseInt(year) },
          basicSalary: Number(basicSalary),
          allowances: {
            housing: Number(allowances.housing) || 0,
            transport: Number(allowances.transport) || 0,
            meal: Number(allowances.meal) || 0,
            holidayPay: Number(allowances.holidayPay) || 0,
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
        results.errors.push({ employee: `${emp.firstName} ${emp.lastName}`, error: e.message });
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
      .populate('employeeId', 'firstName lastName department')
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

module.exports = router;
