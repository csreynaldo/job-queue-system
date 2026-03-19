import { emitJobEvent } from '../../websocket/jobSocket';
import type { JobEvent, JobType, JobStatus } from '../../types/job.types';

export const emitJobStatus = (
  jobId: string,
  _bullJobId: string,
  type: JobType,
  status: JobStatus,
  extra?: { progress?: number; error?: string },
): void => {
  // If a progress update is present, emit `job:progress` even if the job status is still `active`.
  const eventName: JobEvent['event'] =
    extra?.progress !== undefined ? 'job:progress' : (`job:${status}` as JobEvent['event']);

  const event: JobEvent = {
    event: eventName,
    jobId,
    type,
    status,
    progress: extra?.progress,
    error: extra?.error,
    timestamp: new Date(),
  };

  emitJobEvent(event);
};
