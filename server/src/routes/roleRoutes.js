const express = require('express');
const { Role } = require('../models');

const router = express.Router();

/**
 * GET /api/roles
 * List all roles in the current tenant
 */
router.get('/', async (req, res) => {
  try {
    const roles = await Role.findAll({ where: { tenantId: req.tenantId } });
    res.json(roles);
  } catch (err) {
    console.error('GET /roles Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * POST /api/roles
 * Create a new dynamic role for the tenant
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, permissions, isSystemDefault, color } = req.body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'name and permissions array are required' });
    }

    const existing = await Role.findOne({ where: { name, tenantId: req.tenantId } });
    if (existing) {
      return res.status(409).json({ error: `Role '${name}' already exists in this workspace` });
    }

    const role = await Role.create({
      tenantId: req.tenantId,
      name,
      description,
      permissions,
      color: color || '#4f46e5',
      isSystemDefault: isSystemDefault || false,
    });

    res.status(201).json(role);
  } catch (err) {
    console.error('POST /roles Error:', err.message);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PATCH /api/roles/:id
 * Update role permissions or description
 */
router.patch('/:id', async (req, res) => {
  try {
    const role = await Role.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystemDefault) {
      return res.status(403).json({ error: 'System default roles cannot be modified' });
    }

    const allowedUpdates = ['name', 'description', 'permissions', 'color'];
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        role[key] = req.body[key];
      }
    }

    await role.save();
    res.json(role);
  } catch (err) {
    console.error('PATCH /roles/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/roles/:id
 * Delete a non-system role
 */
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystemDefault) {
      return res.status(403).json({ error: 'System default roles cannot be deleted' });
    }

    await Role.destroy({ where: { _id: role._id, tenantId: req.tenantId } });
    res.json({ message: `Role '${role.name}' deleted successfully` });
  } catch (err) {
    console.error('DELETE /roles/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

module.exports = router;
