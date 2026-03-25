const { User, Tenant } = require('./src/models');
const { sequelize } = require('./src/config/db');

async function listUsers() {
  try {
    const users = await User.findAll({
      include: [{ model: Tenant, attributes: ['subdomain'] }]
    });
    
    console.log('--- ALL USERS IN DB ---');
    users.forEach(u => {
      console.log(`Email: ${u.email} | Workspace: ${u.Tenant?.subdomain || 'NULL'}`);
    });
    console.log('-----------------------');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

listUsers();
