const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Position = sequelize.define('Position', {
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
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Departments',
      key: '_id',
    },
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Roles',
      key: '_id',
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  salaryRangeMin: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  salaryRangeMax: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  parentPositionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Positions',
      key: '_id',
    },
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  }
}, {
  timestamps: true,
});

module.exports = Position;
