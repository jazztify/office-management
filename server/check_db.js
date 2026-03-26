const { User, Tenant } = require('./src/models');
require('dotenv').config({ path: './.env' });

async function check() {
  try {
    const tenants = await Tenant.findAll();
    console.log('--- Tenants ---');
    tenants.forEach(t => console.log(`ID: ${t._id}, Name: ${t.name}, Subdomain: ${t.subdomain}`));

    const users = await User.findAll();
    console.log('\n--- Users ---');
    users.forEach(u => console.log(`ID: ${u._id}, Email: ${u.email}, TenantId: ${u.tenantId}, Active: ${u.isActive}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
