import { connectDB } from '../../db/database';
import { connectRedis } from '../../config/redis';
import { logger } from '../../config/logger';
import { createEmailWorker } from './emailWorker';
import { createReportWorker } from './reportWorker';
import { createNotificationWorker } from './notificationWorker';
import type { Worker } from 'bullmq';

const workers: Worker[] = [];

export const startWorkerPool = (): void => {
  logger.info('🚀 Starting worker pool...');

  const emailWorker = createEmailWorker();
  const reportWorker = createReportWorker();
  const notificationWorker = createNotificationWorker();

  workers.push(emailWorker, reportWorker, notificationWorker);

  logger.info(`✅ Worker pool started — ${workers.length} workers running`);
};

export const stopWorkerPool = async (): Promise<void> => {
  logger.info('🛑 Stopping worker pool...');

  await Promise.all(workers.map((worker) => worker.close()));

  logger.info('✅ All workers stopped gracefully');
};

// Allow running this module directly (useful for the dedicated worker container)
if (require.main === module) {
  const run = async (): Promise<void> => {
    try {
      await connectRedis();
      await connectDB();
      startWorkerPool();

      const shutdown = async (): Promise<void> => {
        await stopWorkerPool();
        process.exit(0);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    } catch (err) {
      logger.error('❌ Worker process failed to start', { error: (err as Error).message });
      process.exit(1);
    }
  };

  run();
}
