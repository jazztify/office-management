const { Op } = require('sequelize');
const { Tenant } = require('../models');
const { tenantContext } = require('./context');

const extractTenant = async (req, res, next) => {
  try {
    let tenantIdentifier = req.headers['x-tenant-id'];
    
    // Fallback to subdomain extraction if header is absent
    if (!tenantIdentifier && req.headers.host) {
      const hostParts = req.headers.host.split('.');
      if (hostParts.length > 2 && hostParts[0] !== 'www' && hostParts[0] !== 'api') {
        tenantIdentifier = hostParts[0];
      }
    }

    // Special logic for Super Admin to bypass tenant check (from Phase 5)
    if (req.user && req.user.isSuperAdmin) {
      return next(); // bypass tenant context run
    }

    if (!tenantIdentifier && !req.user) {
      return res.status(400).json({ error: 'Tenant context missing from request' });
    }
    
    if (!tenantIdentifier && req.user && req.user.tenantId) {
       tenantIdentifier = req.user.tenantId; // fallback for backend testing via agent
    }

    // Resolve tenant from database
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantIdentifier);
    
    const tenant = await Tenant.findOne({ 
      where: {
        [Op.or]: [
          { subdomain: tenantIdentifier },
          isUUID ? { _id: tenantIdentifier } : null
        ].filter(Boolean)
      }
    });

    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ error: 'Tenant is inactive or does not exist' });
    }

    // Wrap the entire request execution in the AsyncLocalStorage context
    tenantContext.run(tenant._id.toString(), () => {
      req.tenantId = tenant._id;
      next(); // All subsequent asynchronous operations share this context
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { extractTenant, tenantContext };
