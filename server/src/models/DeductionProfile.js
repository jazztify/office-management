const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * DeductionProfile Model
 * Stores recurring, fixed deductions for an employee (Tax, SSS, etc.)
 */
const DeductionProfile = sequelize.define('DeductionProfile', {
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
    unique: true, // One profile per employee
    references: {
      model: 'EmployeeProfiles',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  // Fixed Recurring Deductions
  monthlyTax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  sssEmployee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  philhealthEmployee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  pagibigEmployee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 100, // Standard minimum
  },
  insuranceContribution: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  otherFixedDeductions: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    defaultValue: 'ACTIVE',
  },
}, {
  timestamps: true,
});

module.exports = DeductionProfile;
