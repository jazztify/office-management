const express = require('express');
const { Product, Wallet, Transaction, Order, sequelize } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * POST /api/pos/checkout
 * Process a POS transaction
 */
router.post('/checkout', checkPermission('process_pos'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, items } = req.body; // items: [{ productId, quantity }]

    if (!userId || !items || !items.length) {
      return res.status(400).json({ error: 'userId and items are required' });
    }

    // 1. Get User's Wallet
    const wallet = await Wallet.findOne({
      where: { userId, tenantId: req.tenantId },
      transaction: t
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this user' });
    }

    if (wallet.status !== 'active') {
      return res.status(403).json({ error: 'Wallet is frozen' });
    }

    // 2. Fetch products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: { _id: item.productId, tenantId: req.tenantId },
        transaction: t
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.stockLevel < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });

      // Update stock Level
      await product.update({
        stockLevel: product.stockLevel - item.quantity
      }, { transaction: t });
    }

    // 3. Check Balance
    if (parseFloat(wallet.balance) < totalAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // 4. Update Wallet Balance
    const newBalance = parseFloat(wallet.balance) - totalAmount;
    await wallet.update({ balance: newBalance }, { transaction: t });

    // 5. Create Order record
    const order = await Order.create({
      tenantId: req.tenantId,
      walletId: wallet._id,
      totalAmount,
      items: orderItems,
      processedBy: req.user._id,
      status: 'completed'
    }, { transaction: t });

    // 6. Create Transaction record
    await Transaction.create({
      tenantId: req.tenantId,
      walletId: wallet._id,
      type: 'PURCHASE',
      amount: -totalAmount,
      referenceId: order._id,
      description: `POS purchase: ${orderItems.map(i => i.name).join(', ')}`,
      processedBy: req.user._id,
    }, { transaction: t });

    await t.commit();
    res.json({
      message: 'Checkout successful',
      orderId: order._id,
      totalAmount,
      newBalance
    });

  } catch (err) {
    await t.rollback();
    console.error('POST /pos/checkout Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process checkout' });
  }
});

/**
 * GET /api/pos/transactions
 * Admin: List all transactions for the tenant
 */
router.get('/transactions', checkPermission('view_ledger'), async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { tenantId: req.tenantId },
      include: [
        { 
          model: Wallet, 
          include: [{ model: User, attributes: ['email'] }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(transactions);
  } catch (err) {
    console.error('GET /pos/transactions Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
