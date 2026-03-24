const express = require('express');
const { Notification } = require('../models');

const router = express.Router();

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly } = req.query;
    const filter = { recipientId: req.user._id };

    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where: filter,
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    const unreadCount = await Notification.count({
      where: {
        recipientId: req.user._id,
        isRead: false,
      }
    });

    res.json({ notifications: rows, unreadCount, total: count });
  } catch (err) {
    console.error('GET /notifications Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: { _id: req.params.id, recipientId: req.user._id } }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = await Notification.findByPk(req.params.id);
    res.json(notification);
  } catch (err) {
    console.error('PATCH /notifications/:id/read Error:', err.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { recipientId: req.user._id, isRead: false } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/read-all Error:', err.message);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

module.exports = router;
