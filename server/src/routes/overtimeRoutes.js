const express = require('express');
const OvertimeRequest = require('../models/OvertimeRequest');
const EmployeeProfile = require('../models/EmployeeProfile');
const { notifyHRAdmins, createAndSendNotification } = require('../services/wsService');

const router = express.Router();

/**
 * GET /api/overtime
 * List overtime requests — employees see their own, HR/Admin sees all
 */
router.get('/', async (req, res) => {
  try {
    const filter = { tenantId: req.tenantId };

    // Regular employees only see their own OT requests
    if (!req.user.permissions?.includes('manage_leaves') && !req.user.permissions?.includes('*')) {
      const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
      if (!emp) return res.json([]);
      filter.employeeId = emp._id;
    }

    const requests = await OvertimeRequest.find(filter)
      .populate('employeeId', 'firstName lastName department position')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error('GET /overtime Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch overtime requests' });
  }
});

/**
 * POST /api/overtime
 * Employee: Submit an overtime request (must be approved by HR)
 */
router.post('/', async (req, res) => {
  try {
    const { date, startTime, endTime, hoursRequested, reason } = req.body;
    const emp = await EmployeeProfile.findOne({ userId: req.user._id }).lean();
    if (!emp) return res.status(404).json({ error: 'Employee profile not found' });

    if (!date || !hoursRequested || !reason) {
      return res.status(400).json({ error: 'Date, hours, and reason are required' });
    }

    const otRequest = await OvertimeRequest.create({
      tenantId: req.tenantId,
      employeeId: emp._id,
      date,
      startTime: startTime || '17:00',
      endTime: endTime || '21:00',
      hoursRequested: Number(hoursRequested),
      reason,
    });

    // Notify HR/Admin
    const empName = `${emp.firstName} ${emp.lastName}`;
    await notifyHRAdmins(req.tenantId, {
      senderId: req.user._id,
      type: 'overtime_request',
      title: 'New Overtime Request',
      message: `${empName} is requesting ${hoursRequested} hours of overtime on ${new Date(date).toLocaleDateString()}. Reason: ${reason}`,
      referenceId: otRequest._id,
      referenceModel: 'OvertimeRequest',
    });

    res.status(201).json(otRequest);
  } catch (err) {
    console.error('POST /overtime Error:', err.message);
    res.status(500).json({ error: 'Failed to submit overtime request' });
  }
});

/**
 * PATCH /api/overtime/:id/status
 * HR/Admin: Approve or reject an overtime request
 */
router.patch('/:id/status', async (req, res) => {
  try {
    if (!req.user.permissions?.includes('manage_leaves') && !req.user.permissions?.includes('*')) {
      return res.status(403).json({ error: 'Only HR/Admin can approve overtime requests' });
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

    const ot = await OvertimeRequest.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('employeeId', 'firstName lastName userId')
      .populate('approvedBy', 'firstName lastName');

    if (!ot) return res.status(404).json({ error: 'Overtime request not found' });

    // Notify the employee about the decision
    const statusLabel = status === 'approved' ? 'Approved' : 'Declined';
    const empProfile = await EmployeeProfile.findById(ot.employeeId._id).lean();
    if (empProfile) {
      await createAndSendNotification({
        tenantId: req.tenantId,
        recipientId: empProfile.userId,
        senderId: req.user._id,
        type: `overtime_${status}`,
        title: `Overtime Request ${statusLabel}`,
        message: `Your overtime request has been ${status}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
        referenceId: ot._id,
        referenceModel: 'OvertimeRequest',
      });
    }

    res.json(ot);
  } catch (err) {
    console.error('PATCH /overtime/:id/status Error:', err.message);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;
