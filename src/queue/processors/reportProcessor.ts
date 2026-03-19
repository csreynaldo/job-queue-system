import type { Job } from 'bullmq';
import { logger } from '../../config/logger';
import type { ReportJobData } from '../../types/job.types';

export default async (job: Job<ReportJobData>): Promise<{ generated: boolean; format: string }> => {
  logger.info(`📊 Processing report job ${job.id}`, {
    type: job.data.reportType,
    format: job.data.outputFormat,
  });

  // Simulate report generation (heavy task — takes longer)
  const totalSteps = 5;
  for (let step = 1; step <= totalSteps; step++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await job.updateProgress(Math.floor((step / totalSteps) * 100));
    logger.info(`📊 Report ${job.id} progress: ${Math.floor((step / totalSteps) * 100)}%`);
  }

  logger.info(`✅ Report generated for ${job.data.requestedBy}`);

  return { generated: true, format: job.data.outputFormat };
};
