import { Router } from 'express';
import type { Request, Response } from 'express';
import { emailQueue } from '../../queue/queues/emailQueue';
import { reportQueue } from '../../queue/queues/reportQueue';
import { notificationQueue } from '../../queue/queues/notificationQueue';
import { createJob, getJobById, listJobs } from '../../db/jobRepository';
import { CreateJobSchema, ListJobsSchema, JobIdSchema } from '../validators/job.validators';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { PRIORITY_MAP } from '../../types/job.types';
import type { JobType } from '../../types/job.types';
import { logger } from '../../config/logger';
import { jobsSubmittedTotal } from '../../monitoring/metrics';

const router = Router();

const getQueue = (type: JobType) => {
  switch (type) {
    case 'email': return emailQueue;
    case 'report': return reportQueue;
    case 'notification': return notificationQueue;
  }
};

// ================================
// POST /jobs — Submit a new job
// ================================
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const { type, priority, data, scheduledFor } = parsed.data;
  const queue = getQueue(type);

  const bullJob = await queue.add(`${type}-job`, data, {
    priority: PRIORITY_MAP[priority],
    delay: scheduledFor ? new Date(scheduledFor).getTime() - Date.now() : undefined,
  });

  const jobRecord = await createJob({
    bull_job_id: bullJob.id!,
    type,
    priority,
    data: data as Record<string, unknown>,
  });

  jobsSubmittedTotal.labels(type, priority).inc();

  logger.info(`📥 Job submitted`, { jobId: jobRecord.id, type, priority });

  res.status(201).json({
    jobId: jobRecord.id,
    bullJobId: bullJob.id,
    type,
    priority,
    status: 'queued',
    createdAt: jobRecord.created_at,
  });
}));

// ================================
// GET /jobs — List jobs
// ================================
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = ListJobsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const jobs = await listJobs(parsed.data);

  res.json({
    data: jobs,
    pagination: {
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      count: jobs.length,
    },
  });
}));

// ================================
// GET /jobs/:id — Get job by ID
// ================================
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const parsed = JobIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const job = await getJobById(parsed.data.id);
  if (!job) {
    throw new AppError(404, `Job ${parsed.data.id} not found`);
  }

  let liveStatus = job.status;
  if (job.bull_job_id) {
    const queue = getQueue(job.type);
    const bullJobId = job.bull_job_id.replace(`${job.type}-`, '');
    const bullJob = await queue.getJob(bullJobId);
    if (bullJob) {
      liveStatus = (await bullJob.getState()) as typeof liveStatus;
    }
  }

  res.json({ ...job, status: liveStatus });
}));

// ================================
// DELETE /jobs/:id — Cancel a job
// ================================
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const parsed = JobIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const job = await getJobById(parsed.data.id);
  if (!job) {
    throw new AppError(404, `Job ${parsed.data.id} not found`);
  }

  if (job.bull_job_id) {
    const queue = getQueue(job.type);
    const bullJobId = job.bull_job_id.replace(`${job.type}-`, '');
    const bullJob = await queue.getJob(bullJobId);
    if (bullJob) await bullJob.remove();
  }

  logger.info(`🗑️  Job cancelled`, { jobId: job.id });

  res.json({ message: `Job ${job.id} cancelled successfully` });
}));

export default router;
