const { 
  Tenant, User, Role, EmployeeProfile, SubscriptionPlan, 
  Product, Wallet, Transaction, Order,
  sequelize 
} = require('./src/models');
const { hashPassword } = require('./src/services/authService');

async function setup() {
  try {
    console.log('--- 🚀 Starting Database Setup ---');
    
    // 1. Sync Database (Migrations via Sync)
    console.log('[1/4] Synchronizing tables...');
    await sequelize.sync({ alter: true });
    console.log('ℹ️ Database synced.');

    // --- Seed Subscription Plans ---
    console.log('--- 🛡️ Seeding Subscription Plans ---');
    const plans = [
      {
        tierName: 'free',
        monthlyPrice: 0,
        activeModules: ['attendance', 'leaves'],
        description: 'Basic attendance tracking for small teams'
      },
      {
        tierName: 'pro',
        monthlyPrice: 2999,
        activeModules: ['attendance', 'leaves', 'payroll', 'overtime', 'shifts', 'holidays'],
        description: 'Full payroll and shift management'
      },
      {
        tierName: 'enterprise',
        monthlyPrice: 9999,
        activeModules: ['attendance', 'leaves', 'payroll', 'overtime', 'shifts', 'holidays', 'inventory', 'hr', 'pos', 'club_management'],
        description: 'Complete enterprise resources and inventory'
      }
    ];

    for (const plan of plans) {
      const [p, created] = await SubscriptionPlan.findOrCreate({
        where: { tierName: plan.tierName },
        defaults: plan
      });
      if (created) {
        console.log(`✅ Plan "${plan.tierName}" created.`);
      } else {
        // Optionally update existing ones to match if they've changed
        await p.update(plan);
        console.log(`ℹ️ Plan "${plan.tierName}" already exists (updated).`);
      }
    }

    // 2. Create Default Tenant
    console.log('[3/4] Seeding default tenant...');
    const [tenant, tenantCreated] = await Tenant.findOrCreate({
      where: { subdomain: 'admin' },
      defaults: {
        name: 'Main Office',
        subdomain: 'admin',
        status: 'active',
        activeModules: ['payroll', 'inventory', 'attendance', 'leaves'],
      }
    });
    if (tenantCreated) console.log('✅ Default tenant "admin" created.');
    else console.log('ℹ️ Default tenant already exists.');

    // 3. Create Default Roles
    console.log('[3/4] Seeding default roles...');
    const rolesData = [
      { name: 'Super Admin', permissions: ['*'] },
      { name: 'HR Manager', permissions: ['view_payroll', 'generate_payslip', 'manage_employees', 'view_attendance'] },
      { name: 'Employee', permissions: ['view_my_attendance', 'request_leave'] }
    ];

    const seededRoles = [];
    for (const r of rolesData) {
      const [role, created] = await Role.findOrCreate({
        where: { name: r.name, tenantId: tenant._id },
        defaults: { ...r, tenantId: tenant._id }
      });
      seededRoles.push(role);
      if (created) console.log(`✅ Role "${r.name}" created.`);
    }

    // 4. Create Initial Admin User
    console.log('[4/4] Seeding initial admin user...');
    const adminEmail = 'admin@system.com';
    const adminPassword = 'adminpassword123';
    
    const [user, userCreated] = await User.findOrCreate({
      where: { email: adminEmail, tenantId: tenant._id },
      defaults: {
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        tenantId: tenant._id,
        isActive: true
      }
    });

    if (userCreated) {
      // Assign Super Admin role
      const superAdminRole = seededRoles.find(r => r.name === 'Super Admin');
      if (superAdminRole) {
        await user.setRoles([superAdminRole._id]);
      }

      // Create Employee Profile for Admin
      await EmployeeProfile.create({
        userId: user._id,
        tenantId: tenant._id,
        firstName: 'System',
        lastName: 'Admin',
        department: 'IT',
        position: 'Administrator',
        salary: 100000,
        employmentStatus: 'regular'
      });

      console.log('✅ Initial admin user created.');
      console.log('--------------------------------------------------');
      console.log('👉 LOGIN CREDENTIALS');
      console.log(`   Tenant (subdomain): admin`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('--------------------------------------------------');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }

    console.log('--- ✨ Database Setup Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Setup Failed:', error);
    process.exit(1);
  }
}

setup();
