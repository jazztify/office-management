const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
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
  recipientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: '_id',
    },
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: '_id',
    },
  },
  type: {
    type: DataTypes.ENUM(
      'leave_request', 'leave_approved', 'leave_rejected',
      'overtime_request', 'overtime_approved', 'overtime_rejected',
      'early_out_request', 'early_out_approved', 'early_out_rejected',
      'half_day_request', 'half_day_approved', 'half_day_rejected',
      'general'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  referenceModel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['recipientId', 'isRead', 'createdAt']
    }
  ]
});

module.exports = Notification;
