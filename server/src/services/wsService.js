const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Role = require('../models/Role');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Map of userId -> Set of WebSocket connections
const userConnections = new Map();

let wss = null;

/**
 * Initialize the WebSocket server on the same HTTP server
 */
function initWebSocket(httpServer) {
  wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    // Parse token from query string: ws://host/ws?token=xxx
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;

      // Store connection
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(ws);

      ws.userId = userId;

      // Send unread count on connect
      const unreadCount = await Notification.countDocuments({
        recipientId: userId,
        isRead: false,
      });
      ws.send(JSON.stringify({ type: 'unread_count', count: unreadCount }));

      ws.on('close', () => {
        const conn = userConnections.get(userId);
        if (conn) {
          conn.delete(ws);
          if (conn.size === 0) userConnections.delete(userId);
        }
      });

      ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
      });

    } catch (err) {
      ws.close(4001, 'Invalid token');
    }
  });

  console.log('[WS] WebSocket server initialized on /ws');
}

/**
 * Send a notification to a specific user via WebSocket
 */
function sendToUser(userId, data) {
  const userIdStr = userId.toString();
  const connections = userConnections.get(userIdStr);
  if (connections) {
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * Create a notification in DB and push via WebSocket
 */
async function createAndSendNotification({
  tenantId, recipientId, senderId, type, title, message,
  referenceId, referenceModel,
}) {
  try {
    const notification = await Notification.create({
      tenantId,
      recipientId,
      senderId,
      type,
      title,
      message,
      referenceId,
      referenceModel,
    });

    // Send via WebSocket
    sendToUser(recipientId, {
      type: 'new_notification',
      notification: notification.toObject(),
    });

    return notification;
  } catch (err) {
    console.error('[WS] Failed to create notification:', err.message);
  }
}

/**
 * Notify all HR/Admin users in a tenant
 */
async function notifyHRAdmins(tenantId, { senderId, type, title, message, referenceId, referenceModel }) {
  try {
    // Find roles with manage_leaves or * permission (HR/Admin)
    const hrRoles = await Role.find({
      tenantId,
      $or: [
        { permissions: 'manage_leaves' },
        { permissions: '*' },
      ],
    }).lean();

    const roleIds = hrRoles.map(r => r._id);

    // Find users with those roles
    const hrUsers = await User.find({
      tenantId,
      roles: { $in: roleIds },
      _id: { $ne: senderId }, // Don't notify the sender
    }).lean();

    for (const hrUser of hrUsers) {
      await createAndSendNotification({
        tenantId,
        recipientId: hrUser._id,
        senderId,
        type,
        title,
        message,
        referenceId,
        referenceModel,
      });
    }
  } catch (err) {
    console.error('[WS] Failed to notify HR/Admins:', err.message);
  }
}

module.exports = {
  initWebSocket,
  sendToUser,
  createAndSendNotification,
  notifyHRAdmins,
};
