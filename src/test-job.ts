import { emailQueue } from './queue/queues/emailQueue';
import { reportQueue } from './queue/queues/reportQueue';
import { notificationQueue } from './queue/queues/notificationQueue';
import { PRIORITY_MAP } from './types/job.types';

const submitTestJobs = async (): Promise<void> => {
  console.info('🚀 Submitting test jobs...\n');

  // Submit an email job
  const emailJob = await emailQueue.add(
    'welcome-email',
    {
      to: 'user@example.com',
      subject: 'Welcome to the platform!',
      body: 'Thanks for signing up.',
    },
    { priority: PRIORITY_MAP.high },
  );
  console.info(`✅ Email job submitted — ID: ${emailJob.id}`);

  // Submit a report job
  const reportJob = await reportQueue.add(
    'monthly-report',
    {
      reportType: 'monthly-summary',
      filters: { month: 'March', year: 2026 },
      outputFormat: 'pdf',
      requestedBy: 'admin@example.com',
    },
    { priority: PRIORITY_MAP.medium },
  );
  console.info(`✅ Report job submitted — ID: ${reportJob.id}`);

  // Submit a notification job
  const notifJob = await notificationQueue.add(
    'push-notification',
    {
      userId: 'user-123',
      message: 'Your report is ready!',
      channel: 'push',
    },
    { priority: PRIORITY_MAP.low },
  );
  console.info(`✅ Notification job submitted — ID: ${notifJob.id}`);

  console.info('\n🎉 All jobs submitted! Watch your server terminal for processing logs.');
  process.exit(0);
};

submitTestJobs().catch((err) => {
  console.error('❌ Failed to submit jobs:', err.message);
  process.exit(1);
});