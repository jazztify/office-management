const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tierName: {
    type: DataTypes.ENUM('free', 'pro', 'enterprise'),
    allowNull: false,
    unique: true,
  },
  monthlyPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  activeModules: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = SubscriptionPlan;
