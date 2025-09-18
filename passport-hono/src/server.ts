import app from './app';
import { config } from './config';
import { testConnection } from './db';

async function startServer() {
  console.log('Starting Passport Hono server...');
  
  // Test database connection
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }
  
  console.log('Database connection successful');
  
  // Start server
  const server = Bun.serve({
    port: config.port,
    fetch: app.fetch,
  });
  
  console.log(`Server running at http://localhost:${server.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Cookie domain: ${config.cookieDomain}`);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    server.stop();
    process.exit(0);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});