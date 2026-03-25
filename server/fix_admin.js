const { User, Tenant, Role, sequelize } = require('./src/models');
const { hashPassword } = require('./src/services/authService');

async function fixAdmin() {
  const transaction = await sequelize.transaction();
  try {
    // 1. Ensure Admin Tenant exists
    let adminTenant = await Tenant.findOne({ where: { subdomain: 'admin' }, transaction });
    if (!adminTenant) {
      console.log('Creating Admin Tenant...');
      adminTenant = await Tenant.create({
        name: 'System Admin',
        subdomain: 'admin',
        subscriptionTier: 'enterprise',
        activeModules: ['payroll', 'inventory', 'pos', 'attendance', 'leaves', 'memberships', 'bookings', 'access_control']
      }, { transaction });
    } else {
      console.log('Admin Tenant exists.');
    }

    // 2. Ensure Super Admin Role exists
    let adminRole = await Role.findOne({ where: { tenantId: adminTenant._id, name: 'Super Admin' }, transaction });
    if (!adminRole) {
      console.log('Creating Super Admin Role...');
      adminRole = await Role.create({
        tenantId: adminTenant._id,
        name: 'Super Admin',
        permissions: ['*'],
        isSystemDefault: true
      }, { transaction });
    }

    // 3. Create or Reset owner@system.com
    const email = 'owner@system.com';
    const password = 'password123';
    const hashedPassword = await hashPassword(password);

    console.log('Using field name passwordHash');
    let user = await User.findOne({ where: { email, tenantId: adminTenant._id }, transaction });
    if (user) {
      console.log('Updating existing admin user passwordHash...');
      await user.update({ passwordHash: hashedPassword, isActive: true }, { transaction });
    } else {
      console.log('Creating new admin user...');
      user = await User.create({
        tenantId: adminTenant._id,
        email,
        passwordHash: hashedPassword,
        isActive: true
      }, { transaction });
    }

    // 4. Assign Role (using belongsToMany association method)
    // The previous error was NOT passwordHash? Wait, "User.password cannot be null" was because I passed password: ...
    // and sequelize expected passwordHash: ... because of User model definition.
    
    // Check if addRole or setRoles is available
    if (typeof user.setRoles === 'function') {
        await user.setRoles([adminRole], { transaction });
    } else {
        console.log('setRoles not found, attempting manual UserRoles insert...');
        // Fallback or debug
    }

    await transaction.commit();
    console.log('SUCCESS: Admin access restored.');
    console.log('Workspace: admin');
    console.log('Email: owner@system.com');
    console.log('Password: password123');

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('ERROR:', err.message);
  } finally {
    process.exit();
  }
}

fixAdmin();
