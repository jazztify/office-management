const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const { approveLeaveRequest } = require('../services/leaveService');
const { checkPermission } = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * GET /api/leaves
 * List leave requests (filterable by status and employee)
 */
router.get('/', async (req, res) => {
  try {
    const { status, employeeId, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (status) filter.status = status;

    // Secure query for non-managers
    const hasManageLeaves = req.user.permissions?.includes('manage_leaves') || req.user.permissions?.includes('*');
    if (!hasManageLeaves) {
      const EmployeeProfile = require('../models/EmployeeProfile');
      const userProfile = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
      if (!userProfile) {
        return res.json({ requests: [], pagination: { total: 0, page: 1, limit: parseInt(limit), totalPages: 0 } });
      }
      filter.employeeId = userProfile._id;
    } else {
      if (employeeId) filter.employeeId = employeeId;
    }

    const requests = await LeaveRequest.find(filter)
      .populate('employeeId', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await LeaveRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('GET /leaves Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

/**
 * POST /api/leaves
 * Submit a new leave request
 */
router.post('/', async (req, res) => {
  try {
    let { employeeId, leaveType, startDate, endDate, reason } = req.body;

    // Automatically resolve employeeId for regular users, or if omitted
    if (!employeeId || (!req.user.permissions?.includes('manage_leaves') && !req.user.permissions?.includes('*'))) {
      const EmployeeProfile = require('../models/EmployeeProfile');
      const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
      if (!emp) return res.status(404).json({ error: 'Employee profile not found' });
      employeeId = emp._id;
    }

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'employeeId, leaveType, startDate, and endDate are required' });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const request = await LeaveRequest.create({
      tenantId: req.tenantId,
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
    });

    res.status(201).json(request);
  } catch (err) {
    console.error('POST /leaves Error:', err.message);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

/**
 * POST /api/leaves/:id/approve
 * Manager approval — triggers ACID transaction for credit deduction
 */
router.post('/:id/approve', checkPermission('manage_leaves'), async (req, res) => {
  try {
    const managerId = req.headers['x-manager-id'] || req.user?._id;
    const result = await approveLeaveRequest(req.params.id, managerId);
    res.json(result);
  } catch (err) {
    console.error('POST /leaves/:id/approve Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/leaves/:id/reject
 * Reject a pending leave request
 */
router.post('/:id/reject', checkPermission('manage_leaves'), async (req, res) => {
  try {
    const request = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', approvedBy: req.user?._id },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: 'Leave request not found or already processed' });
    }

    res.json({ success: true, message: 'Leave request rejected', request });
  } catch (err) {
    console.error('POST /leaves/:id/reject Error:', err.message);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
});

module.exports = router;
