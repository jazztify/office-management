require('dotenv').config();
const { sequelize } = require('./src/config/db');

async function cleanupIndexes() {
  try {
    const [indexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'HardwareTokens' 
      AND indexname LIKE 'HardwareTokens_tokenValue_key%';
    `);
    
    console.log(`Found ${indexes.length} redundant indexes. Dropping...`);
    
    for (const row of indexes) {
      await sequelize.query(`DROP INDEX IF EXISTS "${row.indexname}";`);
      console.log(`Dropped index: ${row.indexname}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanupIndexes();
