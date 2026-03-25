import { Pool } from 'pg';
import { config } from '../config.js';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process in serverless environment
  if (config.nodeEnv !== 'production') {
    process.exit(-1);
  }
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}
