import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../config/logger';

logger.info('Connecting to PostgreSQL', {
  host: config.db.host,
  port: config.db.port,
  db: config.db.name,
  user: config.db.user,
});

export const db = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
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
