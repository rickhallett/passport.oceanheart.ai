import postgres from 'postgres';
import { config } from '../config';

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}
});

export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function transaction<T>(
  callback: (sql: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  return sql.begin(callback);
}