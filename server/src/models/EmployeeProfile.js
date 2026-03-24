const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EmployeeProfile = sequelize.define('EmployeeProfile', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: '_id',
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salary: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'EmployeeProfiles',
      key: '_id',
    },
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  hireDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  employmentStatus: {
    type: DataTypes.ENUM('training', 'probationary', 'regular'),
    defaultValue: 'training',
  },
  leaveCredits: {
    type: DataTypes.JSONB,
    defaultValue: {
      vacation: 14,
      sick: 7,
      bereavement: 3,
    },
  },
}, {
  timestamps: true,
  hooks: {
    beforeSave: (employee) => {
      if (employee.hireDate) {
        const now = new Date();
        const hire = new Date(employee.hireDate);
        const diffMs = now - hire;
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);

        if (diffMonths < 1) {
          employee.employmentStatus = 'training';
        } else if (diffMonths < 6) {
          employee.employmentStatus = 'probationary';
        } else {
          employee.employmentStatus = 'regular';
        }
      }
    },
  },
});

module.exports = EmployeeProfile;
