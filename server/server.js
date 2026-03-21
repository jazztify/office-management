const app = require('./app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`\n╔══════════════════════════════════════════════╗`);
      console.log(`║  SaaS Platform Server                        ║`);
      console.log(`║  Running on http://localhost:${PORT}            ║`);
      console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}                 ║`);
      console.log(`╚══════════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
