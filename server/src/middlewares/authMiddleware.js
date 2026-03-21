const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      console.log('authMiddleware: Missing x-user-id header');
      return res.status(403).json({ error: 'Unauthorized: Missing user header' });
    }

    const user = await User.findById(userId).populate('roles').lean();
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

module.exports = { authMiddleware };
