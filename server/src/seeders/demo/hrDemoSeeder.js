const { 
  sequelize, 
  Tenant, 
  User, 
  EmployeeProfile, 
  Shift, 
  DeductionProfile, 
  HardwareToken,
  Department,
  Position,
  LeaveRequest,
  AttendanceLog,
  Payslip
} = require('../../models');
const { hashPassword } = require('../../services/authService');

async function seedHR() {
  console.log('--- 🚀 Starting Realistic Filipino HR Demo Seeding ---');
  
  try {
    // 1. Find target tenant
    let tenant = await Tenant.findOne({ where: { subdomain: 'verify' } });
    if (!tenant) tenant = await Tenant.findOne({ where: { subdomain: 'admin' } });
    if (!tenant) tenant = await Tenant.findOne();
    if (!tenant) throw new Error('No tenant found. Run setup_database first.');
    console.log(`Using Tenant: ${tenant.name} (${tenant._id})`);

    // --- CLEANUP ---
    console.log('Cleaning up existing HR demo data for this tenant...');
    const tid = tenant._id;
    await Payslip.destroy({ where: { tenantId: tid } });
    await AttendanceLog.destroy({ where: { tenantId: tid } });
    await LeaveRequest.destroy({ where: { tenantId: tid } });
    await HardwareToken.destroy({ where: { tenantId: tid } });
    await DeductionProfile.destroy({ where: { employeeId: { [sequelize.Sequelize.Op.in]: sequelize.literal(`(SELECT _id FROM "EmployeeProfiles" WHERE "tenantId" = '${tid}')`) } } });
    await EmployeeProfile.destroy({ where: { tenantId: tid } });
    await User.destroy({ where: { tenantId: tid } });
    await Position.destroy({ where: { tenantId: tid } });
    await Department.destroy({ where: { tenantId: tid } });
    console.log('Cleanup complete.');

    // 2. Create Departments
    console.log('Creating Departments...');
    const dHq = await Department.create({ name: 'Corporate HQ', tenantId: tid });
    const dOps = await Department.create({ name: 'Operations', tenantId: tid, parentId: dHq._id });
    const dSales = await Department.create({ name: 'Sales & Marketing', tenantId: tid, parentId: dHq._id });
    const dFinance = await Department.create({ name: 'Finance & Admin', tenantId: tid, parentId: dHq._id });
    const dFacilities = await Department.create({ name: 'Maintenance & Facilities', tenantId: tid, parentId: dOps._id });

    // 3. Create Positions
    console.log('Creating Positions...');
    const pCeo = await Position.create({ name: 'Chief Executive Officer', tenantId: tid, departmentId: dHq._id, permissions: [{ module: 'hr_payroll', level: 'manage' }, { module: 'administration', level: 'manage' }] });
    const pVpOps = await Position.create({ name: 'VP of Operations', tenantId: tid, departmentId: dOps._id, parentPositionId: pCeo._id, permissions: [{ module: 'hr_payroll', level: 'write' }, { module: 'inventory', level: 'manage' }] });
    const pVpSales = await Position.create({ name: 'VP of Sales', tenantId: tid, departmentId: dSales._id, parentPositionId: pCeo._id, permissions: [{ module: 'pos', level: 'manage' }, { module: 'crm', level: 'manage' }] });
    const pCfo = await Position.create({ name: 'CFO', tenantId: tid, departmentId: dFinance._id, parentPositionId: pCeo._id, permissions: [{ module: 'hr_payroll', level: 'manage' }, { module: 'wallet', level: 'manage' }] });
    const pHrMgr = await Position.create({ name: 'HR Manager', tenantId: tid, departmentId: dFinance._id, parentPositionId: pCfo._id, permissions: [{ module: 'hr_payroll', level: 'manage' }] });
    const pLogSup = await Position.create({ name: 'Logistics Supervisor', tenantId: tid, departmentId: dOps._id, parentPositionId: pVpOps._id, permissions: [{ module: 'inventory', level: 'write' }] });
    const pJanitorialLead = await Position.create({ name: 'Janitorial & Facilities Lead', tenantId: tid, departmentId: dFacilities._id, parentPositionId: pVpOps._id });
    const pLogStaff = await Position.create({ name: 'Logistics Staff', tenantId: tid, departmentId: dOps._id, parentPositionId: pLogSup._id });
    const pJanitor = await Position.create({ name: 'Senior Janitor', tenantId: tid, departmentId: dFacilities._id, parentPositionId: pJanitorialLead._id });
    const pSalesRep = await Position.create({ name: 'Senior Sales Representative', tenantId: tid, departmentId: dSales._id, parentPositionId: pVpSales._id, permissions: [{ module: 'pos', level: 'write' }] });

    // 4. Seed Balanced Personnel (Filipino Names)
    const staffDefinitions = [
      { fName: 'Jose', lName: 'Rizal Jr.', email: 'jose@demo.com', pos: pCeo, sal: 120000, mgr: null },
      { fName: 'Maria', lName: 'Clara de los Santos', email: 'maria@demo.com', pos: pVpOps, sal: 85000, mgr: 'Jose Rizal Jr.' },
      { fName: 'Juan', lName: 'Luna', email: 'juan@demo.com', pos: pCfo, sal: 95000, mgr: 'Jose Rizal Jr.' },
      { fName: 'Anita', lName: 'Magsaysay', email: 'anita@demo.com', pos: pHrMgr, sal: 65000, mgr: 'Juan Luna' },
      { fName: 'Ricardo', lName: 'Dalisay', email: 'ricardo@demo.com', pos: pLogSup, sal: 45000, mgr: 'Maria Clara de los Santos' },
      { fName: 'Teresita', lName: 'Reyes', email: 'teresita@demo.com', pos: pJanitorialLead, sal: 35000, mgr: 'Maria Clara de los Santos' },
      { fName: 'Pedro', lName: 'Penduko', email: 'pedro@demo.com', pos: pLogStaff, sal: 25000, mgr: 'Ricardo Dalisay' },
      { fName: 'Gabriela', lName: 'Silang', email: 'gabriela@demo.com', pos: pSalesRep, sal: 40000, mgr: 'Maria Clara de los Santos' },
      { fName: 'Andres', lName: 'Bonifacio', email: 'andres@demo.com', pos: pJanitor, sal: 22000, mgr: 'Teresita Reyes' }
    ];

    const staffMap = {};
    const employees = [];

    for (const s of staffDefinitions) {
      const user = await User.create({ email: s.email, passwordHash: hashPassword('password123'), tenantId: tid, isActive: true });
      const emp = await EmployeeProfile.create({
        userId: user._id, tenantId: tid, firstName: s.fName, lastName: s.lName,
        positionId: s.pos._id, departmentId: s.pos.departmentId,
        managerId: s.mgr ? staffMap[s.mgr]._id : null, salary: s.sal, employmentStatus: 'regular'
      });
      staffMap[`${s.fName} ${s.lName}`] = emp;
      employees.push(emp);

      await DeductionProfile.create({ 
        tenantId: tid,
        employeeId: emp._id, 
        monthlyTax: s.sal * 0.1, 
        sssEmployee: 1200, 
        philhealthEmployee: 800, 
        pagibigEmployee: 200 
      });
      await HardwareToken.create({ userId: user._id, tenantId: tid, tokenValue: `RFID-${s.fName.toUpperCase()}`, status: 'ACTIVE', type: 'RFID' });
      console.log(`✅ Seeded: ${s.fName} ${s.lName} (${s.pos.name})`);
    }

    // 5. Generate Historical Logs (Attendance for 10 days)
    console.log('Generating 10 days of Attendance logs...');
    const now = new Date();
    for (let i = 1; i <= 10; i++) {
      const logDate = new Date(now);
      logDate.setDate(now.getDate() - i);
      const dateStr = logDate.toISOString().split('T')[0];
      
      for (const emp of employees) {
        if (logDate.getDay() === 0) continue; // Skip Sundays
        await AttendanceLog.create({
          tenantId: tid, employeeId: emp._id, date: dateStr,
          clockIn: new Date(`${dateStr}T08:00:00Z`), clockOut: new Date(`${dateStr}T17:00:00Z`),
          totalWorkHours: 8, status: 'complete'
        });
      }
    }

    // 6. Generate Leave Requests
    console.log('Generating Leave Requests...');
    const anita = staffMap['Anita Magsaysay'];
    const pCeoProfile = staffMap['Jose Rizal Jr.'];
    await LeaveRequest.create({ tenantId: tid, employeeId: anita._id, leaveType: 'vacation', startDate: new Date(now.getTime() + 86400000 * 5), endDate: new Date(now.getTime() + 86400000 * 7), status: 'approved', approvedBy: pCeoProfile._id, reason: 'Family vacation in Palawan' });
    await LeaveRequest.create({ tenantId: tid, employeeId: staffMap['Pedro Penduko']._id, leaveType: 'sick', startDate: new Date(), endDate: new Date(), status: 'pending', reason: 'Flu symptoms' });

    // 7. Generate Historical Payslips 
    console.log('Generating Previous Month Payslips...');
    const prevMonth = (now.getMonth() === 0) ? 12 : now.getMonth();
    const prevYear = (now.getMonth() === 0) ? now.getFullYear() - 1 : now.getFullYear();

    for (const emp of employees) {
      const basic = Number(emp.salary);
      const deductions = { tax: basic * 0.1, sss: 1200, philhealth: 800, pagibig: 200, other: 0 };
      const totalDed = Object.values(deductions).reduce((a, b) => a + b, 0);
      await Payslip.create({
        tenantId: tid, employeeId: emp._id, period: { month: prevMonth, year: prevYear }, payPeriod: 'full_month',
        basicSalary: basic, grossPay: basic, totalDeductions: totalDed, netPay: basic - totalDed,
        status: 'paid', allowances: { housing: 0, transport: 1500, meal: 1000, other: 0 },
        deductions: deductions, attendanceSummary: { totalWorkHours: 160, totalLateHours: 0, totalAbsentDays: 1 }
      });
    }

    console.log('--- ✨ Expanded Filipino HR Demo Seeding Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedHR();
