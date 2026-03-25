const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tenants',
      key: '_id',
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  membershipTierId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'MembershipTiers',
      key: '_id',
    },
  },
  membershipExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  membershipStatus: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'EXPIRED', 'PASTDUE', 'SUSPENDED'),
    defaultValue: 'INACTIVE',
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email', 'tenantId']
    }
  ]
});

module.exports = User;
