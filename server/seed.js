/**
 * ═══════════════════════════════════════════════════════════
 *  SaaS Platform — Database Seed Script
 *  Creates the system owner, test tenants, roles, users,
 *  employee profiles, holidays, attendance data, and payslips.
 * ═══════════════════════════════════════════════════════════
 *
 *  Usage: node seed.js
 */

const mongoose = require('mongoose');

// Register global tenant plugin before importing models
const tenantFilterPlugin = require('./src/middlewares/mongooseTenantFilter');
mongoose.plugin(tenantFilterPlugin);

const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const Role = require('./src/models/Role');
const EmployeeProfile = require('./src/models/EmployeeProfile');
const LeaveRequest = require('./src/models/LeaveRequest');
const Holiday = require('./src/models/Holiday');
const Payslip = require('./src/models/Payslip');
const AttendanceLog = require('./src/models/AttendanceLog');
const OvertimeRequest = require('./src/models/OvertimeRequest');
const { hashPassword } = require('./src/services/authService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/saas_platform';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n🔌 Connected to MongoDB\n');

    // ── Clean existing data ──────────────────────────────
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Role.deleteMany({}),
      EmployeeProfile.deleteMany({}),
      LeaveRequest.deleteMany({}),
      Holiday.deleteMany({}),
      Payslip.deleteMany({}),
      AttendanceLog.deleteMany({}),
      OvertimeRequest.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data\n');

    const password = hashPassword('password123');

    // ══════════════════════════════════════════════════════
    //  YOUR ACCOUNT: SYSTEM OWNER / PLATFORM OWNER
    //  This is YOU — the main owner of the entire SaaS.
    //  You use this to create companies/branches for clients.
    // ══════════════════════════════════════════════════════
    const systemTenant = await Tenant.create({
      name: 'System Owner Workspace',
      subdomain: 'admin',
      status: 'active',
      subscriptionTier: 'enterprise',
      activeModules: [],
    });

    const systemOwnerRole = await Role.create({
      tenantId: systemTenant._id,
      name: 'System Owner',
      description: 'Platform owner — can create and manage all client companies',
      isSystemDefault: true,
      permissions: ['*'],
    });

    const ownerUser = await User.create({
      email: 'owner@system.com',
      passwordHash: password,
      tenantId: systemTenant._id,
      roles: [systemOwnerRole._id],
    });

    await EmployeeProfile.create({
      tenantId: systemTenant._id,
      userId: ownerUser._id,
      firstName: 'System',
      lastName: 'Owner',
      department: 'Platform',
      position: 'Owner',
      salary: 0,
    });

    console.log('👑 Created YOUR Account (System Owner)');
    console.log('   Email: owner@system.com');
    console.log('   Workspace: admin');
    console.log('   This account creates companies and manages clients.\n');

    // ══════════════════════════════════════════════════════
    //  CLIENT 1: Acme Corporation (Enterprise)
    //  This is a sample CLIENT company you created.
    //  Their admin is NOT the system owner — they only manage
    //  their own company.
    // ══════════════════════════════════════════════════════
    const acme = await Tenant.create({
      name: 'Acme Corporation',
      subdomain: 'acme',
      status: 'active',
      subscriptionTier: 'enterprise',
      activeModules: ['inventory', 'payroll', 'pos', 'analytics'],
      settings: {
        officeHours: { start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
        deductions: {
          latePerMinute: 5, undertimePerMinute: 5, absencePerDay: 500,
          halfDayDeduction: 250, lunchOvertime: 3, maxLunchMinutes: 60,
        },
        overtime: {
          requiresApproval: true, rateMultiplier: 1.25,
          restDayMultiplier: 1.3, holidayMultiplier: 2.0, maxHoursPerDay: 4,
        },
        gracePeriod: 15,
      },
    });

    // ── Acme Roles (Company-level roles, NOT system owner) ──
    const acmeAdmin = await Role.create({
      tenantId: acme._id,
      name: 'Company Admin',
      description: 'Admin of this company — manages their own workspace only',
      isSystemDefault: true,
      permissions: ['*'],
    });

    const acmeHR = await Role.create({
      tenantId: acme._id,
      name: 'HR Manager',
      description: 'Manages employees, attendance, leaves, payroll, and holidays',
      permissions: [
        'manage_employees', 'edit_attendance', 'manage_leaves',
        'view_payroll', 'manage_roles', 'manage_settings',
        'manage_holidays', 'generate_payslip',
      ],
    });

    const acmeEmployee = await Role.create({
      tenantId: acme._id,
      name: 'Employee',
      description: 'Regular employee — can clock in/out, request leaves & overtime',
      permissions: ['edit_attendance'],
    });

    const acmeViewer = await Role.create({
      tenantId: acme._id,
      name: 'Viewer',
      description: 'Read-only access to payroll',
      permissions: ['view_payroll'],
    });

    // ── Acme Users (Company accounts) ────────────────────
    const adminUser = await User.create({
      email: 'admin@acme.com', passwordHash: password,
      tenantId: acme._id, roles: [acmeAdmin._id],
    });

    const hrUser = await User.create({
      email: 'hr@acme.com', passwordHash: password,
      tenantId: acme._id, roles: [acmeHR._id],
    });

    const empUser = await User.create({
      email: 'employee@acme.com', passwordHash: password,
      tenantId: acme._id, roles: [acmeEmployee._id],
    });

    const viewerUser = await User.create({
      email: 'viewer@acme.com', passwordHash: password,
      tenantId: acme._id, roles: [acmeViewer._id],
    });

    // ── Acme Employee Profiles ───────────────────────────
    const adminProfile = await EmployeeProfile.create({
      tenantId: acme._id, userId: adminUser._id,
      firstName: 'John', lastName: 'Admin',
      department: 'Executive', position: 'CEO',
      salary: 120000,
      leaveCredits: { vacation: 20, sick: 10, bereavement: 5 },
    });

    const hrEmployee = await EmployeeProfile.create({
      tenantId: acme._id, userId: hrUser._id,
      firstName: 'Sarah', lastName: 'HR',
      department: 'Human Resources', position: 'HR Manager',
      salary: 65000,
      leaveCredits: { vacation: 14, sick: 7, bereavement: 3 },
    });

    const empProfile = await EmployeeProfile.create({
      tenantId: acme._id, userId: empUser._id,
      firstName: 'Mike', lastName: 'Developer',
      department: 'Engineering', position: 'Senior Developer',
      salary: 85000, managerId: hrEmployee._id,
      leaveCredits: { vacation: 14, sick: 7, bereavement: 3 },
    });

    const viewerProfile = await EmployeeProfile.create({
      tenantId: acme._id, userId: viewerUser._id,
      firstName: 'Jane', lastName: 'Viewer',
      department: 'Finance', position: 'Financial Analyst',
      salary: 55000,
      leaveCredits: { vacation: 14, sick: 7, bereavement: 3 },
    });

    // ── Acme Attendance Records (sample data) ────────────
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoStr = twoDaysAgo.toISOString().split('T')[0];

    // Mike's attendance: yesterday - complete day
    await AttendanceLog.create({
      tenantId: acme._id, employeeId: empProfile._id, date: yestStr,
      clockIn: new Date(`${yestStr}T08:05:00`),
      lunchOut: new Date(`${yestStr}T12:01:00`),
      lunchIn: new Date(`${yestStr}T12:55:00`),
      clockOut: new Date(`${yestStr}T17:02:00`),
      totalWorkHours: 7.93, lunchBreakMinutes: 54,
      lateMinutes: 0, undertimeMinutes: 0, status: 'complete',
    });

    // Mike's attendance: 2 days ago - late and undertime
    await AttendanceLog.create({
      tenantId: acme._id, employeeId: empProfile._id, date: twoStr,
      clockIn: new Date(`${twoStr}T08:32:00`),
      lunchOut: new Date(`${twoStr}T12:05:00`),
      lunchIn: new Date(`${twoStr}T13:10:00`),
      clockOut: new Date(`${twoStr}T16:45:00`),
      totalWorkHours: 7.13, lunchBreakMinutes: 65,
      lateMinutes: 32, undertimeMinutes: 15, status: 'complete',
    });

    // Sarah HR's attendance: yesterday
    await AttendanceLog.create({
      tenantId: acme._id, employeeId: hrEmployee._id, date: yestStr,
      clockIn: new Date(`${yestStr}T07:55:00`),
      lunchOut: new Date(`${yestStr}T12:00:00`),
      lunchIn: new Date(`${yestStr}T13:00:00`),
      clockOut: new Date(`${yestStr}T17:00:00`),
      totalWorkHours: 8.08, lunchBreakMinutes: 60,
      lateMinutes: 0, undertimeMinutes: 0, status: 'complete',
    });

    // ── Acme Overtime Requests ────────────────────────────
    await OvertimeRequest.create({
      tenantId: acme._id, employeeId: empProfile._id,
      date: yesterday, startTime: '17:00', endTime: '20:00',
      hoursRequested: 3, reason: 'Need to finish sprint deliverables before deadline',
      status: 'pending',
    });

    await OvertimeRequest.create({
      tenantId: acme._id, employeeId: empProfile._id,
      date: twoDaysAgo, startTime: '17:00', endTime: '19:00',
      hoursRequested: 2, reason: 'Bug fix for production issue',
      status: 'approved', approvedBy: hrEmployee._id, approvedAt: twoDaysAgo,
    });

    // ── Acme Leave Requests ──────────────────────────────
    await LeaveRequest.create({
      tenantId: acme._id, employeeId: empProfile._id,
      leaveType: 'vacation', startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-04'), reason: 'Family vacation',
    });

    await LeaveRequest.create({
      tenantId: acme._id, employeeId: empProfile._id,
      leaveType: 'sick', startDate: new Date('2026-03-25'),
      endDate: new Date('2026-03-26'), reason: 'Not feeling well',
    });

    // ── Acme Holidays (Philippine PH 2026) ───────────────
    const acmeHolidays = [
      { name: "New Year's Day", date: new Date('2026-01-01'), type: 'national', description: 'First day of the year', isRecurring: true },
      { name: 'Araw ng Kagitingan', date: new Date('2026-04-09'), type: 'national', description: 'Day of Valor', isRecurring: true },
      { name: 'Maundy Thursday', date: new Date('2026-03-26'), type: 'national', description: 'Holy Week' },
      { name: 'Good Friday', date: new Date('2026-03-27'), type: 'national', description: 'Holy Week' },
      { name: 'Labor Day', date: new Date('2026-05-01'), type: 'national', description: 'International Workers Day', isRecurring: true },
      { name: 'Independence Day', date: new Date('2026-06-12'), type: 'national', description: 'Philippine Independence Day', isRecurring: true },
      { name: 'Ninoy Aquino Day', date: new Date('2026-08-21'), type: 'national', description: 'National Hero', isRecurring: true },
      { name: 'National Heroes Day', date: new Date('2026-08-31'), type: 'national', description: 'Last Monday of August' },
      { name: 'Bonifacio Day', date: new Date('2026-11-30'), type: 'national', description: 'Andres Bonifacio Birthday', isRecurring: true },
      { name: 'Christmas Day', date: new Date('2026-12-25'), type: 'national', description: 'Christmas celebration', isRecurring: true },
      { name: 'Rizal Day', date: new Date('2026-12-30'), type: 'national', description: 'Jose Rizal Day', isRecurring: true },
      { name: 'Company Anniversary', date: new Date('2026-05-15'), type: 'company', description: 'Acme Corp founding anniversary' },
    ];

    for (const h of acmeHolidays) {
      await Holiday.create({ ...h, tenantId: acme._id });
    }

    // ── Acme Payslips (March 2026) ───────────────────────
    const marchPayslips = [
      { emp: adminProfile, basicSalary: 120000 },
      { emp: hrEmployee, basicSalary: 65000 },
      { emp: empProfile, basicSalary: 85000 },
      { emp: viewerProfile, basicSalary: 55000 },
    ];

    for (const p of marchPayslips) {
      const allowances = {
        housing: Math.round(p.basicSalary * 0.1),
        transport: 3000, meal: 2000, other: 0,
      };
      const deductions = {
        tax: Math.round(p.basicSalary * 0.12),
        insurance: 1500, sss: 1350, pagibig: 200, philhealth: 450, other: 0,
      };
      const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
      const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
      const grossPay = p.basicSalary + totalAllowances;
      const netPay = grossPay - totalDeductions;

      await Payslip.create({
        tenantId: acme._id, employeeId: p.emp._id,
        period: { month: 3, year: 2026 },
        basicSalary: p.basicSalary, allowances, deductions,
        grossPay, totalDeductions, netPay,
        status: 'generated', generatedBy: hrUser._id,
      });
    }

    console.log('🏢 Created Client: Acme Corporation (enterprise tier)');
    console.log('   Workspace: acme');
    console.log('   4 users, 4 employee profiles, attendance, OT requests, holidays, payslips\n');

    // ══════════════════════════════════════════════════════
    //  CLIENT 2: Starter Inc (Free tier)
    // ══════════════════════════════════════════════════════
    const starter = await Tenant.create({
      name: 'Starter Inc', subdomain: 'starter',
      status: 'active', subscriptionTier: 'free', activeModules: [],
    });

    const starterAdmin = await Role.create({
      tenantId: starter._id, name: 'Company Admin',
      description: 'Admin of this free-tier workspace',
      isSystemDefault: true,
      permissions: ['manage_employees', 'edit_attendance', 'manage_leaves', 'manage_roles', 'manage_settings'],
    });

    const starterBasic = await Role.create({
      tenantId: starter._id, name: 'Employee',
      description: 'Basic employee access',
      permissions: ['edit_attendance'],
    });

    const starterAdminUser = await User.create({
      email: 'admin@starter.com', passwordHash: password,
      tenantId: starter._id, roles: [starterAdmin._id],
    });

    const starterBasicUser = await User.create({
      email: 'user@starter.com', passwordHash: password,
      tenantId: starter._id, roles: [starterBasic._id],
    });

    await EmployeeProfile.create({
      tenantId: starter._id, userId: starterAdminUser._id,
      firstName: 'Alex', lastName: 'Starter',
      department: 'General', position: 'Owner', salary: 50000,
      leaveCredits: { vacation: 14, sick: 7, bereavement: 3 },
    });

    await EmployeeProfile.create({
      tenantId: starter._id, userId: starterBasicUser._id,
      firstName: 'Bob', lastName: 'Basic',
      department: 'General', position: 'Staff', salary: 25000,
      leaveCredits: { vacation: 14, sick: 7, bereavement: 3 },
    });

    const starterHolidays = [
      { name: "New Year's Day", date: new Date('2026-01-01'), type: 'national', isRecurring: true },
      { name: 'Labor Day', date: new Date('2026-05-01'), type: 'national', isRecurring: true },
      { name: 'Christmas Day', date: new Date('2026-12-25'), type: 'national', isRecurring: true },
    ];
    for (const h of starterHolidays) {
      await Holiday.create({ ...h, tenantId: starter._id });
    }

    console.log('🏢 Created Client: Starter Inc (free tier)');
    console.log('   Workspace: starter\n');

    // ══════════════════════════════════════════════════════
    //  Print Login Credentials
    // ══════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════');
    console.log('  ALL ACCOUNTS USE PASSWORD: password123');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  👑 YOUR ACCOUNT (System Owner / Platform Owner)│');
    console.log('│  Workspace: admin                               │');
    console.log('│  Email: owner@system.com                        │');
    console.log('│  → You create/manage companies from Owner Panel │');
    console.log('│  → Company admins CANNOT access this panel      │');
    console.log('└─────────────────────────────────────────────────┘\n');

    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  🏢 ACME CORPORATION (Client Company)           │');
    console.log('│  Workspace: acme                                │');
    console.log('├─────────────┬───────────────────────────────────┤');
    console.log('│  Role        │  Email                           │');
    console.log('├─────────────┼───────────────────────────────────┤');
    console.log('│  Company Admin│  admin@acme.com                 │');
    console.log('│  HR Manager  │  hr@acme.com                     │');
    console.log('│  Employee    │  employee@acme.com               │');
    console.log('│  Viewer      │  viewer@acme.com                 │');
    console.log('└─────────────┴───────────────────────────────────┘\n');

    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  🏢 STARTER INC (Client Company — Free Tier)    │');
    console.log('│  Workspace: starter                             │');
    console.log('├──────────────┬──────────────────────────────────┤');
    console.log('│  Role         │  Email                          │');
    console.log('├──────────────┼──────────────────────────────────┤');
    console.log('│  Company Admin│  admin@starter.com              │');
    console.log('│  Employee     │  user@starter.com               │');
    console.log('└──────────────┴──────────────────────────────────┘\n');

    console.log('📝 KEY DIFFERENCE:');
    console.log('   👑 System Owner (you) → workspace "admin" → creates companies, sees all tenants');
    console.log('   🏢 Company Admin → workspace "acme"/"starter" → manages ONLY their own company');
    console.log('   👥 HR Manager → manages employees/attendance/leaves within company');
    console.log('   👤 Employee → clocks in/out, requests leaves & overtime\n');

    console.log('✅ Seed complete!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

seed();
