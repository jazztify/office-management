const { Tenant } = require('../models');
const { tenantContext } = require('./context');

const tenantMiddleware = async (req, res, next) => {
  try {
    let tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      console.log('[TenantMiddleware] ERROR: Missing x-tenant-id header');
      return res.status(403).json({ error: 'Forbidden: Missing tenant header' });
    }

    // Check if tenantId is a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId);
    const query = isUUID ? { _id: tenantId } : { subdomain: tenantId };
    
    console.log(`[TenantMiddleware] Looking for tenant with ${isUUID ? 'ID' : 'subdomain'}: ${tenantId}`);
    const tenant = await Tenant.findOne({ where: query });

    if (!tenant) {
      console.log(`[TenantMiddleware] ERROR: Tenant not found for identifier "${tenantId}"`);
      return res.status(403).json({ error: 'Forbidden: Invalid tenant' });
    }

    console.log(`[TenantMiddleware] SUCCESS: Resolved tenant "${tenant.name}" (${tenant._id})`);

    req.tenantId = tenant._id;

    tenantContext.run(tenant._id.toString(), () => {
      next();
    });
  } catch (err) {
    console.error('tenantMiddleware error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

module.exports = { tenantMiddleware };
