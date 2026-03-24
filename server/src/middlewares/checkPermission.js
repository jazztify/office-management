const { User, Role } = require('../models');

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        console.log("RBAC Error: Missing req.user");
        return res.status(403).json({ message: "Forbidden: No user context" });
      }

      const userId = req.user._id;

      // Use the user already in req.user if roles are populated
      let user = req.user;
      
      // If Roles are not populated, or if we want a fresh check
      if (!user.Roles) {
        user = await User.findByPk(userId, {
          include: [{
            model: Role,
            through: { attributes: [] }
          }]
        });
      }

      if (!user) {
        console.log("RBAC Error: Missing user from DB");
        return res.status(403).json({ message: "Forbidden: User not found" });
      }

      // If user has no roles or empty roles array, reject unless permissions are global
      if (!user.Roles || user.Roles.length === 0) {
        return res.status(403).json({ message: "Forbidden: No roles assigned" });
      }

      // Flatten the permissions from all assigned roles into a single Set for O(1) lookup
      const userPermissions = new Set(
        user.Roles.flatMap(role => role.permissions || [])
      );

      req.user.permissions = Array.from(userPermissions);

      // Validate against the required permission or a global wildcard override
      if (!req.user.permissions.includes(requiredPermission) && !req.user.permissions.includes('*')) {
        console.log(`RBAC Error: Insufficient privileges. Requires '${requiredPermission}'`);
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error("RBAC Middleware Error:", error);
      res.status(500).json({ message: "Internal Server Error during authorization sequence." });
    }
  };
};

module.exports = { checkPermission };
