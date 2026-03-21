const Tenant = require('../models/Tenant');

const requireModule = (moduleName) => {
  return async (req, res, next) => {
    try {
      // req.tenantId is securely injected by the initial tenantResolver middleware
      // We project only the activeModules field for performance optimization
      const tenant = await Tenant.findById(req.tenantId).select('activeModules').lean();

      if (!tenant || !tenant.activeModules || !tenant.activeModules.includes(moduleName)) {
        return res.status(402).json({ 
          error: 'Payment Required', 
          message: `Entitlement Failure: The module '${moduleName}' is not licensed for this workspace.` 
        });
      }

      next(); // Tenant is entitled, proceed to the controller
    } catch (error) {
      console.error(`Entitlement Check Error [${moduleName}]:`, error);
      res.status(500).json({ error: 'Internal Server Error validating entitlements' });
    }
  };
};

module.exports = { requireModule };
