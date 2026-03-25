const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payslip = sequelize.define('Payslip', {
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
  period: {
    type: DataTypes.JSONB, // { month, year }
    allowNull: false,
  },
  payPeriod: {
    type: DataTypes.ENUM('first_half', 'second_half', 'full_month'),
    defaultValue: 'full_month',
    allowNull: false,
  },
  basicSalary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  allowances: {
    type: DataTypes.JSONB,
    defaultValue: {
      housing: 0,
      transport: 0,
      meal: 0,
      holidayPay: 0,
      thirteenthMonthPay: 0,
      other: 0,
    },
  },
  deductions: {
    type: DataTypes.JSONB,
    defaultValue: {
      tax: 0,
      insurance: 0,
      sss: 0,
      pagibig: 0,
      philhealth: 0,
      holidayDeduction: 0,
      other: 0,
    },
  },
  attendanceSummary: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalWorkHours: 0,
      totalLateHours: 0,
      totalAbsentDays: 0,
    },
  },
  grossPay: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  totalDeductions: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  netPay: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'generated', 'paid'),
    defaultValue: 'generated',
  },
  generatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: '_id',
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['employeeId', 'period', 'payPeriod', 'tenantId'] // period is JSONB, might need expression index in real SQL but here we'll define it simply
    }
  ]
});

module.exports = Payslip;
