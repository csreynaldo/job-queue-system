# Distributed Job Queue System

A production-grade distributed job queue system built with Node.js, TypeScript, BullMQ, Redis, and PostgreSQL. Features real-time job tracking via WebSockets, a live dashboard, Prometheus metrics, and Grafana monitoring.

---

## Architecture

The system is designed with a strict physical and logical separation between the API interface and background processing:

1. **API Server (Express):** Receives incoming HTTP requests, performs payload validation against Zod schemas, and pushes raw tasks to the Redis cache. It also manages authentication headers (`x-api-key`) and logs the initial job intent to PostgreSQL.
2. **Persistence & Auditing (PostgreSQL):** Serves as the ultimate source of truth. It records the full lifecycle of every job from intent (`queued`) to resolution (`completed` or `failed`), guaranteeing complete observability.
3. **Queue Mechanism (Redis + BullMQ):** Handles the high-throughput task queueing, leveraging exponential backoffs and dead-letter queues to maintain resilient data flows.
4. **Sandboxed Worker Pool:** Independent Node.js processes subscribe to Redis queues. These functions (`email`, `report`, `notification`) run in isolated sandboxes, ensuring heavy CPU operations do not block the main Express event loop. Once a task terminates, workers update the PostgreSQL row.
5. **Real-time Event Bus (Socket.io):** Actively listens for job lifecycle mutations across the database and seamlessly streams `status` arrays to active WebSockets, powering the integrated dashboard.

---

## Features

- **3 job types** — email, report, notification
- **Priority queues** — high, medium, low
- **Retry with exponential backoff** — automatic retries on failure
- **Dead-letter queue** — failed jobs preserved for inspection
- **Real-time updates** — WebSocket events on every status change
- **Live dashboard** — browser UI showing jobs in real time
- **REST API** — full CRUD with Zod validation
- **PostgreSQL persistence** — every job saved with full audit trail
- **Prometheus metrics** — counters, gauges, histograms
- **Grafana dashboards** — visual monitoring
- **Docker** — fully containerized stack
- **CI/CD** — GitHub Actions on every push

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express v4 |
| Job Queue | BullMQ |
| Cache/Queue | Redis 7 |
| Database | PostgreSQL 16 |
| WebSockets | Socket.io |
| Validation | Zod v3 |
| Monitoring | Prometheus + Grafana |
| Logging | Winston |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Project Structure
```
job-queue-system/
├── src/
│   ├── api/
│   │   ├── middleware/       # errorHandler, asyncHandler, metricsMiddleware
│   │   ├── routes/           # health, jobs, metrics
│   │   └── server.ts         # Express app entry point
│   ├── config/               # env config, logger, redis connection
│   ├── db/                   # PostgreSQL pool, schema, migrations, repository
│   ├── monitoring/           # Prometheus metrics definitions
│   ├── queue/
│   │   ├── events/           # WebSocket event emitters
│   │   ├── processors/       # Job processing logic
│   │   ├── queues/           # BullMQ queue definitions
│   │   └── workers/          # Worker pool + individual workers
│   ├── types/                # TypeScript interfaces
│   ├── websocket/            # Socket.io server
│   └── public/               # Live dashboard HTML
├── docker/
│   └── prometheus.yml        # Prometheus scrape config
├── .github/workflows/        # GitHub Actions CI
├── docker-compose.yml        # Full stack (Redis, PostgreSQL, Prometheus, Grafana)
├── Dockerfile                # Multi-stage production build
└── .env.example              # Environment variable template
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/job-queue-system.git
cd job-queue-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment
```bash
cp .env.example .env
```

### 4. Start Docker services
```bash
docker-compose up -d
```

### 5. Run database migrations
```bash
npx tsx src/db/migrate.ts
```

### 6. Start the server
```bash
npm run dev
```

### 7. Open the dashboard
- Visit `http://localhost:3000/dashboard.html`
- Enter the API key from your `.env` file to connect the dashboard and submit jobs

---

## Local URLs

| Service | URL |
|---|---|
| Live Dashboard | http://localhost:3000/dashboard.html |
| API Server | http://localhost:3000 |
| Health Check | http://localhost:3000/health |
| Metrics | http://localhost:3000/metrics |
| Redis Commander | http://localhost:8081 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |

---

## API Endpoints

> **Security Note:** All requests to `/jobs` endpoints must include the `x-api-key` header! Rate Limiting is strictly capped at 100 requests / 15mins per IP.

### Submit a Job
```http
POST /jobs
Content-Type: application/json
x-api-key: your-secure-key

{
  "type": "email",
  "priority": "high",
  "data": {
    "to": "user@example.com",
    "subject": "Hello!",
    "body": "Test email"
  }
}
```

### List Jobs (Cursor Pagination)
```http
GET /jobs?status=completed&type=email&limit=20&cursor=2026-03-20T12:00:00.000Z
x-api-key: your-secure-key
```

### Get Job by ID
```http
GET /jobs/:id
x-api-key: your-secure-key
```

### Cancel a Job
```http
DELETE /jobs/:id
x-api-key: your-secure-key
```

---

## Prometheus Metrics

| Metric | Type | Description |
|---|---|---|
| `jobs_submitted_total` | Counter | Total jobs submitted by type and priority |
| `jobs_completed_total` | Counter | Total jobs completed by type |
| `jobs_failed_total` | Counter | Total jobs failed by type |
| `jobs_active` | Gauge | Currently active jobs by type |
| `queue_depth` | Gauge | Jobs waiting in queue by type |
| `job_duration_ms` | Histogram | Job processing duration in ms |
| `http_request_duration_ms` | Histogram | HTTP request duration in ms |

---

## Running Tests
```bash
npm test
npm run test:coverage
```

---

## Production Build
```bash
npm run build
docker build -t job-queue-system .
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | development | Environment |
| `PORT` | 3000 | Server port |
| `API_KEY` | default-dev-key | API authentication key for integrations |
| `FRONTEND_URL` | http://localhost:3000 | Allowed origin for strict CORS |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5433 | PostgreSQL host port for local Docker Compose (`5432` inside containers) |
| `DB_NAME` | jobqueue | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `WORKER_CONCURRENCY` | 5 | Workers per queue |
| `MAX_RETRY_ATTEMPTS` | 3 | Max job retries |
| `RETRY_DELAY_MS` | 1000 | Base retry delay |

---

## License

MIT
