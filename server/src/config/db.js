const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'SaaS',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '0022Rr..',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] PostgreSQL connected successfully.');
    
    // In a real migration, we'd use migrations, 
    // but for this task we'll use sync() to ensure tables exist.
    await sequelize.sync({ alter: true }); 
    
    return sequelize;
  } catch (error) {
    console.error('[DB] PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
