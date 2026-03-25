const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Wallet = sequelize.define('Wallet', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: '_id',
      onDelete: 'CASCADE',
    },
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'PHP',
  },
  status: {
    type: DataTypes.ENUM('active', 'frozen'),
    defaultValue: 'active',
  },
}, {
  timestamps: true,
});

module.exports = Wallet;
