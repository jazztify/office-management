const { 
  sequelize, 
  Tenant, 
  User, 
  Role, 
  EmployeeProfile, 
  SubscriptionPlan,
  Department,
  Position
} = require('../../models');
const { hashPassword } = require('../../services/authService');

async function initializeSystem() {
  console.log('--- 🛡️ Starting Master System Initialization ---');
  
  try {
    // 1. Sync Database (Migrations via Sync)
    console.log('[1/5] Synchronizing tables...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced.');

    // 2. Seed Subscription Plans
    console.log('[2/5] Seeding Subscription Plans...');
    const plans = [
      {
        tierName: 'essentials_free',
        monthlyPrice: 0,
        activeModules: ['attendance', 'leaves', 'employee_directory'],
        description: 'Basic attendance and leave management for small teams.'
      },
      {
        tierName: 'corporate_hr',
        monthlyPrice: 3999,
        activeModules: ['attendance', 'leaves', 'hr_payroll', 'overtime', 'shifts', 'holidays', 'crm'],
        description: 'Ideal for offices: Full HR, Payroll, and CRM management.'
      },
      {
        tierName: 'enterprise_everything',
        monthlyPrice: 14999,
        activeModules: [
          'attendance', 'leaves', 'payroll', 'overtime', 'shifts', 'holidays', 
          'inventory', 'hr_payroll', 'pos', 'club_management', 'wallet', 'returns', 
          'bookings', 'access_control', 'crm', 'loyalty', 'user_portal', 'social_marketing'
        ],
        description: 'Unlimited access to every current and future module in the suite.'
      }
    ];

    for (const plan of plans) {
      await SubscriptionPlan.findOrCreate({ where: { tierName: plan.tierName }, defaults: plan });
    }
    console.log('✅ Subscription plans ready.');

    // 3. Create Default Tenant
    console.log('[3/5] Initializing "admin" workspace...');
    const [tenant] = await Tenant.findOrCreate({
      where: { subdomain: 'admin' },
      defaults: {
        name: 'System Administration',
        subdomain: 'admin',
        status: 'active',
        activeModules: plans.find(p => p.tierName === 'enterprise_everything').activeModules,
      }
    });
    console.log(`✅ Tenant: ${tenant.name}`);

      // 4. Create Standard Departments
      console.log(`[4.1] Seeding Departments for ${tenant.name}...`);
      const defaultDepts = [
        { name: 'Management', description: 'Executive and administrative leads', color: '#0f172a' },
        { name: 'Operations', description: 'Floor and service operations', color: '#4f46e5' },
        { name: 'Sales & Marketing', description: 'Revenue and growth team', color: '#ec4899' },
        { name: 'Technical', description: 'IT and maintenance', color: '#10b981' }
      ];

      const seededDepts = {};
      for (const deptData of defaultDepts) {
        const [dept] = await Department.findOrCreate({
          where: { name: deptData.name, tenantId: tenant._id },
          defaults: { ...deptData, tenantId: tenant._id }
        });
        seededDepts[deptData.name] = dept;
      }

      // 5. Create Standard Positions
      console.log(`[4.2] Seeding Positions for ${tenant.name}...`);
      const defaultPositions = [
        { name: 'Platform Owner', dept: 'Management' },
        { name: 'General Manager', dept: 'Management' },
        { name: 'Lead Coach', dept: 'Operations' },
        { name: 'Staff Trainer', dept: 'Operations' },
        { name: 'Sales Specialist', dept: 'Sales & Marketing' },
        { name: 'Systems Admin', dept: 'Technical' }
      ];

      for (const posData of defaultPositions) {
        const dept = seededDepts[posData.dept];
        if (dept) {
          await Position.findOrCreate({
            where: { name: posData.name, tenantId: tenant._id, departmentId: dept._id },
            defaults: { 
              tenantId: tenant._id, 
              departmentId: dept._id, 
              name: posData.name 
            }
          });
        }
      }

      // 6. Create Standard Roles
      console.log('[4.3] Establishing Unified Roles & Classifications...');
    const defaultRoles = [
      { 
        name: 'Super Admin', 
        description: 'Full system access', 
        permissions: ['*'], 
        color: '#0f172a', 
        isSystemDefault: true 
      },
      { 
        name: 'Admin', 
        description: 'Administrative access for HR and settings', 
        permissions: ['manage_employees', 'view_payroll', 'manage_roles', 'manage_settings', 'view_attendance'], 
        color: '#4f46e5', 
        isSystemDefault: true 
      },
      { 
        name: 'Coach', 
        description: 'Staff with floor management access', 
        permissions: ['view_attendance', 'pos_access', 'view_ledger'], 
        color: '#10b981', 
        isSystemDefault: true 
      },
      { 
        name: 'Employee', 
        description: 'Standard staff access', 
        permissions: ['view_attendance'], 
        color: '#64748b', 
        isSystemDefault: true 
      }
    ];

    const seededRoles = {};
    for (const roleData of defaultRoles) {
      const [role] = await Role.findOrCreate({
        where: { name: roleData.name, tenantId: tenant._id },
        defaults: { ...roleData, tenantId: tenant._id }
      });
      // Always update to ensure colors/permissions are fresh
      await role.update({
        description: roleData.description,
        color: roleData.color,
        isSystemDefault: true
      });
      seededRoles[roleData.name] = role;
    }
    console.log('✅ Visual roles & classifications ready.');

    // 5. Create Root Admin User
    console.log('[5/5] Initializing Super Admin...');
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@system.com';
    const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    
    const [user, userCreated] = await User.findOrCreate({
      where: { email: adminEmail, tenantId: tenant._id },
      defaults: {
        email: adminEmail,
        passwordHash: hashPassword(adminPass),
        tenantId: tenant._id,
        isActive: true
      }
    });

    if (userCreated) {
      console.log(`✅ Super Admin Created: ${adminEmail} / ${adminPass}`);
      const superAdminRole = seededRoles['Super Admin'];
      const managementDept = await Department.findOne({ where: { name: 'Management', tenantId: tenant._id } });
      const platformOwnerPos = await Position.findOne({ where: { name: 'Platform Owner', tenantId: tenant._id } });

      if (superAdminRole) await user.setRoles([superAdminRole._id]);

      await EmployeeProfile.create({
        userId: user._id,
        tenantId: tenant._id,
        roleId: superAdminRole._id,
        departmentId: managementDept?._id,
        positionId: platformOwnerPos?._id,
        staffType: 'MANAGEMENT',
        firstName: 'System',
        lastName: 'Admin',
        status: 'active'
      });
      console.log('✅ Super Admin: admin@system.com / admin123');
    }

    console.log('--- ✨ System Initialization Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Initialization failed:', err);
    process.exit(1);
  }
}

initializeSystem();
