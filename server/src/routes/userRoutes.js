const express = require('express');
const { User, Role } = require('../models');
const { hashPassword } = require('../services/authService');

const router = express.Router();

/**
 * GET /api/users
 * Returns all users scoped to the current tenant
 */
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      where: { tenantId: req.tenantId },
      attributes: { exclude: ['passwordHash'] },
      include: [{
        model: Role,
        attributes: ['name', 'permissions'],
        through: { attributes: [] }
      }]
    });
    res.json(users);
  } catch (err) {
    console.error('GET /users Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Returns a single user by ID (tenant-scoped)
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { _id: req.params.id, tenantId: req.tenantId },
      attributes: { exclude: ['passwordHash'] },
      include: [{
        model: Role,
        attributes: ['name', 'permissions'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('GET /users/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Admin-only: Create a new user within the current tenant workspace
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, roles: roleIds } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await User.findOne({ where: { email, tenantId: req.tenantId } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists in this workspace' });
    }

    const passwordHash = hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      tenantId: req.tenantId,
    });

    if (roleIds && roleIds.length > 0) {
      await user.setRoles(roleIds);
    }

    // Re-fetch with roles to return
    const createdUser = await User.findByPk(user._id, {
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Role, through: { attributes: [] } }]
    });

    res.status(201).json(createdUser);
  } catch (err) {
    console.error('POST /users Error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PATCH /api/users/:id
 * Update user roles or active status
 */
router.patch('/:id', async (req, res) => {
  try {
    const { roles: roleIds, isActive } = req.body;
    
    const user = await User.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    if (roleIds !== undefined) {
      await user.setRoles(roleIds);
    }

    // Re-fetch with roles
    const updatedUser = await User.findByPk(user._id, {
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Role, through: { attributes: [] } }]
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('PATCH /users/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Soft-delete (deactivate) a user
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated', user });
  } catch (err) {
    console.error('DELETE /users/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

/**
 * POST /api/users/change-password
 * Allows the currently logged-in user to change their own password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findByPk(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash with the same salt?authService.verifyPassword handles salt correctly.
    const isMatch = require('../services/authService').verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // Set new password
    user.passwordHash = hashPassword(newPassword);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('POST /users/change-password Error:', err.message);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
