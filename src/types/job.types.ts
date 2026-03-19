export type JobType = 'email' | 'report' | 'notification';
export type JobPriority = 'high' | 'medium' | 'low';
export type JobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

export const PRIORITY_MAP: Record<JobPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
}

export interface ReportJobData {
  reportType: string;
  filters: Record<string, unknown>;
  outputFormat: 'pdf' | 'csv' | 'json';
  requestedBy: string;
}

export interface NotificationJobData {
  userId: string;
  message: string;
  channel: 'push' | 'sms' | 'in-app';
}

export type JobData = EmailJobData | ReportJobData | NotificationJobData;

export interface CreateJobInput {
  type: JobType;
  priority: JobPriority;
  data: JobData;
  scheduledFor?: Date;
}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  result?: unknown;
  error?: string;
  duration?: number;
  completedAt?: Date;
}

export interface JobEvent {
  event: 'job:queued' | 'job:active' | 'job:completed' | 'job:failed' | 'job:progress';
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress?: number;
  error?: string;
  timestamp: Date;
}
