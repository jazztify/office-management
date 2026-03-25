const { Tenant } = require('./src/models');
const { sequelize } = require('./src/config/db');

async function enableModules() {
  try {
    const admin = await Tenant.findOne({ where: { subdomain: 'admin' } });
    if (admin) {
      const modules = new Set(admin.activeModules || []);
      modules.add('memberships');
      modules.add('bookings');
      modules.add('access_control');
      
      await admin.update({ activeModules: Array.from(modules) });
      console.log('Modules enabled for admin tenant:', Array.from(modules));
    } else {
      console.log('Admin tenant not found');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

enableModules();
