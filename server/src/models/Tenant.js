const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Tenant = sequelize.define('Tenant', {
  _id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subdomain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  customDomain: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'churned'),
    defaultValue: 'active',
  },
  activeModules: {
    type: DataTypes.JSONB, // Array of strings stored as JSONB
    defaultValue: [],
  },
  customPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  },
  subscriptionTier: {
    type: DataTypes.ENUM('free', 'pro', 'enterprise', 'custom'),
    defaultValue: 'free',
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      officeHours: {
        start: '08:00',
        end: '17:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
      },
      deductions: {
        latePerMinute: 5,
        undertimePerMinute: 5,
        absencePerDay: 500,
        halfDayDeduction: 250,
        lunchOvertime: 0,
        maxLunchMinutes: 60,
      },
      overtime: {
        requiresApproval: true,
        rateMultiplier: 1.25,
        restDayMultiplier: 1.3,
        holidayMultiplier: 2.0,
        maxHoursPerDay: 4,
      },
      gracePeriod: 15,
    },
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['subdomain']
    }
  ]
});

module.exports = Tenant;
