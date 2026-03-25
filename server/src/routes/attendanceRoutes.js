const express = require('express');
const { Op } = require('sequelize');
const { AttendanceLog, EmployeeProfile, EarlyOutRequest, Tenant, HardwareToken, User, OverrideLog, Department, Position } = require('../models');

const router = express.Router();

/**
 * Helper: Parse "HH:MM" string into { hours, minutes }
 */
function parseTime(timeStr) {
  if (!timeStr) return { hours: 8, minutes: 0 };
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

/**
 * Helper: Get today's date in YYYY-MM-DD (Manila timezone)
 */
function getTodayDate() {
  const now = new Date();
  const pht = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return pht.toISOString().split('T')[0];
}

/**
 * Helper: Calculate work metrics for a completed day
 */
function computeMetrics(record, settings) {
  const officeHours = settings?.officeHours || { start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' };
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
    if (lunchBreakMinutes > 0) {
      workMs -= lunchBreakMinutes * 60000;
    }
    totalWorkHours = Math.round((workMs / 3600000) * 100) / 100;
  }

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
 */
router.post('/punch', async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['clock-in', 'lunch-out', 'lunch-in', 'clock-out'];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const employee = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    const today = getTodayDate();
    const now = new Date();

    const tenant = await Tenant.findByPk(req.tenantId);
    const settings = tenant?.settings || {};
    const officeHours = settings?.officeHours || { start: '08:00', end: '17:00' };

    let record = await AttendanceLog.findOne({ where: { employeeId: employee._id, date: today } });

    if (!record) {
      if (action !== 'clock-in') {
        return res.status(400).json({ error: 'You must clock in first.' });
      }
      record = await AttendanceLog.create({
        tenantId: req.tenantId,
        employeeId: employee._id,
        date: today,
        ipAddress: req.headers['x-forwarded-for'] || req.ip,
      });
    }

    switch (action) {
      case 'clock-in':
        if (record.clockIn) return res.status(400).json({ error: 'Already clocked in.' });
        record.clockIn = now;
        break;

      case 'lunch-out':
        if (!record.clockIn) return res.status(400).json({ error: 'Must clock in first.' });
        if (record.lunchOut) return res.status(400).json({ error: 'Lunch break already started.' });
        if (record.clockOut) return res.status(400).json({ error: 'Already clocked out.' });
        record.lunchOut = now;
        break;

      case 'lunch-in':
        if (!record.lunchOut) return res.status(400).json({ error: 'Must go on lunch break first.' });
        if (record.lunchIn) return res.status(400).json({ error: 'Already returned.' });
        record.lunchIn = now;
        break;

      case 'clock-out': {
        if (!record.clockIn) return res.status(400).json({ error: 'Must clock in first.' });
        if (record.clockOut) return res.status(400).json({ error: 'Already clocked out.' });

        const expectedEnd = parseTime(officeHours.end);
        const currentTotal = now.getHours() * 60 + now.getMinutes();
        const expectedEndTotal = expectedEnd.hours * 60 + expectedEnd.minutes;

        const isManager = req.user.permissions?.includes('manage_employees') || req.user.permissions?.includes('*');

        if (currentTotal < expectedEndTotal && !isManager) {
          const approval = await EarlyOutRequest.findOne({
            where: {
              employeeId: employee._id,
              date: today,
              status: 'approved',
            }
          });

          if (!approval) {
            return res.status(403).json({
              error: 'Early clock-out requires an approved request.',
              requiresApproval: true,
            });
          }
        }
        record.clockOut = now;
        break;
      }
    }

    const metrics = computeMetrics(record, settings);
    Object.assign(record, metrics);
    await record.save();

    const populated = await AttendanceLog.findByPk(record._id, {
      include: [{ model: EmployeeProfile, attributes: ['firstName', 'lastName'] }]
    });

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
 * POST /api/attendance/punch-rfid
 * Triggered by IoT hardware
 */
router.post('/punch-rfid', async (req, res) => {
  try {
    const { tokenValue, deviceId } = req.body;
    if (!tokenValue) return res.status(400).json({ error: 'tokenValue is required' });

    // Find token and associated user
    const token = await HardwareToken.findOne({ 
      where: { tokenValue, status: 'ACTIVE' },
      include: [{ model: User, include: [EmployeeProfile] }]
    });

    if (!token || !token.User || !token.User.EmployeeProfile) {
      return res.status(404).json({ error: 'Valid token or employee not found.' });
    }

    const employee = token.User.EmployeeProfile;
    const tenantId = token.tenantId;
    const today = getTodayDate();
    const now = new Date();

    // Verify IoT Device exists and is ONLINE
    const device = deviceId ? await IotDevice.findByPk(deviceId) : null;
    if (deviceId && (!device || device.status !== 'ONLINE')) {
      return res.status(400).json({ error: 'IoT Device is offline or unauthorized.' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    const settings = tenant?.settings || {};
    
    let record = await AttendanceLog.findOne({ where: { employeeId: employee._id, date: today } });

    let action = '';
    if (!record) {
      record = await AttendanceLog.create({
        tenantId,
        employeeId: employee._id,
        date: today,
        clockIn: now,
        ipAddress: `IOT-${device?.name || 'UNKNOWN'}-${deviceId || 'RFID'}`,
      });
      action = 'clock-in';
    } else if (!record.lunchOut && settings.autoLunch) {
       record.lunchOut = now;
       action = 'lunch-out';
    } else if (record.lunchOut && !record.lunchIn) {
       record.lunchIn = now;
       action = 'lunch-in';
    } else if (!record.clockOut) {
      record.clockOut = now;
      action = 'clock-out';
    } else {
      return res.status(400).json({ error: 'Daily attendance already completed.' });
    }

    const metrics = computeMetrics(record, settings);
    Object.assign(record, metrics);
    await record.save();

    res.status(200).json({
      message: `${employee.firstName} ${action} recorded via ${token.type} (${token.tokenValue.slice(-4)})`,
      record
    });
  } catch (err) {
    console.error('RFID Punch Error:', err.message);
    res.status(500).json({ error: 'Internal server error during RFID punch' });
  }
});

/**
 * PATCH /api/attendance/:id
 * Admin manual override with OverrideLog tracking
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clockIn, clockOut, status, remarks, reason } = req.body;
    
    if (!req.user.permissions?.includes('manage_employees') && !req.user.permissions?.includes('*')) {
      return res.status(403).json({ error: 'Unauthorized manual override.' });
    }

    const record = await AttendanceLog.findByPk(id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });

    const fieldsToUpdate = { clockIn, clockOut, status, remarks };
    const tenant = await Tenant.findByPk(req.tenantId);
    const settings = tenant?.settings || {};

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      if (value !== undefined && record[key] !== value) {
        // Log the override
        await OverrideLog.create({
          tenantId: req.tenantId,
          attendanceLogId: record._id,
          adminId: req.user._id,
          fieldName: key,
          oldValue: record[key]?.toString() || 'NULL',
          newValue: value?.toString() || 'NULL',
          reason: reason || 'Manual adjustment by admin',
        });
        record[key] = value;
      }
    }

    // Recalculate metrics after manual edits
    const metrics = computeMetrics(record, settings);
    Object.assign(record, metrics);
    await record.save();

    res.json({ message: 'Attendance record updated and override logged.', record });
  } catch (err) {
    console.error('Attendance Patch Error:', err.message);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

/**
 * GET /api/attendance/my-today
 */
router.get('/my-today', async (req, res) => {
  try {
    const employee = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
    if (!employee) return res.json({ record: null });

    const today = getTodayDate();
    const record = await AttendanceLog.findOne({
      where: { employeeId: employee._id, date: today },
      include: [{ model: EmployeeProfile, attributes: ['firstName', 'lastName'] }]
    });

    const tenant = await Tenant.findByPk(req.tenantId);
    const earlyOutApproval = await EarlyOutRequest.findOne({
      where: { employeeId: employee._id, date: today, status: 'approved' }
    });

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
 */
router.get('/my-history', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 31 } = req.query;
    const employee = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
    if (!employee) return res.json({ records: [], pagination: { total: 0 } });

    const filter = { employeeId: employee._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date[Op.gte] = startDate;
      if (endDate) filter.date[Op.lte] = endDate;
    }

    const { count, rows } = await AttendanceLog.findAndCountAll({
      where: filter,
      include: [{ model: EmployeeProfile, attributes: ['firstName', 'lastName'] }],
      order: [['date', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      records: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    });
  } catch (err) {
    console.error('GET /attendance/my-history Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

/**
 * GET /api/attendance
 */
router.get('/', async (req, res) => {
  try {
    let { employeeId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    const isHR = req.user.permissions?.includes('manage_employees') || 
                 req.user.permissions?.includes('*') || 
                 req.user.permissions?.includes('hr_payroll');

    if (!req.user.permissions || !isHR) {
      const emp = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
      if (!emp) return res.json({ records: [], pagination: { total: 0 } });
      employeeId = emp._id;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date[Op.gte] = startDate;
      if (endDate) filter.date[Op.lte] = endDate;
    }

    const { count, rows } = await AttendanceLog.findAndCountAll({
      where: filter,
      include: [
        { 
          model: EmployeeProfile, 
          as: 'employeeProfile',
          attributes: ['firstName', 'lastName'],
          include: [
            { model: Department, attributes: ['name'] },
            { model: Position, attributes: ['name'] }
          ]
        }
      ],
      order: [['date', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      records: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    });
  } catch (err) {
    console.error('GET /attendance Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

/**
 * GET /api/attendance/employees-list
 */
router.get('/employees-list', async (req, res) => {
  try {
    const employees = await EmployeeProfile.findAll({
      where: { tenantId: req.tenantId },
      attributes: ['_id', 'firstName', 'lastName', 'department', 'position'],
      order: [['firstName', 'ASC']]
    });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

module.exports = router;
