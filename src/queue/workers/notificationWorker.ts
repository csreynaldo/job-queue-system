import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { notificationProcessor } from '../processors/notificationProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';
import { updateJobStatus } from '../../db/jobRepository';

export const createNotificationWorker = (): Worker => {
  const worker = new Worker('notification', notificationProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('active', async (job) => {
  logger.info(`⚡ Notification job ${job.id} started`);
  await updateJobStatus(`notification-${job.id!}`, 'active', { started_at: new Date() });
});

worker.on('completed', async (job) => {
  logger.info(`✅ Notification job ${job.id} completed`);
  await updateJobStatus(`notification-${job.id!}`, 'completed', {
    result: job.returnvalue,
    completed_at: new Date(),
    duration_ms: Date.now() - job.timestamp,
  });
});

worker.on('failed', async (job, err) => {
  logger.error(`❌ Notification job ${job?.id} failed`, {
    error: err.message,
    attempts: job?.attemptsMade,
  });
  await updateJobStatus(`notification-${job?.id!}`, 'failed', {
    error: err.message,
    attempts: job?.attemptsMade,
  });
});

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Notification job ${jobId} stalled`);
  });

  return worker;
};