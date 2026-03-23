const http = require('http');
const app = require('./app');
const { connectDB } = require('./src/config/db');
const { initWebSocket } = require('./src/services/wsService');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Create HTTP server from Express app
    const server = http.createServer(app);

    // Initialize WebSocket on the same server
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`\n╔══════════════════════════════════════════════╗`);
      console.log(`║  SaaS Platform Server                        ║`);
      console.log(`║  Running on http://localhost:${PORT}            ║`);
      console.log(`║  WebSocket on ws://localhost:${PORT}/ws         ║`);
      console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}                 ║`);
      console.log(`╚══════════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
