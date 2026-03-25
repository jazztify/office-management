const express = require('express');
const { Wallet, Transaction, User, sequelize } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * GET /api/wallets/me
 * Get current user's wallet
 */
router.get('/me', async (req, res) => {
  try {
    const [wallet] = await Wallet.findOrCreate({
      where: { userId: req.user._id, tenantId: req.tenantId },
      defaults: {
        userId: req.user._id,
        tenantId: req.tenantId,
        balance: 0
      }
    });

    res.json(wallet);
  } catch (err) {
    console.error('GET /wallets/me Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * GET /api/wallets/:userId
 * Admin: Get a specific user's wallet
 */
router.get('/:userId', checkPermission('manage_wallets'), async (req, res) => {
  try {
    const [wallet] = await Wallet.findOrCreate({
      where: { userId: req.params.userId, tenantId: req.tenantId },
      defaults: {
        userId: req.params.userId,
        tenantId: req.tenantId,
        balance: 0
      }
    });

    res.json(wallet);
  } catch (err) {
    console.error('GET /wallets/:userId Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * POST /api/wallets/fund
 * Admin: Add funds to a user's wallet
 */
router.post('/fund', checkPermission('manage_wallets'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'userId and positive amount are required' });
    }

    const [wallet] = await Wallet.findOrCreate({
      where: { userId, tenantId: req.tenantId },
      defaults: { userId, tenantId: req.tenantId, balance: 0 },
      transaction: t
    });

    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    await wallet.update({ balance: newBalance }, { transaction: t });

    await Transaction.create({
      tenantId: req.tenantId,
      walletId: wallet._id,
      type: 'DEPOSIT',
      amount: amount,
      description: description || 'Manual deposit by admin',
      processedBy: req.user._id,
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Funds added successfully', balance: newBalance });
  } catch (err) {
    await t.rollback();
    console.error('POST /wallets/fund Error:', err.message);
    res.status(500).json({ error: 'Failed to add funds' });
  }
});

module.exports = router;
