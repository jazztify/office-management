const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      console.log('authMiddleware: Missing x-user-id header');
      return res.status(403).json({ error: 'Unauthorized: Missing user header' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`authMiddleware: User not found for ID ${userId}`);
      return res.status(403).json({ error: 'Unauthorized: User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If user is SUPER_ADMIN with '*' permission, they bypass role checks
    if (req.user.permissions && req.user.permissions.includes('*')) {
      return next();
    }

    const userRoles = (req.user.Roles || []).map(r => r.name);
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }

    next();
  };
};

module.exports = { authMiddleware, authorize };
