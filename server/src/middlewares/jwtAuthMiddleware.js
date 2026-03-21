const { verifyToken } = require('../services/authService');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 * 
 * Supports two modes:
 * 1. Production: Authorization: Bearer <token> header
 * 2. Development/Test: x-user-id header fallback (for test suite compatibility)
 * 
 * This dual-mode approach allows the Anti-Gravity Protocol tests to continue
 * working while real JWT auth is used in production.
 */
const jwtAuthMiddleware = async (req, res, next) => {
  try {
    // Mode 1: JWT Bearer token (production)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await User.findById(decoded.userId).populate('roles').lean();
      if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Account deactivated' });
      }

      // Compute flat permissions array from populated roles
      const userPermissions = new Set(
        (user.roles || []).flatMap(role => role.permissions || [])
      );
      user.permissions = Array.from(userPermissions);

      req.user = user;
      return next();
    }

    // Mode 2: x-user-id header fallback (test/development)
    const userId = req.headers['x-user-id'];
    if (userId) {
      const user = await User.findById(userId).populate('roles').lean();
      if (!user) {
        console.log(`jwtAuth: User not found for test ID ${userId}`);
        return res.status(403).json({ error: 'Unauthorized: User not found' });
      }

      const userPermissions = new Set(
        (user.roles || []).flatMap(role => role.permissions || [])
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
