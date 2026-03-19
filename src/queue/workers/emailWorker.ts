import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { emailProcessor } from '../processors/emailProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';

export const createEmailWorker = (): Worker => {
  const worker = new Worker('email', emailProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('completed', (job) => {
    logger.info(`✅ Email job ${job.id} completed`, {
      result: job.returnvalue,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Email job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('active', (job) => {
    logger.info(`⚡ Email job ${job.id} started`);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Email job ${jobId} stalled`);
  });

  return worker;
};