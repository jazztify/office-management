const { AccessLog, User, MembershipTier, Booking, EmployeeProfile, WorkSchedule, AttendanceLog, Shift } = require('../models');
const { Op } = require('sequelize');

/**
 * Access Verification Endpoint (IoT Target)
 * POST /api/access/verify
 * Body: { rfidCardNumber, resourceId (optional) }
 */
exports.verifyAccess = async (req, res) => {
  try {
    const { rfidCardNumber, resourceId } = req.body;

    // 1. Find User by RFID
    const user = await User.findOne({
      where: { 
        tenantId: req.tenantId, 
        rfidCardNumber,
        isActive: true 
      },
      include: [{ model: MembershipTier }]
    });

    if (!user) {
      await AccessLog.create({
        tenantId: req.tenantId,
        userId: null, // Unknown user
        status: 'DENIED',
        denialReason: 'Invalid RFID Card',
        deviceIdentifier: rfidCardNumber
      });
      return res.status(403).json({ access: 'DENIED', reason: 'Invalid Card' });
    }

    // 2. Check Membership Expiry
    if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) < new Date()) {
      await AccessLog.create({
        tenantId: req.tenantId,
        userId: user._id,
        status: 'DENIED',
        denialReason: 'Membership Expired',
        deviceIdentifier: rfidCardNumber
      });
      return res.status(403).json({ access: 'DENIED', reason: 'Membership Expired' });
    }

    // 3. Optional: Check for Active Booking (if entering a specific court)
    if (resourceId) {
      const now = new Date();
      const activeBooking = await Booking.findOne({
        where: {
          resourceId,
          userId: user._id,
          status: 'CONFIRMED',
          startTime: { [Op.lte]: now },
          endTime: { [Op.gte]: now }
        }
      });

      if (!activeBooking) {
        await AccessLog.create({
          tenantId: req.tenantId,
          userId: user._id,
          resourceId,
          status: 'DENIED',
          denialReason: 'No active booking for this resource',
          deviceIdentifier: rfidCardNumber
        });
        return res.status(403).json({ access: 'DENIED', reason: 'No Active Booking' });
      }
    }

    // 4. Grant Access
    await AccessLog.create({
      tenantId: req.tenantId,
      userId: user._id,
      resourceId: resourceId || null,
      status: 'GRANTED',
      deviceIdentifier: rfidCardNumber
    });

    // ─── HR INTEGRATION: Auto-Attendance ───
    const employee = await EmployeeProfile.findOne({ where: { userId: user._id, tenantId: req.tenantId } });
    if (employee) {
      const todayString = new Date().toISOString().split('T')[0];
      const schedule = await WorkSchedule.findOne({
        where: { employeeId: employee._id, date: todayString, tenantId: req.tenantId },
        include: [{ model: Shift }]
      });

      if (schedule) {
        // Find or create attendance log for today
        const [attendance, created] = await AttendanceLog.findOrCreate({
          where: { employeeId: employee._id, date: todayString, tenantId: req.tenantId },
          defaults: { clockIn: new Date() }
        });

        if (!created && attendance.clockIn) {
          // If already clocked in, update clock out (continuous tracking)
          await attendance.update({ clockOut: new Date() });
        } else if (created && schedule.Shift) {
          // Calculate lateness on first clock-in
          const shiftStart = new Date(`${todayString}T${schedule.Shift.startTime}:00`);
          const actualIn = new Date();
          if (actualIn > shiftStart) {
            const diffMs = actualIn - shiftStart;
            const lateMinutes = Math.floor(diffMs / (1000 * 60));
            await attendance.update({ lateMinutes });
          }
        }
      }
    }

    res.json({ 
      access: 'GRANTED', 
      user: { email: user.email, tier: user.MembershipTier?.name } 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAccessLogs = async (req, res) => {
  try {
    const logs = await AccessLog.findAll({
      where: { tenantId: req.tenantId },
      include: [{ model: User, attributes: ['email'] }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
