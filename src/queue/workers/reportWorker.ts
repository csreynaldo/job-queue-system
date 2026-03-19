import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { reportProcessor } from '../processors/reportProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';
import { updateJobStatus } from '../../db/jobRepository';

export const createReportWorker = (): Worker => {
  const worker = new Worker('report', reportProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

    worker.on('active', async (job) => {
    logger.info(`⚡ Report job ${job.id} started`);
    await updateJobStatus(`report-${job.id!}`, 'active', { started_at: new Date() });
    });

    worker.on('completed', async (job) => {
    logger.info(`✅ Report job ${job.id} completed`);
    await updateJobStatus(`report-${job.id!}`, 'completed', {
        result: job.returnvalue,
        completed_at: new Date(),
        duration_ms: Date.now() - job.timestamp,
    });
    });

    worker.on('failed', async (job, err) => {
    logger.error(`❌ Report job ${job?.id} failed`, {
        error: err.message,
        attempts: job?.attemptsMade,
    });
    await updateJobStatus(`report-${job?.id!}`, 'failed', {
        error: err.message,
        attempts: job?.attemptsMade,
    });
    });

  worker.on('progress', (job, progress) => {
    logger.info(`📊 Report job ${job.id} progress: ${progress}%`);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Report job ${jobId} stalled`);
  });

  return worker;
};