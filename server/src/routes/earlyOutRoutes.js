const express = require('express');
const EarlyOutRequest = require('../models/EarlyOutRequest');
const EmployeeProfile = require('../models/EmployeeProfile');
const { notifyHRAdmins, createAndSendNotification } = require('../services/wsService');

const router = express.Router();

/**
 * GET /api/early-out
 * List early-out/half-day requests — employees see their own, HR/Admin sees all
 */
router.get('/', async (req, res) => {
  try {
    const { status, date, requestType, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (status) filter.status = status;
    if (date) filter.date = date;
    if (requestType) filter.requestType = requestType;

    // Regular employees only see their own
    const hasManage = req.user.permissions?.includes('manage_leaves') || req.user.permissions?.includes('*');
    if (!hasManage) {
      const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
      if (!emp) return res.json({ requests: [], pagination: { total: 0 } });
      filter.employeeId = emp._id;
    }

    const requests = await EarlyOutRequest.find(filter)
      .populate('employeeId', 'firstName lastName department position')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await EarlyOutRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /early-out Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * POST /api/early-out
 * Employee: Submit an early-out or half-day request
 */
router.post('/', async (req, res) => {
  try {
    const { date, requestType, reason, requestedClockOut } = req.body;
    const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
    if (!emp) return res.status(404).json({ error: 'Employee profile not found' });

    if (!date || !requestType || !reason) {
      return res.status(400).json({ error: 'date, requestType, and reason are required' });
    }

    if (!['early_out', 'half_day'].includes(requestType)) {
      return res.status(400).json({ error: 'requestType must be "early_out" or "half_day"' });
    }

    // Check for existing request
    const existing = await EarlyOutRequest.findOne({
      employeeId: emp._id,
      date,
      requestType,
    });
    if (existing) {
      return res.status(409).json({ error: `You already have a ${requestType.replace('_', ' ')} request for this date` });
    }

    const request = await EarlyOutRequest.create({
      tenantId: req.tenantId,
      employeeId: emp._id,
      date,
      requestType,
      reason,
      requestedClockOut: requestedClockOut || null,
    });

    const populated = await EarlyOutRequest.findById(request._id)
      .populate('employeeId', 'firstName lastName')
      .lean();

    // Notify HR/Admin
    const empName = `${emp.firstName} ${emp.lastName}`;
    const typeLabel = requestType === 'early_out' ? 'Early Out' : 'Half Day';

    await notifyHRAdmins(req.tenantId, {
      senderId: req.user._id,
      type: `${requestType}_request`,
      title: `New ${typeLabel} Request`,
      message: `${empName} is requesting ${typeLabel.toLowerCase()} for ${date}. Reason: ${reason}`,
      referenceId: request._id,
      referenceModel: 'EarlyOutRequest',
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /early-out Error:', err.message);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

/**
 * PATCH /api/early-out/:id/status
 * HR/Admin: Approve or reject request
 */
router.patch('/:id/status', async (req, res) => {
  try {
    if (!req.user.permissions?.includes('manage_leaves') && !req.user.permissions?.includes('*')) {
      return res.status(403).json({ error: 'Only HR/Admin can approve these requests' });
    }

    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
    }

    const hrEmp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();

    const update = {
      status,
      approvedBy: hrEmp?._id || null,
      approvedAt: new Date(),
    };

    if (status === 'rejected' && rejectionReason) {
      update.rejectionReason = rejectionReason;
    }

    const request = await EarlyOutRequest.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('employeeId', 'firstName lastName userId')
      .populate('approvedBy', 'firstName lastName');

    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Notify the employee about the decision
    const typeLabel = request.requestType === 'early_out' ? 'Early Out' : 'Half Day';
    const statusLabel = status === 'approved' ? 'Approved' : 'Declined';

    // Get the user ID from the employee profile
    const empProfile = await EmployeeProfile.findById(request.employeeId._id).lean();
    if (empProfile) {
      await createAndSendNotification({
        tenantId: req.tenantId,
        recipientId: empProfile.userId,
        senderId: req.user._id,
        type: `${request.requestType}_${status}`,
        title: `${typeLabel} Request ${statusLabel}`,
        message: `Your ${typeLabel.toLowerCase()} request for ${request.date} has been ${status}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
        referenceId: request._id,
        referenceModel: 'EarlyOutRequest',
      });
    }

    res.json(request);
  } catch (err) {
    console.error('PATCH /early-out/:id/status Error:', err.message);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

/**
 * GET /api/early-out/check/:date
 * Check if current user has an approved early-out or half-day for a given date
 */
router.get('/check/:date', async (req, res) => {
  try {
    const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
    if (!emp) return res.json({ hasApproval: false });

    const approval = await EarlyOutRequest.findOne({
      employeeId: emp._id,
      date: req.params.date,
      status: 'approved',
    }).lean();

    res.json({
      hasApproval: !!approval,
      approval: approval || null,
    });
  } catch (err) {
    console.error('GET /early-out/check Error:', err.message);
    res.status(500).json({ error: 'Failed to check approval' });
  }
});

module.exports = router;
