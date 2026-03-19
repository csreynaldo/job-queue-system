import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { notificationProcessor } from '../processors/notificationProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';

export const createNotificationWorker = (): Worker => {
  const worker = new Worker('notification', notificationProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('completed', (job) => {
    logger.info(`✅ Notification job ${job.id} completed`, {
      result: job.returnvalue,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Notification job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('active', (job) => {
    logger.info(`⚡ Notification job ${job.id} started`);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Notification job ${jobId} stalled`);
  });

  return worker;
};