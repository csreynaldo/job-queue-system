import { emitJobEvent } from '../../websocket/jobSocket';
import type { JobEvent, JobType, JobStatus } from '../../types/job.types';

export const emitJobStatus = (
  jobId: string,
  bullJobId: string,
  type: JobType,
  status: JobStatus,
  extra?: { progress?: number; error?: string },
): void => {
  const event: JobEvent = {
    event: `job:${status}` as JobEvent['event'],
    jobId,
    type,
    status,
    progress: extra?.progress,
    error: extra?.error,
    timestamp: new Date(),
  };

  emitJobEvent(event);
};