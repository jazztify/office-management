const { Tenant, User } = require('./src/models');

async function check() {
  try {
    const tenants = await Tenant.findAll();
    console.log('--- Tenants ---');
    console.log(JSON.stringify(tenants, null, 2));

    const users = await User.findAll();
    console.log('--- Users ---');
    // Don't log passwordHash for security, but check if it's there
    console.log(JSON.stringify(users.map(u => ({ email: u.email, tenantId: u.tenantId, isActive: u.isActive })), null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
