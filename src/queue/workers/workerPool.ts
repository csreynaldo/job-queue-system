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

