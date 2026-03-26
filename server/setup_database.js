const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🛠️ System Setup Script
 * Automates .env creation and database initialization.
 */
function setup() {
  console.log('\n🚀 Starting System Setup...\n');

  const envPath = path.join(__dirname, '.env');
  const examplePath = path.join(__dirname, '.env.example');

  // 1. Check for .env file
  if (!fs.existsSync(envPath)) {
    console.log('📝 .env file missing. Copying from .env.example...');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Created .env file. PLEASE UPDATE IT WITH YOUR DATABASE CREDENTIALS.');
    } else {
      console.error('❌ ERROR: .env.example not found. Cannot create .env.');
      process.exit(1);
    }
  } else {
    console.log('✅ .env file already exists.');
  }

  // 2. Run Seeder
  console.log('\n🏗️  Initializing Database...');
  try {
    // Run the seeder directly
    execSync('node src/seeders/mandatory/coreSeeder.js', { stdio: 'inherit' });
    console.log('\n✨ Database initialization complete!');
  } catch (error) {
    console.error('\n❌ ERROR: Database initialization failed.');
    console.error('👉 Make sure your Postgres server is running and your .env credentials are correct.');
    process.exit(1);
  }

  console.log('\n🏁 Setup finished. You can now run "npm run dev" to start the server.\n');
}

setup();
