const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OverrideLog = sequelize.define('OverrideLog', {
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
  attendanceLogId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'AttendanceLogs',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: '_id',
    },
  },
  fieldName: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., 'clockIn', 'clockOut', 'status'
  },
  oldValue: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  newValue: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = OverrideLog;
