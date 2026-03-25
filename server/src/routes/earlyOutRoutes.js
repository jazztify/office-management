const express = require('express');
const { Op } = require('sequelize');
const { EarlyOutRequest, EmployeeProfile, User } = require('../models');
const { notifyHRAdmins, createAndSendNotification } = require('../services/wsService');

const router = express.Router();

/**
 * GET /api/early-out
 * List early-out/half-day requests
 */
router.get('/', async (req, res) => {
  try {
    const { status, date, requestType, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (status) filter.status = status;
    if (date) filter.date = date;
    if (requestType) filter.requestType = requestType;

    const hasManage = req.user.permissions?.includes('manage_leaves') || req.user.permissions?.includes('*');
    if (!hasManage) {
      const emp = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
      if (!emp) return res.json({ requests: [], pagination: { total: 0 } });
      filter.employeeId = emp._id;
    }

    const { count, rows } = await EarlyOutRequest.findAndCountAll({
      where: filter,
      include: [
        { model: EmployeeProfile, attributes: ['firstName', 'lastName', 'department', 'position'] },
        { model: User, as: 'approver', attributes: ['email'] }
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      requests: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
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
    const emp = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
    if (!emp) return res.status(404).json({ error: 'Employee profile not found' });

    if (!date || !requestType || !reason) {
      return res.status(400).json({ error: 'date, requestType, and reason are required' });
    }

    if (!['early_out', 'half_day'].includes(requestType)) {
      return res.status(400).json({ error: 'requestType must be "early_out" or "half_day"' });
    }

    const existing = await EarlyOutRequest.findOne({
      where: { employeeId: emp._id, date, requestType }
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

    const populated = await EarlyOutRequest.findByPk(request._id, {
      include: [{ model: EmployeeProfile, attributes: ['firstName', 'lastName'] }]
    });

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

    const update = {
      status,
      approvedBy: req.user?._id || null, // ApprovedBy is regular User ID here in DB? model/index shows approvedBy -> User
      approvedAt: new Date(),
    };

    if (status === 'rejected' && rejectionReason) {
      update.rejectionReason = rejectionReason;
    }

    const [updatedCount, updatedRows] = await EarlyOutRequest.update(update, {
      where: { _id: req.params.id, tenantId: req.tenantId },
      returning: true
    });

    if (updatedCount === 0) return res.status(404).json({ error: 'Request not found' });

    const request = await EarlyOutRequest.findByPk(req.params.id, {
      include: [
        { model: EmployeeProfile, attributes: ['firstName', 'lastName', 'userId'] },
        { model: User, as: 'approver', attributes: ['email'] }
      ]
    });

    const typeLabel = request.requestType === 'early_out' ? 'Early Out' : 'Half Day';
    const statusLabel = status === 'approved' ? 'Approved' : 'Declined';

    const empProfile = await EmployeeProfile.findByPk(request.employeeId);
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
 */
router.get('/check/:date', async (req, res) => {
  try {
    const emp = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
    if (!emp) return res.json({ hasApproval: false });

    const approval = await EarlyOutRequest.findOne({
      where: {
        employeeId: emp._id,
        date: req.params.date,
        status: 'approved',
      }
    });

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
