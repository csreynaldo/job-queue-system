import fs from 'fs';
import path from 'path';
import { db, connectDB } from './database';
import { logger } from '../config/logger';

const runMigrations = async (): Promise<void> => {
  await connectDB();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  logger.info('🔄 Running database migrations...');
  await db.query(schema);
  logger.info('✅ Migrations completed successfully');

  await db.end();
};

runMigrations().catch((err) => {
  logger.error('❌ Migration failed:', { error: err.message });
  process.exit(1);
});
