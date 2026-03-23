const express = require('express');
const AttendanceLog = require('../models/AttendanceLog');
const EmployeeProfile = require('../models/EmployeeProfile');
const EarlyOutRequest = require('../models/EarlyOutRequest');
const Tenant = require('../models/Tenant');

const router = express.Router();

/**
 * Helper: Parse "HH:MM" string into { hours, minutes }
 */
function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

/**
 * Helper: Get today's date in YYYY-MM-DD (Manila timezone)
 */
function getTodayDate() {
  const now = new Date();
  // Offset to Philippine Standard Time (UTC+8)
  const pht = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return pht.toISOString().split('T')[0];
}

/**
 * Helper: Calculate work metrics for a completed day
 */
function computeMetrics(record, settings) {
  const officeHours = settings?.officeHours || { start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' };
  const deductions = settings?.deductions || {};
  const gracePeriod = settings?.gracePeriod || 15;

  let totalWorkHours = 0;
  let lunchBreakMinutes = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;

  // Calculate late minutes
  if (record.clockIn) {
    const expectedStart = parseTime(officeHours.start);
    const clockInDate = new Date(record.clockIn);
    const clockInHours = clockInDate.getHours();
    const clockInMinutes = clockInDate.getMinutes();
    const clockInTotal = clockInHours * 60 + clockInMinutes;
    const expectedTotal = expectedStart.hours * 60 + expectedStart.minutes + gracePeriod;

    if (clockInTotal > expectedTotal) {
      lateMinutes = clockInTotal - (expectedStart.hours * 60 + expectedStart.minutes);
    }
  }

  // Calculate lunch break duration
  if (record.lunchOut && record.lunchIn) {
    lunchBreakMinutes = Math.round((new Date(record.lunchIn) - new Date(record.lunchOut)) / 60000);
  }

  // Calculate undertime
  if (record.clockOut) {
    const expectedEnd = parseTime(officeHours.end);
    const clockOutDate = new Date(record.clockOut);
    const clockOutHours = clockOutDate.getHours();
    const clockOutMinutes = clockOutDate.getMinutes();
    const clockOutTotal = clockOutHours * 60 + clockOutMinutes;
    const expectedEndTotal = expectedEnd.hours * 60 + expectedEnd.minutes;

    if (clockOutTotal < expectedEndTotal) {
      undertimeMinutes = expectedEndTotal - clockOutTotal;
    }
  }

  // Calculate total work hours
  if (record.clockIn && record.clockOut) {
    let workMs = new Date(record.clockOut) - new Date(record.clockIn);
    // Subtract lunch break
    if (lunchBreakMinutes > 0) {
      workMs -= lunchBreakMinutes * 60000;
    }
    totalWorkHours = Math.round((workMs / 3600000) * 100) / 100; // Round to 2 decimals
  }

  // Determine status
  let status = 'incomplete';
  if (record.clockIn && record.clockOut) {
    if (totalWorkHours >= 7) {
      status = 'complete';
    } else if (totalWorkHours >= 3.5) {
      status = 'half_day';
    } else {
      status = 'incomplete';
    }
  }

  return { totalWorkHours, lunchBreakMinutes, lateMinutes, undertimeMinutes, status };
}

/**
 * POST /api/attendance/punch
 * Employee punches: clock-in, lunch-out, lunch-in, clock-out
 * Philippine Standard: 8AM → 12PM | Lunch 12-1PM | 1PM → 5PM
 *
 * EARLY OUT RULE: If it's before the scheduled end time (e.g. 5PM),
 * employee must have an approved early-out or half-day request to clock out.
 */
router.post('/punch', async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['clock-in', 'lunch-out', 'lunch-in', 'clock-out'];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use: clock-in, lunch-out, lunch-in, clock-out' });
    }

    // Find the employee profile for this user
    const employee = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found. Contact HR.' });
    }

    const today = getTodayDate();
    const now = new Date();

    // Get tenant settings for validation
    const tenant = await Tenant.findById(req.tenantId).lean();
    const settings = tenant?.settings || {};
    const officeHours = settings?.officeHours || { start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' };

    // Find or create today's attendance record
    let record = await AttendanceLog.findOne({ employeeId: employee._id, date: today });

    if (!record) {
      if (action !== 'clock-in') {
        return res.status(400).json({ error: 'You must clock in first before performing other actions.' });
      }
      record = new AttendanceLog({
        tenantId: req.tenantId,
        employeeId: employee._id,
        date: today,
        ipAddress: req.headers['x-forwarded-for'] || req.ip,
      });
    }

    // Validate action sequence
    switch (action) {
      case 'clock-in':
        if (record.clockIn) {
          return res.status(400).json({ error: 'You have already clocked in today.' });
        }
        record.clockIn = now;
        break;

      case 'lunch-out':
        if (!record.clockIn) {
          return res.status(400).json({ error: 'You must clock in first.' });
        }
        if (record.lunchOut) {
          return res.status(400).json({ error: 'Lunch break already started.' });
        }
        if (record.clockOut) {
          return res.status(400).json({ error: 'You have already clocked out.' });
        }
        record.lunchOut = now;
        break;

      case 'lunch-in':
        if (!record.lunchOut) {
          return res.status(400).json({ error: 'You must go on lunch break first.' });
        }
        if (record.lunchIn) {
          return res.status(400).json({ error: 'You already returned from lunch.' });
        }
        record.lunchIn = now;
        break;

      case 'clock-out': {
        if (!record.clockIn) {
          return res.status(400).json({ error: 'You must clock in first.' });
        }
        if (record.clockOut) {
          return res.status(400).json({ error: 'You have already clocked out today.' });
        }

        // ─── EARLY OUT CHECK ───────────────────────────────
        // If current time is before the scheduled end time, require approval
        const expectedEnd = parseTime(officeHours.end);
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTotal = currentHours * 60 + currentMinutes;
        const expectedEndTotal = expectedEnd.hours * 60 + expectedEnd.minutes;

        // Check if HR/Admin (they can clock out anytime)
        const isManager = req.user.permissions?.includes('manage_leaves') || req.user.permissions?.includes('*');

        if (currentTotal < expectedEndTotal && !isManager) {
          // Check if they have an approved early-out or half-day request
          const approval = await EarlyOutRequest.findOne({
            employeeId: employee._id,
            date: today,
            status: 'approved',
          }).lean();

          if (!approval) {
            return res.status(403).json({
              error: 'Early clock-out requires an approved early-out or half-day request. Please submit a request first.',
              requiresApproval: true,
            });
          }
        }

        // Auto-fill lunch if they didn't take one
        if (!record.lunchOut) {
          record.lunchOut = null;
          record.lunchIn = null;
        }
        record.clockOut = now;
        break;
      }
    }

    // Re-compute metrics after each punch
    const metrics = computeMetrics(record, settings);
    record.totalWorkHours = metrics.totalWorkHours;
    record.lunchBreakMinutes = metrics.lunchBreakMinutes;
    record.lateMinutes = metrics.lateMinutes;
    record.undertimeMinutes = metrics.undertimeMinutes;
    record.status = metrics.status;

    await record.save();

    // Populate employee name for response
    const populated = await AttendanceLog.findById(record._id)
      .populate('employeeId', 'firstName lastName')
      .lean();

    res.status(200).json({
      message: `${action.replace('-', ' ')} recorded successfully!`,
      record: populated,
    });
  } catch (err) {
    console.error('POST /attendance/punch Error:', err.message);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

/**
 * GET /api/attendance/my-today
 * Get current user's attendance record for today
 */
router.get('/my-today', async (req, res) => {
  try {
    const employee = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
    if (!employee) {
      return res.json({ record: null });
    }

    const today = getTodayDate();
    const record = await AttendanceLog.findOne({ employeeId: employee._id, date: today })
      .populate('employeeId', 'firstName lastName')
      .lean();

    // Get tenant settings
    const tenant = await Tenant.findById(req.tenantId).lean();

    // Check for approved early-out
    const earlyOutApproval = await EarlyOutRequest.findOne({
      employeeId: employee._id,
      date: today,
      status: 'approved',
    }).lean();

    res.json({
      record,
      settings: tenant?.settings || {},
      earlyOutApproval: earlyOutApproval || null,
    });
  } catch (err) {
    console.error('GET /attendance/my-today Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
});

/**
 * GET /api/attendance/my-history
 * Get current user's attendance history
 */
router.get('/my-history', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 31 } = req.query;
    const employee = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
    if (!employee) {
      return res.json({ records: [], pagination: { total: 0 } });
    }

    const filter = { employeeId: employee._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const records = await AttendanceLog.find(filter)
      .populate('employeeId', 'firstName lastName')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await AttendanceLog.countDocuments(filter);

    res.json({
      records,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('GET /attendance/my-history Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

/**
 * GET /api/attendance
 * HR/Admin: List all attendance with optional filters
 */
router.get('/', async (req, res) => {
  try {
    let { employeeId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    // If not HR/Admin, restrict to own records
    if (!req.user.permissions || (!req.user.permissions.includes('manage_employees') && !req.user.permissions.includes('*'))) {
      const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
      if (!emp) return res.json({ records: [], pagination: { total: 0 } });
      employeeId = emp._id.toString();
    }

    if (employeeId) filter.employeeId = employeeId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const records = await AttendanceLog.find(filter)
      .populate('employeeId', 'firstName lastName department position')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await AttendanceLog.countDocuments(filter);

    res.json({
      records,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('GET /attendance Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

/**
 * GET /api/attendance/employees-list
 * HR: Get list of employees for filter dropdown
 */
router.get('/employees-list', async (req, res) => {
  try {
    const employees = await EmployeeProfile.find({ tenantId: req.tenantId })
      .select('firstName lastName department position')
      .sort({ firstName: 1 })
      .lean();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

module.exports = router;
