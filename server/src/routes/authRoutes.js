const express = require('express');
const { Tenant } = require('../models');
const { loginUser } = require('../services/authService');

const router = express.Router();

/**
 * POST /api/auth/login
 * Public - Authenticates user within a tenant context
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tenantIdentifier = req.headers['x-tenant-id'];

    if (!tenantIdentifier) {
      return res.status(400).json({ error: 'x-tenant-id header is required' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Resolve tenant
    // Check if tenantIdentifier is a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantIdentifier);
    const normalizedIdentifier = isUUID ? tenantIdentifier : tenantIdentifier.toLowerCase();
    const query = isUUID ? { _id: normalizedIdentifier } : { subdomain: normalizedIdentifier };
    
    const tenant = await Tenant.findOne({ where: query });

    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ error: 'Tenant not found or inactive' });
    }

    const result = await loginUser(email, password, tenant._id);

    res.json({
      success: true,
      token: result.token,
      user: result.user,
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        activeModules: tenant.activeModules,
        subscriptionTier: tenant.subscriptionTier,
        logoUrl: tenant.logoUrl,
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
