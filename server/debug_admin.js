const { User, Tenant, Role } = require('./src/models');
const { sequelize } = require('./src/config/db');

async function debugAdmin() {
  try {
    const adminTenant = await Tenant.findOne({ where: { subdomain: 'admin' } });
    if (!adminTenant) {
      console.log('RESULT: ADMIN_TENANT_NOT_FOUND');
      return;
    }
    console.log('RESULT: ADMIN_TENANT_FOUND id=' + adminTenant._id);

    const user = await User.findOne({ 
      where: { email: 'owner@system.com', tenantId: adminTenant._id }
    });

    if (!user) {
      console.log('RESULT: USER_NOT_FOUND_IN_ADMIN_TENANT');
      const allUsers = await User.findAll({ where: { tenantId: adminTenant._id } });
      console.log('RESULT: OTHER_USERS_IN_ADMIN=[' + allUsers.map(u => u.email).join(',') + ']');
    } else {
      console.log('RESULT: USER_FOUND email=' + user.email);
      console.log('RESULT: IS_ACTIVE=' + user.isActive);
      // Check password hash presence
      console.log('RESULT: HAS_PASSWORD_HASH=' + (!!user.password));
    }

  } catch (err) {
    console.error('RESULT: ERROR message=' + err.message);
  } finally {
    process.exit();
  }
}

debugAdmin();
