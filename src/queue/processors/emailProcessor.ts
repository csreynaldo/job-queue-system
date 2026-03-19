import type { Job } from 'bullmq';
import { logger } from '../../config/logger';
import type { EmailJobData } from '../../types/job.types';
export default async (job: Job<EmailJobData>): Promise<{ sent: boolean; to: string }> => {
  logger.info(`📧 Processing email job ${job.id}`, {
    to: job.data.to,
    subject: job.data.subject,
  });

  // Simulate email sending (replace with real email service like Nodemailer/Resend)
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate occasional failure for retry testing (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Email service temporarily unavailable');
  }

  logger.info(`✅ Email sent to ${job.data.to}`);

  return { sent: true, to: job.data.to };
};