# AI Task Processing Platform - Architecture Documentation

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NGINX INGRESS CONTROLLER                        │
│                    (TLS Termination, Routing)                           │
└─────────────────┬───────────────────────────────┬───────────────────────┘
                  │                               │
        / (root)  │                               │ /api/*
                  ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│      FRONTEND (React)        │    │    BACKEND (Node.js/Express)     │
│   - Vite + React 18          │    │   - REST API                     │
│   - Static assets            │    │   - JWT Authentication           │
│   - Port 80                  │    │   - Input Validation (Joi)       │
│                              │    │   - Rate Limiting                │
└──────────────────────────────┘    └────────────┬─────────────────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                                    ▼             ▼             ▼
                        ┌─────────────────┐  ┌──────────┐  ┌──────────┐
                        │  REDIS QUEUE    │  │ MongoDB  │  │ MongoDB  │
                        │  (task_queue)   │  │  Users   │  │  Tasks   │
                        │  - LPUSH/BRPOP  │  │          │  │          │
                        │  - Atomic ops   │  │          │  │          │
                        └────────┬────────┘  └──────────┘  └──────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ WORKER 1 │  │ WORKER 2 │  │ WORKER N │
            │ (Python) │  │ (Python) │  │ (Python) │
            │ - BRPOP  │  │ - BRPOP  │  │ - BRPOP  │
            │ - Process│  │ - Process│  │ - Process│
            └────┬─────┘  └────┬─────┘  └────┬─────┘
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   MongoDB    │
                        │ (Update Task)│
                        └──────────────┘
```

### Async Task Processing Flow

**Step 1: Task Submission**
```
User → Frontend → POST /api/tasks
  Body: { title, inputText, operation }
```

**Step 2: Backend Validation & Queueing**
```
Backend:
  1. Validate JWT token (401 if invalid)
  2. Validate input with Joi schema (400 if invalid)
  3. Create Task document in MongoDB:
     { userId, title, inputText, operation, status: "pending" }
  4. Push to Redis queue:
     LPUSH task_queue '{"taskId": "...", "operation": "...", "inputText": "..."}'
  5. Return 201 with task object
```

**Step 3: Worker Processing**
```
Worker (infinite loop):
  1. BRPOP task_queue 0  (blocking pop, timeout=0 = wait forever)
  2. Parse JSON payload
  3. Update MongoDB: status = "running"
  4. Execute operation:
     - uppercase: inputText.upper()
     - lowercase: inputText.lower()
     - reverse: inputText[::-1]
     - wordcount: len(inputText.split())
  5. Update MongoDB: status = "success", result = output
  6. Log completion
  7. Loop back to step 1
```

**Step 4: Result Retrieval**
```
User → Frontend → GET /api/tasks/:id
Backend:
  1. Validate JWT token
  2. Query MongoDB: findOne({ _id, userId })
  3. Return task with status and result
```

**Error Handling Flow**
```
If worker crashes during processing:
  - Task remains in "running" state
  - Admin endpoint /api/admin/requeue-stuck-tasks finds tasks
    with status="running" and updatedAt > 5 minutes ago
  - Re-queues them: LPUSH task_queue + update status="pending"
```

---

## 2. Worker Scaling Strategy

### Atomic Task Distribution

**Redis BRPOP Guarantees**:
- **Atomic Operation**: Only one worker receives each task
- **Blocking**: Workers wait idle (no CPU polling) until task arrives
- **FIFO Order**: Tasks processed in submission order
- **No Coordination**: Workers don't need to communicate with each other

**Example with 3 Workers**:
```
Redis Queue: [Task1, Task2, Task3, Task4, Task5]

Worker1: BRPOP → receives Task5 (rightmost)
Worker2: BRPOP → receives Task4
Worker3: BRPOP → receives Task3
Worker1: BRPOP → receives Task2 (finished Task5)
Worker2: BRPOP → receives Task1 (finished Task4)
```

### Horizontal Pod Autoscaler (HPA) Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Scaling Behavior**:
- **CPU < 70%**: No scaling
- **CPU > 70%**: Add replicas (up to 10)
- **CPU < 70% for 5 minutes**: Remove replicas (down to 2)
- **Scale-up**: Fast (30 seconds)
- **Scale-down**: Slow (5 minutes) to prevent flapping

### Capacity Planning

**Single Worker Performance**:
- Task processing time: ~10ms (string operations are fast)
- Throughput: 1000ms / 10ms = **100 tasks/second per worker**
- With 2 workers: **200 tasks/second** = **17.3 million tasks/day**

**100k Tasks/Day Scenario**:
- Average rate: 100,000 / 86,400 seconds = **1.16 tasks/second**
- Peak rate (assuming 10x spike): **11.6 tasks/second**
- Required workers at peak: 11.6 / 100 = **0.12 workers**
- **Conclusion**: 2 workers provide **200x headroom** at average load, **17x at peak**

**Why This Works**:
- String operations (uppercase, lowercase, reverse) are O(n) where n = string length
- Max input: 10,000 characters (enforced by Joi validation)
- Python string operations: ~1 microsecond per character
- 10,000 chars × 1μs = 10ms processing time
- Network + MongoDB I/O: ~5-10ms
- Total: ~15-20ms per task (conservative estimate)

---

## 3. Handling 100k Tasks/Day

### Throughput Analysis

**Daily Load Distribution**:
```
100,000 tasks/day
= 4,167 tasks/hour
= 69 tasks/minute
= 1.16 tasks/second (average)

Peak hour (10% of daily load in 1 hour):
= 10,000 tasks/hour
= 167 tasks/minute
= 2.78 tasks/second
```

**Component Capacity**:

| Component | Capacity | 100k/day Load | Headroom |
|-----------|----------|---------------|----------|
| Worker (2 replicas) | 200 tasks/sec | 1.16 tasks/sec | 172x |
| Redis LPUSH | 100,000 ops/sec | 1.16 ops/sec | 86,000x |
| MongoDB Writes | 10,000 writes/sec | 2.32 writes/sec | 4,300x |
| Backend API | 1,000 req/sec | 1.16 req/sec | 862x |

### MongoDB Write Throughput

**Write Operations per Task**:
1. Initial insert: `db.tasks.insertOne()` - 1 write
2. Status update (running): `db.tasks.updateOne()` - 1 write
3. Result update (success): `db.tasks.updateOne()` - 1 write
4. **Total: 3 writes per task**

**Daily Write Load**:
- 100,000 tasks × 3 writes = **300,000 writes/day**
- 300,000 / 86,400 seconds = **3.47 writes/second**

**MongoDB Capacity**:
- Single MongoDB instance: **10,000+ writes/second** (SSD storage)
- Our load: 3.47 writes/second
- **Utilization: 0.03%**

**Write Concern Strategy**:
```javascript
// For high throughput, use w:1 (acknowledge from primary only)
await task.save({ writeConcern: { w: 1 } });

// For critical operations (user registration), use w: "majority"
await user.save({ writeConcern: { w: "majority" } });
```

### Redis Memory Usage

**Job Payload Size**:
```json
{
  "taskId": "507f1f77bcf86cd799439011",  // 24 bytes
  "operation": "uppercase",               // 9 bytes
  "inputText": "..."                      // 1-10,000 bytes
}
```

**Memory Calculation**:
- Average input text: 500 characters
- JSON overhead: ~50 bytes
- **Average job size: ~600 bytes**

**Queue Depth Scenarios**:
- Normal (1 minute backlog): 70 tasks × 600 bytes = **42 KB**
- Peak (10 minute backlog): 700 tasks × 600 bytes = **420 KB**
- Extreme (1 hour backlog): 4,200 tasks × 600 bytes = **2.5 MB**
- Maximum (all 100k queued): 100,000 × 600 bytes = **60 MB**

**Redis Memory Allocation**:
- Deployed with 256 MB limit
- Queue usage: < 60 MB worst case
- **Utilization: < 25% even if all tasks queued**

### Bottleneck Identification

**At 100k tasks/day**: No bottlenecks

**At 1M tasks/day** (10x scale):
- Workers: 11.6 tasks/sec → need 1 worker (still 10x headroom)
- Redis: 11.6 ops/sec → no issue (100k ops/sec capacity)
- MongoDB: 34.7 writes/sec → no issue (10k writes/sec capacity)
- **Still no bottleneck**

**At 10M tasks/day** (100x scale):
- Workers: 116 tasks/sec → need 2 workers (still within capacity)
- Redis: 116 ops/sec → no issue
- MongoDB: 347 writes/sec → **potential bottleneck**
  - Solution: Enable sharding on `userId` field
  - Each shard handles 347 / N writes/sec

**First Real Bottleneck**: MongoDB write contention at **~30M tasks/day**
- 30M tasks × 3 writes = 90M writes/day = 1,042 writes/sec
- Approaching 10% of single instance capacity
- **Solution**: Shard MongoDB on `userId` (distributes writes)

### Monitoring Strategy

**Prometheus Metrics to Expose**:

```python
# Worker metrics
task_processing_duration_seconds = Histogram(
    'task_processing_duration_seconds',
    'Time spent processing tasks',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

task_processing_total = Counter(
    'task_processing_total',
    'Total tasks processed',
    ['operation', 'status']
)

redis_queue_depth = Gauge(
    'redis_queue_depth',
    'Number of tasks in Redis queue'
)

mongodb_write_errors_total = Counter(
    'mongodb_write_errors_total',
    'Total MongoDB write errors'
)
```

**Alerting Rules**:
```yaml
- alert: HighQueueDepth
  expr: redis_queue_depth > 1000
  for: 5m
  annotations:
    summary: "Redis queue depth > 1000 for 5 minutes"

- alert: HighTaskFailureRate
  expr: rate(task_processing_total{status="failed"}[5m]) > 0.1
  annotations:
    summary: "Task failure rate > 10%"

- alert: SlowTaskProcessing
  expr: histogram_quantile(0.95, task_processing_duration_seconds) > 1.0
  annotations:
    summary: "95th percentile task processing time > 1 second"
```

---

## 4. Database Indexing Strategy

### Users Collection

**Index 1: Email (Unique)**
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
```

**Purpose**: Login lookups
**Query**: `db.users.findOne({ email: "user@example.com" })`
**Performance**: O(log n) - Binary search on B-tree
**Cardinality**: High (every user has unique email)
**Size**: ~50 bytes per entry × 1M users = 50 MB

### Tasks Collection

**Index 1: Compound Index (userId + createdAt)**
```javascript
db.tasks.createIndex({ userId: 1, createdAt: -1 })
```

**Purpose**: User dashboard queries (fetch user's tasks sorted by date)
**Query**: `db.tasks.find({ userId: "..." }).sort({ createdAt: -1 })`
**ESR Rule Applied**:
- **E**quality: `userId` (exact match)
- **S**ort: `createdAt` (descending)
- **R**ange: None

**Performance**: O(log n + k) where k = results returned
**Why This Order**:
- Index scan finds all tasks for userId (equality)
- Results already sorted by createdAt (no in-memory sort)
- If reversed (createdAt, userId), would need to scan entire date range

**Index 2: Status (Single Field)**
```javascript
db.tasks.createIndex({ status: 1 })
```

**Purpose**: Worker queries for stuck tasks
**Query**: `db.tasks.find({ status: "pending" })`
**Cardinality**: Low (4 values: pending, running, success, failed)
**Selectivity**: High during normal operation (most tasks are "success")
**Size**: ~30 bytes per entry × 100k tasks = 3 MB

**Index 3: TTL Index (Auto-Cleanup)**
```javascript
db.tasks.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }  // 30 days
)
```

**Purpose**: Automatic deletion of old tasks
**Behavior**:
- MongoDB background thread checks every 60 seconds
- Deletes documents where `createdAt + 30 days < now`
- Prevents unbounded growth of tasks collection

**Storage Savings**:
- Without TTL: 100k tasks/day × 365 days = 36.5M tasks/year
- With TTL: Max 3M tasks (30 days × 100k/day)
- **Reduces storage by 92%**

### Index Size Calculation

**Total Index Size** (at 1M users, 3M tasks):
```
users.email:           50 MB
tasks.userId_createdAt: 90 MB  (compound index larger)
tasks.status:          3 MB
tasks.createdAt:       30 MB
─────────────────────────────
Total:                 173 MB
```

**RAM Requirement**:
- MongoDB keeps working set in RAM
- Indexes should fit in RAM for optimal performance
- 173 MB indexes + 200 MB working set = **400 MB RAM minimum**
- Deployed with 1 GB RAM = **2.5x headroom**

---

## 5. Redis Failure Handling

### Worker Retry Strategy

**Exponential Backoff Implementation**:
```python
def connect_redis_with_retry():
    retry_delay = 1  # Start with 1 second
    max_delay = 30   # Cap at 30 seconds
    
    while True:
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
            client.ping()
            return client
        except redis.ConnectionError as e:
            logger.error(f"Redis connection failed: {e}")
            logger.info(f"Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, max_delay)
```

**Retry Sequence**:
```
Attempt 1: Fail → Wait 1s
Attempt 2: Fail → Wait 2s
Attempt 3: Fail → Wait 4s
Attempt 4: Fail → Wait 8s
Attempt 5: Fail → Wait 16s
Attempt 6: Fail → Wait 30s (capped)
Attempt 7: Fail → Wait 30s
...continues until Redis recovers
```

**Why Exponential Backoff**:
- Prevents thundering herd (all workers reconnecting simultaneously)
- Reduces load on recovering Redis instance
- Gives time for Kubernetes to restart Redis pod

### Backend Failure Handling

**LPUSH Failure Response**:
```javascript
try {
  await redisClient.lPush('task_queue', jobPayload);
  res.status(201).json({ success: true, task });
} catch (error) {
  logger.error('Redis LPUSH failed:', error);
  
  // Task already saved in MongoDB with status="pending"
  // Can be re-queued later via admin endpoint
  
  res.status(503).json({
    success: false,
    error: 'Queue temporarily unavailable',
    message: 'Task saved but not queued. Will be processed when queue recovers.',
    taskId: task._id
  });
}
```

**User Experience**:
- Task is saved (not lost)
- User sees "queued" status
- Admin can manually re-queue via `/api/admin/requeue-stuck-tasks`

### Recovery Mechanisms

**Admin Endpoint for Re-Queueing**:
```javascript
// GET /api/admin/requeue-stuck-tasks
router.get('/requeue-stuck-tasks', async (req, res) => {
  // Find tasks stuck in "pending" or "running" for > 5 minutes
  const stuckTasks = await Task.find({
    status: { $in: ['pending', 'running'] },
    updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
  });
  
  let requeued = 0;
  for (const task of stuckTasks) {
    try {
      await redisClient.lPush('task_queue', JSON.stringify({
        taskId: task._id.toString(),
        operation: task.operation,
        inputText: task.inputText
      }));
      
      task.status = 'pending';
      await task.save();
      requeued++;
    } catch (error) {
      logger.error(`Failed to requeue task ${task._id}:`, error);
    }
  }
  
  res.json({ success: true, requeued });
});
```

### Redis Persistence Configuration

**AOF (Append-Only File) Persistence**:
```yaml
# infra/redis/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - --appendonly yes
        - --appendfsync everysec
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

**Persistence Guarantees**:
- `appendonly yes`: Every write logged to AOF file
- `appendfsync everysec`: Fsync every second (balance between durability and performance)
- **Data Loss Window**: Max 1 second of data if Redis crashes
- **Recovery Time**: Replays AOF on startup (~1 second per 10k operations)

**Trade-offs**:
- **With AOF**: Slower writes (~10% overhead), but data survives crashes
- **Without AOF**: Faster, but queue lost on crash (tasks stuck in "pending")
- **Decision**: Enable AOF because task loss is unacceptable

---

## 6. Staging vs Production Environments

### Argo CD ApplicationSet Configuration

**ApplicationSet for Multi-Environment**:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: ai-task-platform
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - env: staging
        namespace: ai-task-platform-staging
        replicaCount: "1"
        cpuLimit: "200m"
        memoryLimit: "256Mi"
        branch: staging
        autoSync: "true"
      - env: production
        namespace: ai-task-platform
        replicaCount: "2"
        cpuLimit: "500m"
        memoryLimit: "512Mi"
        branch: main
        autoSync: "false"
  
  template:
    metadata:
      name: 'ai-task-platform-{{env}}'
    spec:
      project: ai-task-platform
      source:
        repoURL: https://github.com/your-org/ai-task-platform
        targetRevision: '{{branch}}'
        path: infra
        helm:
          parameters:
          - name: replicaCount
            value: '{{replicaCount}}'
          - name: resources.limits.cpu
            value: '{{cpuLimit}}'
          - name: resources.limits.memory
            value: '{{memoryLimit}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: '{{autoSync}}'
```

### Environment Comparison

| Aspect | Staging | Production |
|--------|---------|------------|
| **Namespace** | `ai-task-platform-staging` | `ai-task-platform` |
| **Replicas** | 1 (all services) | 2+ (HA) |
| **CPU Limits** | 200m | 500m |
| **Memory Limits** | 256Mi | 512Mi |
| **Git Branch** | `staging` | `main` |
| **Auto-Sync** | Enabled | Disabled (manual approval) |
| **Ingress** | `staging.example.com` | `example.com` |
| **Database** | Shared dev MongoDB | Dedicated production MongoDB |
| **Secrets** | `staging-secrets` | `production-secrets` |
| **Monitoring** | Basic | Full (Prometheus + Grafana) |

### Image Promotion Workflow

**Step 1: Build & Push to Staging**
```yaml
# .github/workflows/ci-cd.yml
- name: Build and Push (Staging)
  if: github.ref == 'refs/heads/staging'
  run: |
    docker build -t ${{ secrets.DOCKER_REGISTRY }}/backend:staging-${{ github.sha }} .
    docker push ${{ secrets.DOCKER_REGISTRY }}/backend:staging-${{ github.sha }}
```

**Step 2: Deploy to Staging (Auto)**
- Argo CD detects new commit on `staging` branch
- Auto-syncs to `ai-task-platform-staging` namespace
- Runs smoke tests

**Step 3: Validate Staging**
```bash
# Automated tests
curl https://staging.example.com/api/health
# Expected: {"status": "ok"}

# Manual QA
# - Test registration
# - Test task creation
# - Verify worker processing
```

**Step 4: Promote to Production (Manual)**
```yaml
# .github/workflows/promote-to-prod.yml
name: Promote to Production
on:
  workflow_dispatch:
    inputs:
      staging_sha:
        description: 'Staging SHA to promote'
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
    - name: Re-tag Image
      run: |
        docker pull ${{ secrets.DOCKER_REGISTRY }}/backend:staging-${{ inputs.staging_sha }}
        docker tag ${{ secrets.DOCKER_REGISTRY }}/backend:staging-${{ inputs.staging_sha }} \
                   ${{ secrets.DOCKER_REGISTRY }}/backend:prod-${{ inputs.staging_sha }}
        docker push ${{ secrets.DOCKER_REGISTRY }}/backend:prod-${{ inputs.staging_sha }}
    
    - name: Create PR to Update Production
      run: |
        # Update infra/backend/deployment.yaml with new image tag
        # Create PR (requires manual review and approval)
```

**Step 5: Deploy to Production (Manual Sync)**
- PR merged to `main` branch
- Argo CD detects change but does NOT auto-sync (manual approval required)
- DevOps engineer reviews and clicks "Sync" in Argo CD UI
- Deployment rolls out with health checks

### Secrets Management

**Staging Secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: ai-task-platform-staging
type: Opaque
data:
  MONGO_URI: bW9uZ29kYjovL3N0YWdpbmctbW9uZ286MjcwMTcvYWl0YXNrcw==
  JWT_SECRET: c3RhZ2luZy1qd3Qtc2VjcmV0
  REDIS_HOST: cmVkaXMtc3RhZ2luZw==
```

**Production Secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: ai-task-platform
type: Opaque
data:
  MONGO_URI: bW9uZ29kYjovL3Byb2QtbW9uZ286MjcwMTcvYWl0YXNrcw==
  JWT_SECRET: cHJvZC1qd3Qtc2VjcmV0LXN1cGVyLXNlY3VyZQ==
  REDIS_HOST: cmVkaXMtcHJvZA==
```

**Best Practices**:
- Never commit secrets to Git
- Use Sealed Secrets or External Secrets Operator
- Rotate secrets every 90 days
- Different secrets per environment (prevent staging → prod leakage)

---

## Conclusion

This architecture is designed for:
- **Scalability**: Handles 100k tasks/day with 200x headroom
- **Reliability**: Redis persistence, exponential backoff, stuck task recovery
- **Performance**: Optimized indexes, efficient worker distribution
- **Maintainability**: Clear separation of concerns, comprehensive monitoring
- **Production-Ready**: Staging/production environments, manual promotion, secrets management

**Key Design Decisions**:
1. **Redis BRPOP**: Atomic task distribution without coordination overhead
2. **MongoDB Indexes**: ESR rule for optimal query performance
3. **HPA on CPU**: Simple, effective scaling trigger
4. **AOF Persistence**: Acceptable 1-second data loss window
5. **Manual Production Sync**: Prevents accidental deployments

**Future Enhancements** (beyond 100k tasks/day):
- MongoDB sharding on `userId` (at 30M tasks/day)
- Redis Cluster for queue distribution (at 1M ops/sec)
- Horizontal scaling of backend (currently single replica sufficient)
- Distributed tracing (OpenTelemetry) for end-to-end visibility
