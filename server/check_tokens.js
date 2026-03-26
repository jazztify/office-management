require('dotenv').config();
const { HardwareToken, Tenant } = require('./src/models');

async function checkTokens() {
  try {
    const tokens = await HardwareToken.findAll({
      include: [{ model: Tenant, attributes: ['_id', 'name', 'subdomain'] }]
    });
    console.log('--- HardwareTokens in DB ---');
    console.log(JSON.stringify(tokens, null, 2));
    
    // If we want to fix it, we could delete duplicates not belonging to our target tenant
    // But for now let's just see them.
    process.exit(0);
  } catch (err) {
    console.error('Error checking tokens:', err);
    process.exit(1);
  }
}

checkTokens();
