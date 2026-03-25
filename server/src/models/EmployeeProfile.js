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
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Departments',
      key: '_id',
    },
  },
  positionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Positions',
      key: '_id',
    },
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
    allowNull: true,
  },
  staffType: {
    type: DataTypes.ENUM('COACH', 'STAFF', 'ADMIN', 'MANAGEMENT'),
    defaultValue: 'STAFF',
  },
    commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.70,
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  employmentStatus: {
    type: DataTypes.ENUM('training', 'probationary', 'regular', 'contractual', 'on_leave'),
    defaultValue: 'training',
  },
  offboardingStatus: {
    type: DataTypes.ENUM('none', 'resigned', 'terminated', 'retired', 'contract_ended'),
    defaultValue: 'none',
  },
  onboardingStatus: {
    type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED'),
    defaultValue: 'IN_PROGRESS',
  },
  documentLinks: {
    type: DataTypes.JSONB,
    defaultValue: [], // Array of { name, url, type, uploadedAt }
  },
  emergencyContact: {
    type: DataTypes.JSONB,
    allowNull: true, // { name, relationship, phone }
  },
  leaveCredits: {
    type: DataTypes.JSONB,
    defaultValue: {
      vacation: 14,
      sick: 7,
      bereavement: 3,
    },
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Roles',
      key: '_id',
    },
    onDelete: 'SET NULL',
  },
}, {
  timestamps: true,
  hooks: {
    beforeSave: (employee) => {
      // Auto-compute status based on hireDate only if it's currently a tenure-based status
      const tenureStatuses = ['training', 'probationary', 'regular'];
      if (employee.hireDate && (tenureStatuses.includes(employee.employmentStatus) || !employee.employmentStatus)) {
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
