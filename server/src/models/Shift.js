const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Shift = sequelize.define('Shift', {
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
  startTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lunchStart: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lunchEnd: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  workDays: {
    type: DataTypes.JSONB, // Array of numbers [0,1,2,3,4,5,6]
    defaultValue: [],
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Shift;
