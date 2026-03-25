const { verifyToken } = require('../services/authService');
const { User, Role } = require('../models');

/**
 * JWT Authentication Middleware
 */
const jwtAuthMiddleware = async (req, res, next) => {
  try {
    // Mode 1: JWT Bearer token (production)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded) {
        console.log('[JWT] Token verification failed');
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      console.log(`[JWT] Decoded user: ${decoded.email} (ID: ${decoded.userId}) for Tenant context: ${req.headers['x-tenant-id']}`);

      const user = await User.findByPk(decoded.userId, {
        include: [{
          model: Role,
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Account deactivated' });
      }

      // Compute flat permissions array from populated roles
      const userPermissions = new Set(
        (user.Roles || []).flatMap(role => role.permissions || [])
      );
      user.permissions = Array.from(userPermissions);

      req.user = user;
      return next();
    }

    // Mode 2: x-user-id header fallback (test/development)
    const userId = req.headers['x-user-id'];
    if (userId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
      if (!isUUID) {
         return res.status(403).json({ error: 'Unauthorized: Invalid user ID format' });
      }

      const user = await User.findByPk(userId, {
        include: [{
          model: Role,
          through: { attributes: [] }
        }]
      });

      if (!user) {
        console.log(`jwtAuth: User not found for test ID ${userId}`);
        return res.status(403).json({ error: 'Unauthorized: User not found' });
      }

      const userPermissions = new Set(
        (user.Roles || []).flatMap(role => role.permissions || [])
      );
      user.permissions = Array.from(userPermissions);

      req.user = user;
      return next();
    }

    // No auth provided at all
    return res.status(401).json({ error: 'Authentication required' });

  } catch (err) {
    console.error('jwtAuth error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { jwtAuthMiddleware };
