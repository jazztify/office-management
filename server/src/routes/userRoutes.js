const express = require('express');
const User = require('../models/User');
const { hashPassword } = require('../services/authService');

const router = express.Router();

/**
 * GET /api/users
 * Returns all users scoped to the current tenant via global Mongoose filter
 */
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .populate('roles', 'name permissions')
      .lean();
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
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('roles', 'name permissions')
      .lean();

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

    const existing = await User.findOne({ email, tenantId: req.tenantId });
    if (existing) {
      return res.status(409).json({ error: 'User already exists in this workspace' });
    }

    const passwordHash = hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      tenantId: req.tenantId,
      roles: roleIds || [],
    });

    res.status(201).json({
      _id: user._id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    });
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
    const allowedUpdates = ['roles', 'isActive'];
    const updates = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-passwordHash')
      .populate('roles', 'name permissions');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the generic current token
    const currentHash = hashPassword(currentPassword);
    if (user.passwordHash !== currentHash) {
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
