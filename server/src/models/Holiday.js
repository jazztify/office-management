const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Holiday = sequelize.define('Holiday', {
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
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('regular', 'special_non_working', 'company', 'optional'),
    defaultValue: 'regular',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isPaidUnworked: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  rateMultiplier: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 2.0,
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['date', 'tenantId', 'name']
    }
  ]
});

module.exports = Holiday;
