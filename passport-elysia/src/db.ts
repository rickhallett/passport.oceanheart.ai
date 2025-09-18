import postgres from 'postgres';
import { config } from './config';

// Create PostgreSQL connection pool
export const sql = postgres(config.databaseUrl, {
  max: 10, // Maximum number of connections in pool
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notice messages in production
  debug: config.isDevelopment ? console.log : undefined,
});

// Test database connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connected:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeConnection() {
  await sql.end();
}