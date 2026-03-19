import { Router } from 'express';
import type { Request, Response } from 'express';
import { emailQueue } from '../../queue/queues/emailQueue';
import { reportQueue } from '../../queue/queues/reportQueue';
import { notificationQueue } from '../../queue/queues/notificationQueue';
import { createJob, getJobById, listJobs, updateJobStatus } from '../../db/jobRepository';
import { CreateJobSchema, ListJobsSchema, JobIdSchema } from '../validators/job.validators';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { PRIORITY_MAP } from '../../types/job.types';
import type { JobStatus, JobType } from '../../types/job.types';
import { logger } from '../../config/logger';
import { jobsSubmittedTotal } from '../../monitoring/metrics';

import { requireApiKey } from '../middleware/auth';

import { v4 as uuidv4 } from 'uuid';
import { emitJobStatus } from '../../queue/events/jobEvents';

const router = Router();

// Apply auth middleware to all job routes
router.use(requireApiKey);

const mapBullStateToJobStatus = (state: string): JobStatus => {
  switch (state) {
    case 'waiting':
      return 'queued';
    case 'delayed':
      return 'delayed';
    case 'active':
      return 'active';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'paused':
      return 'paused';
    default:
      return 'queued';
  }
};

const getQueue = (type: JobType) => {
  switch (type) {
    case 'email':
      return emailQueue;
    case 'report':
      return reportQueue;
    case 'notification':
      return notificationQueue;
  }
};

// ================================
// POST /jobs — Submit a new job
// ================================
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateJobSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0].message);
    }

    const { type, priority, data, scheduledFor } = parsed.data;
    const queue = getQueue(type);

    // 1. Generate ID and save to database first
    const bullJobId = uuidv4();
    const jobRecord = await createJob({
      bull_job_id: bullJobId,
      type,
      priority,
      data: data as Record<string, unknown>,
    });

    // 2. Dispatch to BullMQ safely
    let bullJob;
    try {
      const delayMs = scheduledFor
        ? Math.max(0, new Date(scheduledFor).getTime() - Date.now())
        : undefined;
      bullJob = await queue.add(`${type}-job`, data, {
        jobId: bullJobId,
        priority: PRIORITY_MAP[priority],
        delay: delayMs,
      });
    } catch (err) {
      logger.error('❌ Failed to dispatch job to BullMQ', { error: (err as Error).message });
      await updateJobStatus(`${type}-${bullJobId}`, 'failed', { error: (err as Error).message });
      throw new AppError(500, 'Failed to enqueue job');
    }

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
  }),
);

// ================================
// GET /jobs — List jobs
// ================================
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = ListJobsSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0].message);
    }

    const jobs = await listJobs(parsed.data);
    const nextCursor = jobs.length > 0 ? jobs[jobs.length - 1].created_at.toISOString() : null;

    res.json({
      data: jobs,
      pagination: {
        limit: parsed.data.limit,
        nextCursor,
        count: jobs.length,
      },
    });
  }),
);

// ================================
// GET /jobs/:id — Get job by ID
// ================================
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
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
        liveStatus = mapBullStateToJobStatus(await bullJob.getState());
      }
    }

    res.json({ ...job, status: liveStatus });
  }),
);

// ================================
// DELETE /jobs/:id — Cancel a job
// ================================
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
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
      if (bullJob) {
        await bullJob.remove();
        const cancelled = await updateJobStatus(`${job.type}-${bullJobId}`, 'paused', {
          error: 'Cancelled by user',
        });
        if (cancelled)
          emitJobStatus(cancelled.id, bullJobId, job.type, 'paused', {
            error: 'Cancelled by user',
          });
      }
    }

    logger.info(`🗑️  Job cancelled`, { jobId: job.id });

    res.json({ message: `Job ${job.id} cancelled successfully`, status: 'paused' });
  }),
);

export default router;
