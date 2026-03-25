const { MembershipTier, User } = require('../models');

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

exports.assignMembership = async (req, res) => {
  try {
    const { userId, tierId, rfidCardNumber, expiresAt } = req.body;
    
    const user = await User.findOne({
      where: { _id: userId, tenantId: req.tenantId }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tier = await MembershipTier.findOne({
      where: { _id: tierId, tenantId: req.tenantId }
    });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });

    await user.update({
      membershipTierId: tierId,
      rfidCardNumber: rfidCardNumber || user.rfidCardNumber,
      membershipExpiresAt: expiresAt || new Date(Date.now() + tier.durationDays * 24 * 60 * 60 * 1000)
    });

    res.json({ message: 'Membership assigned successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
