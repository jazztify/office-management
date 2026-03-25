const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CommissionLedger = sequelize.define('CommissionLedger', {
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
  transactionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Transactions',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  coachId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'EmployeeProfiles',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  serviceType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  coachShare: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  clubShare: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID'),
    defaultValue: 'PENDING',
  },
}, {
  timestamps: true,
});

module.exports = CommissionLedger;
