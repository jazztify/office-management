require('dotenv').config();
const { sequelize } = require('./src/config/db');

async function cleanupConstraints() {
  try {
    const [constraints] = await sequelize.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = '"HardwareTokens"'::regclass 
      AND conname LIKE 'HardwareTokens_tokenValue_key%';
    `);
    
    console.log(`Found ${constraints.length} redundant constraints. Dropping...`);
    
    for (const row of constraints) {
      await sequelize.query(`ALTER TABLE "HardwareTokens" DROP CONSTRAINT IF EXISTS "${row.conname}";`);
      console.log(`Dropped constraint: ${row.conname}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning constraints:', err);
    process.exit(1);
  }
}

cleanupConstraints();
