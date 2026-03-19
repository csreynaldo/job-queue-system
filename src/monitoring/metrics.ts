import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export const register = new Registry();

// ================================
// Counters — track totals
// ================================
export const jobsSubmittedTotal = new Counter({
  name: 'jobs_submitted_total',
  help: 'Total number of jobs submitted',
  labelNames: ['type', 'priority'],
  registers: [register],
});

export const jobsCompletedTotal = new Counter({
  name: 'jobs_completed_total',
  help: 'Total number of jobs completed',
  labelNames: ['type'],
  registers: [register],
});

export const jobsFailedTotal = new Counter({
  name: 'jobs_failed_total',
  help: 'Total number of jobs failed',
  labelNames: ['type'],
  registers: [register],
});

// ================================
// Gauges — track current values
// ================================
export const jobsActiveGauge = new Gauge({
  name: 'jobs_active',
  help: 'Number of currently active jobs',
  labelNames: ['type'],
  registers: [register],
});

export const queueDepthGauge = new Gauge({
  name: 'queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['type'],
  registers: [register],
});

// ================================
// Histograms — track distributions
// ================================
export const jobDurationHistogram = new Histogram({
  name: 'job_duration_ms',
  help: 'Job processing duration in milliseconds',
  labelNames: ['type'],
  buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000],
  registers: [register],
});