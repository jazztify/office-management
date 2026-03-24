const express = require('express');
const { Op } = require('sequelize');
const { LeaveRequest, EmployeeProfile, User } = require('../models');
const { approveLeaveRequest } = require('../services/leaveService');
const { checkPermission } = require('../middlewares/checkPermission');
const { notifyHRAdmins, createAndSendNotification } = require('../services/wsService');

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
      const userProfile = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
      if (!userProfile) {
        return res.json({ requests: [], pagination: { total: 0, page: 1, limit: parseInt(limit), totalPages: 0 } });
      }
      filter.employeeId = userProfile._id;
    } else {
      if (employeeId) filter.employeeId = employeeId;
    }

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where: filter,
      include: [
        { model: EmployeeProfile, as: 'employee', attributes: ['firstName', 'lastName'] },
        { model: User, as: 'approver', attributes: ['email'] } // Actually models/index has approvedBy -> User
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      requests: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
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

    if (!employeeId || (!req.user.permissions?.includes('manage_leaves') && !req.user.permissions?.includes('*'))) {
      const emp = await EmployeeProfile.findOne({ where: { userId: req.user._id } });
      if (!emp) return res.status(404).json({ error: 'Employee profile not found' });
      employeeId = emp._id;
    }

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'employeeId, leaveType, startDate, and endDate are required' });
    }

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

    const emp = await EmployeeProfile.findByPk(employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'An employee';

    await notifyHRAdmins(req.tenantId, {
      senderId: req.user._id,
      type: 'leave_request',
      title: 'New Leave Request',
      message: `${empName} requested ${leaveType} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.${reason ? ' Reason: ' + reason : ''}`,
      referenceId: request._id,
      referenceModel: 'LeaveRequest',
    });

    res.status(201).json(request);
  } catch (err) {
    console.error('POST /leaves Error:', err.message);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

/**
 * POST /api/leaves/:id/approve
 */
router.post('/:id/approve', checkPermission('manage_leaves'), async (req, res) => {
  try {
    const managerId = req.headers['x-manager-id'] || req.user?._id;
    const result = await approveLeaveRequest(req.params.id, managerId);

    const leaveReq = await LeaveRequest.findByPk(req.params.id);
    if (leaveReq) {
      const empProfile = await EmployeeProfile.findByPk(leaveReq.employeeId);
      if (empProfile) {
        await createAndSendNotification({
          tenantId: req.tenantId,
          recipientId: empProfile.userId,
          senderId: req.user._id,
          type: 'leave_approved',
          title: 'Leave Request Approved',
          message: `Your ${leaveReq.leaveType} leave request has been approved.`,
          referenceId: leaveReq._id,
          referenceModel: 'LeaveRequest',
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('POST /leaves/:id/approve Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/leaves/:id/reject
 */
router.post('/:id/reject', checkPermission('manage_leaves'), async (req, res) => {
  try {
    const [updatedCount, updatedRows] = await LeaveRequest.update(
      { status: 'rejected', approvedBy: req.user?._id },
      { where: { _id: req.params.id, status: 'pending', tenantId: req.tenantId }, returning: true }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Leave request not found or already processed' });
    }

    const request = updatedRows[0];
    const empProfile = await EmployeeProfile.findByPk(request.employeeId);
    if (empProfile) {
      await createAndSendNotification({
        tenantId: req.tenantId,
        recipientId: empProfile.userId,
        senderId: req.user._id,
        type: 'leave_rejected',
        title: 'Leave Request Declined',
        message: `Your ${request.leaveType} leave request has been declined.`,
        referenceId: request._id,
        referenceModel: 'LeaveRequest',
      });
    }

    res.json({ success: true, message: 'Leave request rejected', request });
  } catch (err) {
    console.error('POST /leaves/:id/reject Error:', err.message);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
});

module.exports = router;
