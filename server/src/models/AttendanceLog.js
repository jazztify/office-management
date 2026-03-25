const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AttendanceLog = sequelize.define('AttendanceLog', {
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
  date: {
    type: DataTypes.STRING, // YYYY-MM-DD
    allowNull: false,
  },
  clockIn: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lunchOut: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lunchIn: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  clockOut: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalWorkHours: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  lunchBreakMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lateMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  undertimeMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  overtimeMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('incomplete', 'complete', 'absent', 'half_day', 'on_leave'),
    defaultValue: 'incomplete',
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['employeeId', 'date']
    },
    {
      fields: ['tenantId', 'date']
    }
  ]
});

module.exports = AttendanceLog;
