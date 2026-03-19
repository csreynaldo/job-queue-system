import type { Job } from 'bullmq';
import { logger } from '../../config/logger';
import type { NotificationJobData } from '../../types/job.types';

export const notificationProcessor = async (
  job: Job<NotificationJobData>,
): Promise<{ delivered: boolean; channel: string }> => {
  logger.info(`🔔 Processing notification job ${job.id}`, {
    userId: job.data.userId,
    channel: job.data.channel,
  });

  // Simulate notification delivery
  await new Promise((resolve) => setTimeout(resolve, 200));

  logger.info(`✅ Notification delivered to user ${job.data.userId} via ${job.data.channel}`);

  return { delivered: true, channel: job.data.channel };
};