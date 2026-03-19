import { Pool } from 'pg';
import { logger } from '../config/logger';

// Use connection string to bypass SASL password issue
const connectionString = `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'jobqueue'}`;

logger.info('Connecting to PostgreSQL', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5433',
  db: process.env.DB_NAME || 'jobqueue',
  user: process.env.DB_USER || 'postgres',
});

export const db = new Pool({
  connectionString,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  logger.error('❌ PostgreSQL pool error:', { error: err.message });
});

export const connectDB = async (): Promise<void> => {
  const client = await db.connect();
  logger.info('✅ PostgreSQL connected');
  client.release();
};
