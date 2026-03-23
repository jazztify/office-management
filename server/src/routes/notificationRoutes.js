const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * GET /api/notifications
 * Get current user's notifications (latest 50, sorted by date)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly } = req.query;
    const filter = { recipientId: req.user._id };

    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false,
    });

    res.json({ notifications, unreadCount, total });
  } catch (err) {
    console.error('GET /notifications Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    console.error('PATCH /notifications/:id/read Error:', err.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/read-all Error:', err.message);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

module.exports = router;
