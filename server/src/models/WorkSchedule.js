const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * WorkSchedule links an Employee to a Shift Template for a specific date.
 * This allows for daily roster building and clock-in validation.
 */
const WorkSchedule = sequelize.define('WorkSchedule', {
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
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'EmployeeProfiles',
      key: '_id',
    },
  },
  shiftId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Shifts',
      key: '_id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('SCHEDULED', 'CANCELLED', 'SWAPPED', 'COMPLETED'),
    defaultValue: 'SCHEDULED',
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['employeeId', 'date', 'tenantId']
    }
  ]
});

module.exports = WorkSchedule;
