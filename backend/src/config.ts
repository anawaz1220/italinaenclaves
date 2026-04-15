import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/italianenclaves',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChurchEnclave@2026',
};
