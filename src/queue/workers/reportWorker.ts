import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { reportProcessor } from '../processors/reportProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';
import { updateJobStatus, getJobByBullId } from '../../db/jobRepository';
import { emitJobStatus } from '../events/jobEvents';
import {
  jobsCompletedTotal,
  jobsFailedTotal,
  jobsActiveGauge,
  jobDurationHistogram,
} from '../../monitoring/metrics';

export const createReportWorker = (): Worker => {
  const worker = new Worker('report', reportProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('active', async (job) => {
    logger.info(`⚡ Report job ${job.id} started`);
    jobsActiveGauge.labels('report').inc();
    await updateJobStatus(`report-${job.id!}`, 'active', { started_at: new Date() });
    const record = await getJobByBullId(`report-${job.id!}`);
    if (record) emitJobStatus(record.id, job.id!, 'report', 'active');
  });

  worker.on('completed', async (job) => {
    logger.info(`✅ Report job ${job.id} completed`);
    jobsActiveGauge.labels('report').dec();
    jobsCompletedTotal.labels('report').inc();
    jobDurationHistogram.labels('report').observe(Date.now() - job.timestamp);
    await updateJobStatus(`report-${job.id!}`, 'completed', {
      result: job.returnvalue,
      completed_at: new Date(),
      duration_ms: Date.now() - job.timestamp,
    });
    const record = await getJobByBullId(`report-${job.id!}`);
    if (record) emitJobStatus(record.id, job.id!, 'report', 'completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error(`❌ Report job ${job?.id} failed`, { error: err.message });
    jobsActiveGauge.labels('report').dec();
    jobsFailedTotal.labels('report').inc();
    await updateJobStatus(`report-${job?.id!}`, 'failed', {
      error: err.message,
      attempts: job?.attemptsMade,
    });
    const record = await getJobByBullId(`report-${job?.id!}`);
    if (record) emitJobStatus(record.id, job?.id!, 'report', 'failed', { error: err.message });
  });

  worker.on('progress', async (job, progress) => {
    logger.info(`📊 Report job ${job.id} progress: ${progress}%`);
    const record = await getJobByBullId(`report-${job.id!}`);
    if (record) emitJobStatus(record.id, job.id!, 'report', 'active', { progress: progress as number });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Report job ${jobId} stalled`);
  });

  return worker;
};
