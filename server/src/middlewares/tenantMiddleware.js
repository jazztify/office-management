const Tenant = require('../models/Tenant');
const { tenantContext } = require('./tenantResolver'); // Need this to keep mongooseTenantFilter working!

const tenantMiddleware = async (req, res, next) => {
  try {
    let tenantId = req.headers['x-tenant-id'];
    
    // In our tests, x-tenant-id might be passed as a subdomain, so we fallback
    if (!tenantId) {
      console.log('tenantMiddleware: Missing x-tenant-id header');
      return res.status(403).json({ error: 'Forbidden: Missing tenant header' });
    }

    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(tenantId) && (String(tenantId).length === 24 || String(tenantId).length === 12);
    
    const query = isObjectId ? { _id: tenantId } : { subdomain: tenantId };
    
    const tenant = await Tenant.findOne(query).lean();

    if (!tenant) {
      console.log(`tenantMiddleware: Tenant not found for identifier ${tenantId}`);
      return res.status(403).json({ error: 'Forbidden: Invalid tenant' });
    }

    req.tenantId = tenant._id;
    
    // Use the existing tenantContext to satisfy the mongoose plugin
    tenantContext.run(tenant._id.toString(), () => {
      next();
    });
  } catch (err) {
    console.error('tenantMiddleware error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { tenantMiddleware };
