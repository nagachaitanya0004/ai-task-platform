# Architecture Document — AI Task Processing Platform

## 1. System Overview

The AI Task Processing Platform is a distributed microservices system built with:

- **Frontend**: React (Vite) served via Nginx reverse proxy
- **Backend API**: Node.js + Express (REST API with JWT auth)
- **Worker Service**: Python (background job processor)
- **Database**: MongoDB (document store)
- **Queue**: Redis (job queue for async task processing)

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                  Kubernetes Ingress (nginx)                      │
│           /api/* → backend service    /* → frontend service     │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
┌────────────▼────────────┐    ┌────────────────▼─────────────────┐
│   Backend API (Node.js) │    │   Frontend (React + Nginx)       │
│   - JWT Authentication  │    │   - SPA with client-side routing │
│   - Input Validation    │    │   - Nginx proxies /api to backend│
│   - Task CRUD           │    └──────────────────────────────────┘
│   - Redis queue push    │
└─────┬──────────┬────────┘
      │          │
┌─────▼────┐  ┌──▼──────────────────────────────┐
│  MongoDB │  │  Redis Queue                     │
│  (data)  │  │  task_queue (FIFO list)           │
└──────────┘  └──────────┬───────────────────────┘
                         │ BLPOP (blocking)
              ┌──────────▼──────────────┐
              │   Worker(s) (Python)    │
              │   - BLPOP from queue    │
              │   - Process operations  │
              │   - Update MongoDB      │
              │   - Scalable replicas   │
              └─────────────────────────┘
```

## 2. Worker Scaling Strategy

### Horizontal Scaling

Workers are stateless consumers of a shared Redis queue using `BLPOP`. This is inherently safe for horizontal scaling because:

1. **BLPOP is atomic** — Redis guarantees that a job popped by one worker is not visible to any other worker. No job duplication.
2. **No shared state** — Each worker connects independently to Redis and MongoDB. Adding replicas requires zero coordination.
3. **Kubernetes HPA** — A `HorizontalPodAutoscaler` is configured (see `infra/worker/hpa.yaml`) to scale from 2 to 10 replicas based on CPU utilization (target: 70%).

### Queue Depth Scaling (Advanced)

For production, a KEDA (Kubernetes Event-Driven Autoscaler) trigger on Redis list length would be ideal:

```yaml
triggers:
- type: redis
  metadata:
    address: redis:6379
    listName: task_queue
    listLength: "50"  # Scale up when queue has >50 items
```

## 3. Handling High Task Volume (100k tasks/day)

### Throughput Analysis

- 100k tasks/day = ~1.16 tasks/second average
- Each task takes ~2 seconds to process
- **Minimum workers needed**: 3 (to maintain throughput with headroom)
- **Peak capacity** (10 workers): ~5 tasks/second = 432k tasks/day

### Bottleneck Mitigation

| Layer | Strategy |
|---|---|
| **Redis** | Single-threaded but handles 100k+ ops/sec. Queue operations (LPUSH/BLPOP) are O(1). Not a bottleneck. |
| **MongoDB** | Write-heavy workload mitigated by compound indexes on `{userId, createdAt}` and `{status}`. Use `update_one` with `$set`/`$push` for atomic updates. |
| **Workers** | Scale horizontally. Each worker is independent. With 10 replicas, max throughput is ~432k tasks/day. |
| **Backend API** | Stateless. Scale to 2-4 replicas behind K8s Service load balancing. |

### Data Retention

For sustained 100k/day volume, implement a TTL index on completed tasks:
```javascript
taskSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
```

## 4. Database Indexing Strategy

```javascript
// User model
{ email: 1 }        // unique — login lookups
{ username: 1 }     // unique — registration checks

// Task model
{ userId: 1, createdAt: -1 }  // compound — user's task list, sorted by newest
{ status: 1 }                 // filter by status for dashboard stats & worker queries
```

**Why these indexes:**
- The compound `{userId, createdAt: -1}` covers the most frequent query: `Task.find({ userId }).sort({ createdAt: -1 })` — this is a covered index scan, zero collection scans.
- The `{status}` index supports the dashboard stats queries (`count where status=pending`, etc.) and any operational monitoring.

## 5. Handling Redis Failure

The system implements **graceful degradation**:

### Backend (Node.js)
- Redis connection is **optional**. If Redis is unavailable at startup, the server still starts and handles auth/CRUD.
- When a task is created and Redis is down, the task is saved to MongoDB with `status: pending` but **not queued**. A warning is logged.
- On Redis reconnection, a recovery job could re-queue all `pending` tasks.

### Worker (Python)
- Startup retry loop with exponential backoff (1s → 2s → 4s → ... → 30s max, 10 attempts).
- If Redis drops mid-operation, the worker catches the `RedisError`, waits 2 seconds, and attempts reconnection.
- Graceful shutdown via SIGTERM handler ensures in-flight tasks complete before the pod terminates.

### Recovery Pattern
```
1. Task created → saved to MongoDB (status: pending) + pushed to Redis
2. Redis fails → task exists in MongoDB but not in queue
3. Redis recovers → cron job: find all tasks with status=pending and no queue entry → re-push
```

## 6. Staging and Production Deployment

### Environment Separation

```
├── infra/
│   ├── base/              # Shared manifests (Deployments, Services)
│   ├── overlays/
│   │   ├── staging/       # Staging-specific patches (1 replica, debug logging)
│   │   └── production/    # Production patches (3 replicas, resource limits)
```

### Staging Environment
- **Namespace**: `ai-task-staging`
- **Replicas**: 1 per service (cost optimization)
- **Resource limits**: Halved compared to production
- **MongoDB**: Separate PVC, can be wiped for testing
- **Argo CD Application**: Points to `overlays/staging` directory

### Production Environment
- **Namespace**: `ai-task-production`
- **Replicas**: 2+ per service (HA)
- **HPA**: Workers scale 2-10 based on CPU
- **MongoDB**: PVC with backup CronJob
- **Secrets**: Managed via Sealed Secrets or external-secrets-operator
- **TLS**: cert-manager with Let's Encrypt
- **Argo CD Application**: Points to `overlays/production` with auto-sync enabled

### Deployment Flow
```
Developer pushes code → GitHub Actions CI →
  1. Lint all services
  2. Build Docker images
  3. Push to Docker Hub with git SHA tag
  4. Update image tags in infra/ manifests
  5. Commit to main branch
  → Argo CD detects change → syncs to K8s cluster
```

## 7. Security Architecture

| Layer | Mechanism |
|---|---|
| **Authentication** | JWT tokens (24h expiry), bcrypt password hashing (12 rounds) |
| **API Security** | Helmet middleware, CORS whitelist, rate limiting (50 req/15min auth, 100 req/15min global) |
| **Input Validation** | Joi schemas on all endpoints. Invalid operations are rejected with field-level errors. |
| **Container Security** | Non-root users in all Dockerfiles. Multi-stage builds minimize attack surface. |
| **Secrets** | Kubernetes Secrets (base64). No hardcoded credentials in code or docker-compose. |
| **Network** | ClusterIP services (not exposed). Only Ingress exposes HTTP/HTTPS. |
