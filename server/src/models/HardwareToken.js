const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const HardwareToken = sequelize.define('HardwareToken', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tenants',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  tokenValue: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // e.g., RFID UID or NFC Serial
  },
  type: {
    type: DataTypes.ENUM('RFID', 'NFC', 'BIOMETRIC', 'OTHER'),
    defaultValue: 'RFID',
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'LOST', 'REVOKED', 'EXPIRED'),
    defaultValue: 'ACTIVE',
  },
  issuedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  deactivatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['tokenValue', 'tenantId']
    }
  ]
});

module.exports = HardwareToken;
