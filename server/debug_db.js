require('dotenv').config();
const { sequelize } = require('./src/config/db');

async function debugConstraints() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
          conname AS constraint_name, 
          contype AS constraint_type,
          pg_get_constraintdef(c.oid) AS constraint_definition
      FROM 
          pg_constraint c
      JOIN 
          pg_namespace n ON n.oid = c.connamespace
      WHERE 
          conrelid = '"HardwareTokens"'::regclass;
    `);
    console.log('--- Constraints on HardwareTokens ---');
    console.table(results);

    const [indexes] = await sequelize.query(`
      SELECT
          indexname,
          indexdef
      FROM
          pg_indexes
      WHERE
          tablename = 'HardwareTokens';
    `);
    console.log('--- Indexes on HardwareTokens ---');
    console.table(indexes);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugConstraints();
