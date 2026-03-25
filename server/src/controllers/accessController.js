const { AccessLog, User, MembershipTier, Booking } = require('../models');
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
