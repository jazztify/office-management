const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AccessLog = sequelize.define('AccessLog', {
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
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true, // Optional: if tracking entry to a specific court
    references: {
      model: 'Resources',
      key: '_id',
    },
  },
  direction: {
    type: DataTypes.ENUM('IN', 'OUT'),
    defaultValue: 'IN',
  },
  status: {
    type: DataTypes.ENUM('GRANTED', 'DENIED'),
    allowNull: false,
  },
  denialReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deviceIdentifier: {
    type: DataTypes.STRING, // RFID tag or Device ID
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = AccessLog;
