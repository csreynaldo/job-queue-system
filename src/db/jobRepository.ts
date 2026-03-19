import { db } from './database';
import type { JobType, JobPriority, JobStatus } from '../types/job.types';

export interface JobRecord {
  id: string;
  bull_job_id: string | null;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  data: Record<string, unknown>;
  result: unknown | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  duration_ms: number | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
}

export interface CreateJobRecord {
  bull_job_id: string;
  type: JobType;
  priority: JobPriority;
  data: Record<string, unknown>;
}

export interface ListJobsFilter {
  status?: JobStatus;
  type?: JobType;
  limit?: number;
  offset?: number;
}

// ================================
// Create a new job record
// ================================
export const createJob = async (input: CreateJobRecord): Promise<JobRecord> => {
  const { rows } = await db.query<JobRecord>(
    `INSERT INTO jobs (bull_job_id, type, priority, data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (bull_job_id) DO UPDATE
       SET type = EXCLUDED.type,
           updated_at = NOW()
     RETURNING *`,
    [`${input.type}-${input.bull_job_id}`, input.type, input.priority, JSON.stringify(input.data)],
  );
  return rows[0];
};

// ================================
// Get job by ID
// ================================
export const getJobById = async (id: string): Promise<JobRecord | null> => {
  const { rows } = await db.query<JobRecord>(
    `SELECT * FROM jobs WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
};

// ================================
// Get job by BullMQ job ID
// ================================
export const getJobByBullId = async (bullJobId: string): Promise<JobRecord | null> => {
  const { rows } = await db.query<JobRecord>(
    `SELECT * FROM jobs WHERE bull_job_id = $1`,
    [bullJobId],
  );
  return rows[0] ?? null;
};

// ================================
// Update job status
// ================================
export const updateJobStatus = async (
  bullJobId: string,
  status: JobStatus,
  extra?: {
    result?: unknown;
    error?: string;
    duration_ms?: number;
    started_at?: Date;
    completed_at?: Date;
    attempts?: number;
  },
): Promise<void> => {
  await db.query(
    `UPDATE jobs SET
      status = $1,
      result = COALESCE($2, result),
      error = COALESCE($3, error),
      duration_ms = COALESCE($4, duration_ms),
      started_at = COALESCE($5, started_at),
      completed_at = COALESCE($6, completed_at),
      attempts = COALESCE($7, attempts)
     WHERE bull_job_id = $8`,
    [
      status,
      extra?.result ? JSON.stringify(extra.result) : null,
      extra?.error ?? null,
      extra?.duration_ms ?? null,
      extra?.started_at ?? null,
      extra?.completed_at ?? null,
      extra?.attempts ?? null,
      bullJobId,
    ],
  );
};

// ================================
// List jobs with filters
// ================================
export const listJobs = async (filter: ListJobsFilter = {}): Promise<JobRecord[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filter.status);
  }

  if (filter.type) {
    conditions.push(`type = $${idx++}`);
    values.push(filter.type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;

  values.push(limit, offset);

  const { rows } = await db.query<JobRecord>(
    `SELECT * FROM jobs ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    values,
  );

  return rows;
};

// ================================
// Log a job event
// ================================
export const logJobEvent = async (
  jobId: string,
  event: string,
  message?: string,
  meta?: Record<string, unknown>,
): Promise<void> => {
  await db.query(
    `INSERT INTO job_logs (job_id, event, message, meta)
     VALUES ($1, $2, $3, $4)`,
    [jobId, event, message ?? null, JSON.stringify(meta ?? {})],
  );
};