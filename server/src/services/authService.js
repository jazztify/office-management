const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Role } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Generate a JWT token containing user identity and tenant context
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify and decode a JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Hash a password using Node.js native crypto (no bcrypt dependency needed)
 * Uses PBKDF2 with 100,000 iterations and SHA-512
 */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

/**
 * Verify a password against a stored hash
 */
const verifyPassword = (password, storedHash) => {
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === testHash;
};

/**
 * Login service: validates credentials & returns JWT
 */
const loginUser = async (email, password, tenantId) => {
  const user = await User.findOne({ 
    where: { email, tenantId },
    include: [{
      model: Role,
      attributes: ['permissions', 'name'],
      through: { attributes: [] } // Exclude join table attributes
    }]
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const isMatch = verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user);

  // Flatten permissions for frontend consumption
  const permissions = user.Roles
    ? [...new Set(user.Roles.flatMap(role => role.permissions || []))]
    : [];

  return {
    token,
    user: {
      _id: user._id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.Roles.map(r => ({ name: r.name, permissions: r.permissions })),
      permissions,
    },
  };
};

/**
 * Register a new user within a tenant
 */
const registerUser = async ({ email, password, tenantId, roleIds = [] }) => {
  const existing = await User.findOne({ where: { email, tenantId } });
  if (existing) {
    throw new Error('A user with this email already exists in this workspace');
  }

  const passwordHash = hashPassword(password);

  const user = await User.create({
    email,
    passwordHash,
    tenantId,
  });

  if (roleIds && roleIds.length > 0) {
    await user.setRoles(roleIds);
  }

  return {
    _id: user._id,
    email: user.email,
    tenantId: user.tenantId,
  };
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  loginUser,
  registerUser,
  JWT_SECRET,
};
