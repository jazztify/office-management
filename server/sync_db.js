const { sequelize } = require('./src/models');

async function syncDb() {
  try {
    console.log('Starting DB sync (alter: true)...');
    await sequelize.sync({ alter: true });
    console.log('DB sync COMPLETED successfully.');
  } catch (err) {
    console.error('DB sync FAILED:', err.message);
  } finally {
    process.exit();
  }
}

syncDb();
