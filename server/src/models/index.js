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
const SubscriptionPlan = require('./SubscriptionPlan');
const Product = require('./Product');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Order = require('./Order');
const MembershipTier = require('./MembershipTier');
const Resource = require('./Resource');
const Booking = require('./Booking');
const AccessLog = require('./AccessLog');
const CommissionLedger = require('./CommissionLedger');
const IotDevice = require('./IotDevice');
const HardwareToken = require('./HardwareToken');
const WorkSchedule = require('./WorkSchedule');
const OverrideLog = require('./OverrideLog');
const DeductionProfile = require('./DeductionProfile');
const Department = require('./Department');
const Position = require('./Position');

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

Tenant.hasMany(Product, { foreignKey: 'tenantId' });
Product.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Wallet, { foreignKey: 'tenantId' });
Wallet.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Transaction, { foreignKey: 'tenantId' });
Transaction.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Order, { foreignKey: 'tenantId' });
Order.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(MembershipTier, { foreignKey: 'tenantId' });
MembershipTier.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Resource, { foreignKey: 'tenantId' });
Resource.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Booking, { foreignKey: 'tenantId' });
Booking.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(AccessLog, { foreignKey: 'tenantId' });
AccessLog.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(CommissionLedger, { foreignKey: 'tenantId' });
CommissionLedger.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(IotDevice, { foreignKey: 'tenantId' });
IotDevice.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(HardwareToken, { foreignKey: 'tenantId' });
HardwareToken.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(WorkSchedule, { foreignKey: 'tenantId' });
WorkSchedule.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(DeductionProfile, { foreignKey: 'tenantId' });
DeductionProfile.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Department, { foreignKey: 'tenantId' });
Department.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Position, { foreignKey: 'tenantId' });
Position.belongsTo(Tenant, { foreignKey: 'tenantId' });


// User & Role (Many-to-Many)
const UserRoles = sequelize.define('UserRoles', {}, { timestamps: false });
User.belongsToMany(Role, { through: UserRoles, foreignKey: 'userId' });
Role.belongsToMany(User, { through: UserRoles, foreignKey: 'roleId' });

// Membership Associations
MembershipTier.hasMany(User, { foreignKey: 'membershipTierId' });
User.belongsTo(MembershipTier, { foreignKey: 'membershipTierId' });

// Booking Associations
User.hasMany(Booking, { foreignKey: 'userId' });
Booking.belongsTo(User, { foreignKey: 'userId' });

Resource.hasMany(Booking, { foreignKey: 'resourceId' });
Booking.belongsTo(Resource, { foreignKey: 'resourceId' });

// AccessLog Associations
User.hasMany(AccessLog, { foreignKey: 'userId' });
AccessLog.belongsTo(User, { foreignKey: 'userId' });

Resource.hasMany(AccessLog, { foreignKey: 'resourceId' });
AccessLog.belongsTo(Resource, { foreignKey: 'resourceId' });

IotDevice.hasMany(AccessLog, { foreignKey: 'deviceId' });
AccessLog.belongsTo(IotDevice, { foreignKey: 'deviceId' });

HardwareToken.hasMany(AccessLog, { foreignKey: 'hardwareTokenId' });
AccessLog.belongsTo(HardwareToken, { foreignKey: 'hardwareTokenId' });

User.hasMany(HardwareToken, { foreignKey: 'userId' });
HardwareToken.belongsTo(User, { foreignKey: 'userId' });

// User & EmployeeProfile
User.hasOne(EmployeeProfile, { foreignKey: 'userId' });
EmployeeProfile.belongsTo(User, { foreignKey: 'userId' });

// Classification Associations
Department.hasMany(Position, { foreignKey: 'departmentId' });
Position.belongsTo(Department, { foreignKey: 'departmentId' });

Position.belongsTo(Role, { foreignKey: 'roleId' });
Role.hasMany(Position, { foreignKey: 'roleId' });

Department.hasMany(EmployeeProfile, { foreignKey: 'departmentId' });
EmployeeProfile.belongsTo(Department, { foreignKey: 'departmentId' });

Position.hasMany(EmployeeProfile, { foreignKey: 'positionId' });
EmployeeProfile.belongsTo(Position, { foreignKey: 'positionId' });

// Recursive Position Hierarchy (Self-referential)
Position.belongsTo(Position, { as: 'reportsTo', foreignKey: 'parentPositionId' });
Position.hasMany(Position, { as: 'subordinates', foreignKey: 'parentPositionId' });

// EmployeeProfile Hierarchy (Self-referential)
EmployeeProfile.belongsTo(EmployeeProfile, { as: 'manager', foreignKey: 'managerId' });
EmployeeProfile.hasMany(EmployeeProfile, { as: 'subordinates', foreignKey: 'managerId' });

EmployeeProfile.hasMany(AttendanceLog, { foreignKey: 'employeeId' });
AttendanceLog.belongsTo(EmployeeProfile, { as: 'employeeProfile', foreignKey: 'employeeId' });

EmployeeProfile.hasMany(WorkSchedule, { foreignKey: 'employeeId' });
WorkSchedule.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

Shift.hasMany(WorkSchedule, { foreignKey: 'shiftId' });
WorkSchedule.belongsTo(Shift, { foreignKey: 'shiftId' });

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
Payslip.belongsTo(EmployeeProfile, { as: 'employeeProfile', foreignKey: 'employeeId' });

User.hasMany(Payslip, { as: 'generatedPayslips', foreignKey: 'generatedBy' });
Payslip.belongsTo(User, { as: 'generator', foreignKey: 'generatedBy' });

// Notification recipient/sender
User.hasMany(Notification, { as: 'receivedNotifications', foreignKey: 'recipientId' });
Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

User.hasMany(Notification, { as: 'sentNotifications', foreignKey: 'senderId' });
Notification.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

// Wallet & Transaction Associations
User.hasOne(Wallet, { foreignKey: 'userId' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(Transaction, { foreignKey: 'walletId' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId' });

Wallet.hasMany(Order, { foreignKey: 'walletId' });
Order.belongsTo(Wallet, { foreignKey: 'walletId' });

Transaction.hasOne(CommissionLedger, { foreignKey: 'transactionId' });
CommissionLedger.belongsTo(Transaction, { foreignKey: 'transactionId' });

EmployeeProfile.hasMany(CommissionLedger, { foreignKey: 'coachId' });
CommissionLedger.belongsTo(EmployeeProfile, { foreignKey: 'coachId' });

User.hasMany(Transaction, { as: 'processedTransactions', foreignKey: 'processedBy' });
Transaction.belongsTo(User, { as: 'processor', foreignKey: 'processedBy' });

User.hasMany(Order, { as: 'processedOrders', foreignKey: 'processedBy' });
Order.belongsTo(User, { as: 'orderProcessor', foreignKey: 'processedBy' });

AttendanceLog.hasMany(OverrideLog, { foreignKey: 'attendanceLogId' });
OverrideLog.belongsTo(AttendanceLog, { foreignKey: 'attendanceLogId' });

User.hasMany(OverrideLog, { as: 'manualOverrides', foreignKey: 'adminId' });
OverrideLog.belongsTo(User, { as: 'admin', foreignKey: 'adminId' });

EmployeeProfile.hasOne(DeductionProfile, { foreignKey: 'employeeId' });
DeductionProfile.belongsTo(EmployeeProfile, { foreignKey: 'employeeId' });

EmployeeProfile.belongsTo(Role, { foreignKey: 'roleId' });
Role.hasMany(EmployeeProfile, { foreignKey: 'roleId' });


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
  SubscriptionPlan,
  Product,
  Wallet,
  Transaction,
  Order,
  MembershipTier,
  Resource,
  Booking,
  AccessLog,
  CommissionLedger,
  IotDevice,
  HardwareToken,
  WorkSchedule,
  OverrideLog,
  DeductionProfile,
  Department,
  Position,
  UserRoles,
  EmployeeShifts
};
