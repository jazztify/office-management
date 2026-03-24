const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const Tenant = require('./Tenant');
const User = require('./User');
const Role = require('./Role');
const EmployeeProfile = require('./EmployeeProfile');
const Shift = require('./Shift');
const AttendanceLog = require('./AttendanceLog');
const LeaveRequest = require('./LeaveRequest');
const EarlyOutRequest = require('./EarlyOutRequest');
const OvertimeRequest = require('./OvertimeRequest');
const Holiday = require('./Holiday');
const Notification = require('./Notification');
const Payslip = require('./Payslip');

// --- Associations ---

// Tenant Associations
Tenant.hasMany(User, { foreignKey: 'tenantId' });
User.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Role, { foreignKey: 'tenantId' });
Role.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(EmployeeProfile, { foreignKey: 'tenantId' });
EmployeeProfile.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Shift, { foreignKey: 'tenantId' });
Shift.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(AttendanceLog, { foreignKey: 'tenantId' });
AttendanceLog.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(LeaveRequest, { foreignKey: 'tenantId' });
LeaveRequest.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(EarlyOutRequest, { foreignKey: 'tenantId' });
EarlyOutRequest.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(OvertimeRequest, { foreignKey: 'tenantId' });
OvertimeRequest.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Holiday, { foreignKey: 'tenantId' });
Holiday.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Notification, { foreignKey: 'tenantId' });
Notification.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Payslip, { foreignKey: 'tenantId' });
Payslip.belongsTo(Tenant, { foreignKey: 'tenantId' });

// User & Role (Many-to-Many)
const UserRoles = sequelize.define('UserRoles', {}, { timestamps: false });
User.belongsToMany(Role, { through: UserRoles, foreignKey: 'userId' });
Role.belongsToMany(User, { through: UserRoles, foreignKey: 'roleId' });

// User & EmployeeProfile
User.hasOne(EmployeeProfile, { foreignKey: 'userId' });
EmployeeProfile.belongsTo(User, { foreignKey: 'userId' });

// EmployeeProfile Hierarchy (Self-referential)
EmployeeProfile.belongsTo(EmployeeProfile, { as: 'manager', foreignKey: 'managerId' });
EmployeeProfile.hasMany(EmployeeProfile, { as: 'subordinates', foreignKey: 'managerId' });

// EmployeeProfile & Attendance
EmployeeProfile.hasMany(AttendanceLog, { foreignKey: 'employeeId' });
AttendanceLog.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

// EmployeeProfile & Shifts (Many-to-Many)
const EmployeeShifts = sequelize.define('EmployeeShifts', {}, { timestamps: false });
EmployeeProfile.belongsToMany(Shift, { through: EmployeeShifts, foreignKey: 'employeeId' });
Shift.belongsToMany(EmployeeProfile, { through: EmployeeShifts, foreignKey: 'shiftId' });

// EmployeeProfile & Requests
EmployeeProfile.hasMany(LeaveRequest, { foreignKey: 'employeeId' });
LeaveRequest.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

EmployeeProfile.hasMany(LeaveRequest, { as: 'approvedLeaves', foreignKey: 'approvedBy' });
LeaveRequest.belongsTo(EmployeeProfile, { as: 'approver', foreignKey: 'approvedBy' });

EmployeeProfile.hasMany(EarlyOutRequest, { foreignKey: 'employeeId' });
EarlyOutRequest.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

EmployeeProfile.hasMany(EarlyOutRequest, { as: 'approvedEarlyOuts', foreignKey: 'approvedBy' });
EarlyOutRequest.belongsTo(EmployeeProfile, { as: 'earlyOutApprover', foreignKey: 'approvedBy' });

EmployeeProfile.hasMany(OvertimeRequest, { foreignKey: 'employeeId' });
OvertimeRequest.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

EmployeeProfile.hasMany(OvertimeRequest, { as: 'approvedOvertimes', foreignKey: 'approvedBy' });
OvertimeRequest.belongsTo(EmployeeProfile, { as: 'overtimeApprover', foreignKey: 'approvedBy' });

// EmployeeProfile & Payslips
EmployeeProfile.hasMany(Payslip, { foreignKey: 'employeeId' });
Payslip.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

User.hasMany(Payslip, { as: 'generatedPayslips', foreignKey: 'generatedBy' });
Payslip.belongsTo(User, { as: 'generator', foreignKey: 'generatedBy' });

// Notification recipient/sender
User.hasMany(Notification, { as: 'receivedNotifications', foreignKey: 'recipientId' });
Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

User.hasMany(Notification, { as: 'sentNotifications', foreignKey: 'senderId' });
Notification.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

module.exports = {
  sequelize,
  Tenant,
  User,
  Role,
  EmployeeProfile,
  Shift,
  AttendanceLog,
  LeaveRequest,
  EarlyOutRequest,
  OvertimeRequest,
  Holiday,
  Notification,
  Payslip,
  UserRoles,
  EmployeeShifts
};
