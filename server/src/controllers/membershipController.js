const { MembershipTier, User, HardwareToken } = require('../models');

// CRITICAL: All controllers must be tenant-scoped using req.tenantId

exports.getAllTiers = async (req, res) => {
  try {
    const tiers = await MembershipTier.findAll({
      where: { tenantId: req.tenantId },
      order: [['price', 'ASC']]
    });
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTier = async (req, res) => {
  try {
    const tier = await MembershipTier.create({
      ...req.body,
      tenantId: req.tenantId
    });
    res.status(201).json(tier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTier = async (req, res) => {
  try {
    const tier = await MembershipTier.findOne({
      where: { _id: req.params.id, tenantId: req.tenantId }
    });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });

    await tier.update(req.body);
    res.json(tier);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.registerMember = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    
    // Create User with minimal info (no password by default, could be added later)
    const user = await User.create({
      tenantId: req.tenantId,
      email,
      passwordHash: 'OFFLINE_REGISTRATION_PLACEHOLDER', // Satisfies NOT NULL constraint
      membershipStatus: 'INACTIVE', // Becomes ACTIVE after tier assignment
      isActive: true
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.assignMembership = async (req, res) => {
  try {
    const { userId, tierId, tokenValue, type, expiresAt } = req.body;
    
    const user = await User.findOne({
      where: { _id: userId, tenantId: req.tenantId }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tier = await MembershipTier.findOne({
      where: { _id: tierId, tenantId: req.tenantId }
    });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });

    // 1. Update User Lifecycle
    await user.update({
      membershipTierId: tierId,
      membershipStatus: 'ACTIVE',
      membershipExpiresAt: expiresAt || new Date(Date.now() + tier.durationDays * 24 * 60 * 60 * 1000)
    });

    // 2. Issue Hardware Token if provided
    if (tokenValue) {
      // Deactivate existing ACTIVE tokens for this user if any (optional policy)
      await HardwareToken.update(
        { status: 'REVOKED', deactivatedAt: new Date() },
        { where: { userId, tenantId: req.tenantId, status: 'ACTIVE' } }
      );

      await HardwareToken.create({
        tenantId: req.tenantId,
        userId: user._id,
        tokenValue,
        type: type || 'RFID',
        status: 'ACTIVE'
      });
    }

    res.json({ message: 'Membership assigned successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

