import { z } from 'zod';

// ================================
// Create Job Schema
// ================================
export const CreateJobSchema = z.object({
  type: z.enum(['email', 'report', 'notification'], {
    errorMap: () => ({ message: 'type must be email, report, or notification' }),
  }),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  data: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: 'data must not be empty',
  }),
  scheduledFor: z.string().datetime().optional(),
});

// ================================
// List Jobs Query Schema
// ================================
export const ListJobsSchema = z.object({
  status: z.enum(['queued', 'active', 'completed', 'failed', 'delayed', 'paused']).optional(),
  type: z.enum(['email', 'report', 'notification']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().datetime().optional(),
});

// ================================
// Job ID Param Schema
// ================================
export const JobIdSchema = z.object({
  id: z.string().uuid({ message: 'id must be a valid UUID' }),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type ListJobsQuery = z.infer<typeof ListJobsSchema>;
