const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });


const requiredEnv = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`\n❌ ERROR: Missing required database environment variables: ${missingEnv.join(', ')}`);
  console.error('👉 Please check your .env file or copy .env.example.\n');
  process.exit(1);
}

const sequelize = new Sequelize(

  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {

    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
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
