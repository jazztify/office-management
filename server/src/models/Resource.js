const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Resource = sequelize.define('Resource', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., Court 1, VIP Room, Coach Juan
  },
  type: {
    type: DataTypes.ENUM('COURT', 'ROOM', 'COACH', 'EQUIPMENT', 'OTHER'),
    allowNull: false,
    defaultValue: 'COURT',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = Resource;
