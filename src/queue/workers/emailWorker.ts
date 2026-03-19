import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { emailProcessor } from '../processors/emailProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';
import { updateJobStatus } from '../../db/jobRepository';

export const createEmailWorker = (): Worker => {
  const worker = new Worker('email', emailProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('active', async (job) => {
    logger.info(`⚡ Email job ${job.id} started`);
    await updateJobStatus(job.id!, 'active', { started_at: new Date() });
  });

  worker.on('completed', async (job) => {
    logger.info(`✅ Email job ${job.id} completed`);
    await updateJobStatus(job.id!, 'completed', {
      result: job.returnvalue,
      completed_at: new Date(),
      duration_ms: Date.now() - job.timestamp,
    });
  });

  worker.on('failed', async (job, err) => {
    logger.error(`❌ Email job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
    await updateJobStatus(job?.id!, 'failed', {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Email job ${jobId} stalled`);
  });

  return worker;
};