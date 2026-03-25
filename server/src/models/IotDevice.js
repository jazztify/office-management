const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const IotDevice = sequelize.define('IotDevice', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('TURNSTILE', 'LOCK', 'GATE', 'READER'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ONLINE', 'OFFLINE', 'LOCKED'),
    defaultValue: 'ONLINE',
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  macAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = IotDevice;
