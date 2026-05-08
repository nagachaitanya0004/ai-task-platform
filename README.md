# AI Task Processing Platform

A production-grade MERN + Python worker monorepo for asynchronous task processing with Kubernetes deployment, GitOps workflow, and comprehensive CI/CD pipeline.

## Architecture Overview

The AI Task Processing Platform is a distributed system that processes text transformation tasks asynchronously. Users submit tasks through a React frontend, which are queued in Redis and processed by horizontally-scalable Python workers. The system is designed to handle 100k+ tasks per day with automatic scaling, comprehensive monitoring, and production-grade reliability.

**Request Flow**: User → Nginx Ingress → Frontend (React) → Backend (Node.js) → Redis Queue → Worker Pool (Python) → MongoDB

### Service Architecture

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React 18 + Vite | 80 | User interface for task submission and monitoring |
| **Backend** | Node.js 20 + Express | 5000 | REST API with JWT auth, input validation, rate limiting |
| **Worker** | Python 3.11 | N/A | Background job processor (uppercase, lowercase, reverse, wordcount) |
| **MongoDB** | MongoDB 7 | 27017 | Persistent storage for users and tasks |
| **Redis** | Redis 7 Alpine | 6379 | Task queue with FIFO ordering and atomic operations |
| **Nginx Ingress** | Nginx | 80/443 | TLS termination, routing, load balancing |

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher ([Download](https://nodejs.org/))
- **Python**: v3.11 or higher ([Download](https://www.python.org/))
- **Docker**: v24.x or higher ([Download](https://www.docker.com/))
- **Docker Compose**: v2.x or higher (included with Docker Desktop)
- **kubectl**: v1.28 or higher ([Install Guide](https://kubernetes.io/docs/tasks/tools/))
- **k3s**: Lightweight Kubernetes (for production deployment)
- **Git**: v2.x or higher

### Optional Tools

- **Argo CD CLI**: For GitOps management ([Install Guide](https://argo-cd.readthedocs.io/en/stable/cli_installation/))
- **Helm**: v3.x for Kubernetes package management
- **k9s**: Terminal UI for Kubernetes ([Install](https://k9scli.io/))

### System Requirements

- **RAM**: 8 GB minimum (16 GB recommended)
- **CPU**: 4 cores minimum
- **Disk**: 20 GB free space
- **OS**: Linux, macOS, or Windows with WSL2

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ai-task-platform.git
cd ai-task-platform
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Variables** (see [Environment Variables](#environment-variables) section for full list):
```bash
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin
MONGO_URI=mongodb://admin:admin@mongo:27017/aitasks?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=yoursupersecretjwtkeyhere
CORS_ORIGIN=http://localhost:80
NODE_ENV=development
PORT=5000
```

### 3. Start All Services

```bash
# Build and start all containers
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f
```

**Expected Output**:
```
✅ MongoDB connected
✅ Redis connected
✅ Server running on port 5000 in development mode
✅ Frontend compiled successfully
✅ Worker started, waiting for tasks...
```

### 4. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:80 | React application |
| **Backend API** | http://localhost:5000 | REST API endpoints |
| **Health Check** | http://localhost:5000/api/health | Service status |
| **MongoDB** | mongodb://localhost:27017 | Database (use MongoDB Compass) |
| **Redis** | redis://localhost:6379 | Queue (use RedisInsight) |

### 5. Test the Application

**Register a User**:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**Create Task** (replace `<TOKEN>` with token from login):
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "title": "Convert to Uppercase",
    "inputText": "hello world",
    "operation": "uppercase"
  }'
```

### 6. Stop Services

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

---

## Kubernetes Deployment

### 1. Install k3s (Lightweight Kubernetes)

**On Linux/macOS**:
```bash
# Install k3s
curl -sfL https://get.k3s.io | sh -

# Verify installation
sudo k3s kubectl get nodes

# Set up kubeconfig for kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config
export KUBECONFIG=~/.kube/config

# Verify kubectl works
kubectl get nodes
```

**On Windows (WSL2)**:
```bash
# Install k3s in WSL2
curl -sfL https://get.k3s.io | sh -

# Configure kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config

# Verify
kubectl get nodes
```

### 2. Create Namespace

```bash
# Create ai-task-platform namespace
kubectl apply -f infra/namespace.yaml

# Verify namespace created
kubectl get namespaces
```

### 3. Deploy Secrets

```bash
# Create secrets (replace with your actual values)
kubectl create secret generic backend-secrets \
  --from-literal=MONGO_URI=mongodb://admin:admin@mongo:27017/aitasks?authSource=admin \
  --from-literal=JWT_SECRET=your-super-secret-jwt-key \
  --from-literal=REDIS_HOST=redis \
  --from-literal=REDIS_PORT=6379 \
  -n ai-task-platform

# Verify secrets created
kubectl get secrets -n ai-task-platform
```

### 4. Deploy Infrastructure

```bash
# Deploy all Kubernetes manifests
kubectl apply -f infra/configmap.yaml
kubectl apply -f infra/secret.yaml
kubectl apply -f infra/mongo/
kubectl apply -f infra/redis/
kubectl apply -f infra/backend/
kubectl apply -f infra/frontend/
kubectl apply -f infra/worker/
kubectl apply -f infra/ingress.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n ai-task-platform --timeout=300s
```

### 5. Install Argo CD

```bash
# Create argocd namespace
kubectl create namespace argocd

# Install Argo CD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for Argo CD to be ready
kubectl wait --for=condition=ready pod --all -n argocd --timeout=300s

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port-forward to access Argo CD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access Argo CD at https://localhost:8080
# Username: admin
# Password: (from command above)
```

### 6. Deploy Argo CD Application

```bash
# Apply Argo CD project and application
kubectl apply -f infra/argocd/project.yaml
kubectl apply -f infra/argocd/application.yaml

# Verify application created
kubectl get applications -n argocd

# Sync application (if not auto-synced)
argocd app sync ai-task-platform
```

### 7. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n ai-task-platform

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# mongo-xxxxxxxxxx-xxxxx      1/1     Running   0          2m
# redis-xxxxxxxxxx-xxxxx      1/1     Running   0          2m
# backend-xxxxxxxxxx-xxxxx    1/1     Running   0          2m
# frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# worker-xxxxxxxxxx-xxxxx     1/1     Running   0          2m

# Check services
kubectl get svc -n ai-task-platform

# Check ingress
kubectl get ingress -n ai-task-platform

# Test health endpoint
kubectl port-forward svc/backend -n ai-task-platform 5000:5000
curl http://localhost:5000/api/health
```

### 8. Access Application

**Option 1: Port Forwarding (Development)**:
```bash
# Forward frontend
kubectl port-forward svc/frontend -n ai-task-platform 8080:80

# Access at http://localhost:8080
```

**Option 2: Ingress (Production)**:
```bash
# Get ingress IP
kubectl get ingress -n ai-task-platform

# Add to /etc/hosts
echo "<INGRESS_IP> ai-task-platform.local" | sudo tee -a /etc/hosts

# Access at http://ai-task-platform.local
```

---

## CI/CD Setup

### GitHub Secrets Configuration

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| **DOCKER_USERNAME** | Docker Hub username for pushing images | `myusername` |
| **DOCKER_PASSWORD** | Docker Hub password or access token | `dckr_pat_xxxxxxxxxxxxx` |
| **KUBE_CONFIG** | Base64-encoded kubeconfig for kubectl access | `apiVersion: v1\nkind: Config...` |
| **INFRA_REPO_TOKEN** | GitHub Personal Access Token with repo write access | `ghp_xxxxxxxxxxxxxxxxxxxx` |

### Setting Up Secrets

**1. Docker Hub Credentials**:
```bash
# Create Docker Hub access token at https://hub.docker.com/settings/security
# Add as DOCKER_USERNAME and DOCKER_PASSWORD secrets
```

**2. Kubernetes Config**:
```bash
# Encode your kubeconfig
cat ~/.kube/config | base64 -w 0

# Add output as KUBE_CONFIG secret
```

**3. GitHub Token**:
```bash
# Create Personal Access Token at https://github.com/settings/tokens
# Scopes required: repo (full control)
# Add as INFRA_REPO_TOKEN secret
```

### Workflow Files

The repository includes three GitHub Actions workflows:

1. **`.github/workflows/ci-cd.yml`**: Main CI/CD pipeline
   - Lints code (ESLint, flake8)
   - Builds Docker images
   - Pushes to Docker Hub
   - Updates infrastructure repository with new image tags

2. **`.github/workflows/promote-to-prod.yml`**: Production promotion
   - Re-tags staging images for production
   - Creates PR to update production manifests

3. **`.github/workflows/test.yml`**: Automated testing
   - Runs unit tests
   - Runs integration tests

### Triggering Deployments

**Automatic Deployment (Staging)**:
```bash
# Push to staging branch
git checkout staging
git push origin staging

# GitHub Actions will:
# 1. Build images with tag: staging-<SHA>
# 2. Push to Docker Hub
# 3. Update infra repo
# 4. Argo CD auto-syncs to staging namespace
```

**Manual Deployment (Production)**:
```bash
# 1. Validate staging deployment
# 2. Go to GitHub Actions → Promote to Production
# 3. Enter staging SHA to promote
# 4. Workflow creates PR to update production
# 5. Review and merge PR
# 6. Manually sync in Argo CD UI
```

---

## Environment Variables

### Complete Variable Reference

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| **MONGO_INITDB_ROOT_USERNAME** | MongoDB root username | `admin` | Yes |
| **MONGO_INITDB_ROOT_PASSWORD** | MongoDB root password | `admin` | Yes |
| **MONGO_URI** | MongoDB connection string | `mongodb://admin:admin@mongo:27017/aitasks?authSource=admin` | Yes |
| **REDIS_HOST** | Redis hostname | `redis` | Yes |
| **REDIS_PORT** | Redis port | `6379` | Yes |
| **JWT_SECRET** | Secret key for JWT signing | `yoursupersecretjwtkeyhere` | Yes |
| **CORS_ORIGIN** | Allowed CORS origin | `http://localhost:80` | Yes |
| **NODE_ENV** | Node.js environment | `development` or `production` | Yes |
| **PORT** | Backend server port | `5000` | Yes |
| **VITE_API_URL** | Frontend API URL | `http://localhost:5000` | Yes (Frontend) |

### Environment-Specific Values

**Development (.env)**:
```bash
MONGO_URI=mongodb://admin:admin@mongo:27017/aitasks?authSource=admin
REDIS_HOST=redis
JWT_SECRET=dev-secret-key
CORS_ORIGIN=http://localhost:80
NODE_ENV=development
VITE_API_URL=http://localhost:5000
```

**Staging (Kubernetes Secret)**:
```bash
MONGO_URI=mongodb://staging-mongo:27017/aitasks?authSource=admin
REDIS_HOST=redis-staging
JWT_SECRET=staging-secret-key-change-me
CORS_ORIGIN=https://staging.example.com
NODE_ENV=production
```

**Production (Kubernetes Secret)**:
```bash
MONGO_URI=mongodb://prod-mongo:27017/aitasks?authSource=admin
REDIS_HOST=redis-prod
JWT_SECRET=prod-super-secure-secret-key
CORS_ORIGIN=https://example.com
NODE_ENV=production
```

---

## API Reference

### Authentication Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| **POST** | `/api/auth/register` | No | Register new user with username, email, password |
| **POST** | `/api/auth/login` | No | Login with email and password, returns JWT token |

### Task Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| **POST** | `/api/tasks` | Yes | Create new task (title, inputText, operation) |
| **GET** | `/api/tasks` | Yes | Get all tasks for authenticated user |
| **GET** | `/api/tasks/:id` | Yes | Get specific task by ID |

### Health Endpoint

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| **GET** | `/api/health` | No | Check service health (MongoDB, Redis status) |

### Admin Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| **GET** | `/api/admin/requeue-stuck-tasks` | Yes (Admin) | Re-queue tasks stuck in pending/running state |

### Detailed API Documentation

#### POST /api/auth/register

**Request**:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Password123"
}
```

**Validation Rules**:
- `username`: 3-30 alphanumeric characters
- `email`: Valid email format
- `password`: 8+ characters, at least 1 uppercase letter, 1 number

**Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

#### POST /api/auth/login

**Request**:
```json
{
  "email": "test@example.com",
  "password": "Password123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

#### POST /api/tasks

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request**:
```json
{
  "title": "Convert to Uppercase",
  "inputText": "hello world",
  "operation": "uppercase"
}
```

**Validation Rules**:
- `title`: 1-100 characters
- `inputText`: 1-10,000 characters
- `operation`: One of `uppercase`, `lowercase`, `reverse`, `wordcount`

**Response (201)**:
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "title": "Convert to Uppercase",
  "inputText": "hello world",
  "operation": "uppercase",
  "status": "pending",
  "result": null,
  "logs": [],
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### GET /api/tasks

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200)**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "title": "Convert to Uppercase",
    "inputText": "hello world",
    "operation": "uppercase",
    "status": "success",
    "result": "HELLO WORLD",
    "logs": ["Task started", "Processing complete"],
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:05.000Z"
  }
]
```

#### GET /api/health

**Response (200 - Healthy)**:
```json
{
  "status": "ok",
  "services": {
    "mongo": "up",
    "redis": "up"
  },
  "uptime": 12345.67,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response (503 - Degraded)**:
```json
{
  "status": "degraded",
  "services": {
    "mongo": "up",
    "redis": "down"
  },
  "uptime": 12345.67,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## Scaling the Worker

### Manual Scaling

**Scale Up**:
```bash
# Scale to 5 replicas
kubectl scale deployment worker --replicas=5 -n ai-task-platform

# Verify scaling
kubectl get pods -n ai-task-platform | grep worker
```

**Scale Down**:
```bash
# Scale to 2 replicas
kubectl scale deployment worker --replicas=2 -n ai-task-platform
```

### Automatic Scaling (HPA)

The worker deployment includes a Horizontal Pod Autoscaler (HPA) that automatically scales based on CPU usage:

**HPA Configuration**:
- **Min Replicas**: 2
- **Max Replicas**: 10
- **Target CPU**: 70%

**View HPA Status**:
```bash
# Check HPA status
kubectl get hpa -n ai-task-platform

# Watch HPA in real-time
kubectl get hpa -n ai-task-platform -w

# Describe HPA for details
kubectl describe hpa worker-hpa -n ai-task-platform
```

**Expected Output**:
```
NAME         REFERENCE           TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
worker-hpa   Deployment/worker   45%/70%   2         10        2          5m
```

### Load Testing

**Generate Load**:
```bash
# Install hey (HTTP load generator)
go install github.com/rakyll/hey@latest

# Generate 1000 requests
hey -n 1000 -c 10 -m POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Load Test","inputText":"test","operation":"uppercase"}' \
  http://localhost:5000/api/tasks

# Watch HPA scale up
kubectl get hpa -n ai-task-platform -w
```

### Monitoring Worker Performance

**View Worker Logs**:
```bash
# All worker pods
kubectl logs -l app=worker -n ai-task-platform --tail=100 -f

# Specific pod
kubectl logs worker-xxxxxxxxxx-xxxxx -n ai-task-platform -f
```

**Check Resource Usage**:
```bash
# CPU and memory usage
kubectl top pods -n ai-task-platform

# Detailed metrics
kubectl describe pod worker-xxxxxxxxxx-xxxxx -n ai-task-platform
```

---

## Troubleshooting

### Common Issues

**Issue: Pods not starting**
```bash
# Check pod status
kubectl get pods -n ai-task-platform

# Describe pod for events
kubectl describe pod <POD_NAME> -n ai-task-platform

# Check logs
kubectl logs <POD_NAME> -n ai-task-platform
```

**Issue: MongoDB connection failed**
```bash
# Check MongoDB pod
kubectl get pod -l app=mongo -n ai-task-platform

# Check MongoDB logs
kubectl logs -l app=mongo -n ai-task-platform

# Verify secret
kubectl get secret backend-secrets -n ai-task-platform -o yaml
```

**Issue: Redis connection failed**
```bash
# Check Redis pod
kubectl get pod -l app=redis -n ai-task-platform

# Test Redis connection
kubectl exec -it <REDIS_POD> -n ai-task-platform -- redis-cli ping
```

**Issue: Worker not processing tasks**
```bash
# Check worker logs
kubectl logs -l app=worker -n ai-task-platform

# Check Redis queue depth
kubectl exec -it <REDIS_POD> -n ai-task-platform -- redis-cli LLEN task_queue

# Manually trigger task processing
kubectl exec -it <REDIS_POD> -n ai-task-platform -- redis-cli LPUSH task_queue '{"taskId":"test","operation":"uppercase","inputText":"test"}'
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -n ai-task-platform

# Check events
kubectl get events -n ai-task-platform --sort-by='.lastTimestamp'

# Port forward to service
kubectl port-forward svc/backend -n ai-task-platform 5000:5000

# Execute command in pod
kubectl exec -it <POD_NAME> -n ai-task-platform -- /bin/sh

# View resource usage
kubectl top nodes
kubectl top pods -n ai-task-platform
```

---

## Submission Checklist

### Phase 1: Backend Development
- [x] Node.js backend with Express
- [x] MongoDB integration with Mongoose
- [x] User authentication with JWT
- [x] Task CRUD endpoints
- [x] Redis queue integration
- [x] Input validation with Joi
- [x] Rate limiting (global and auth-specific)
- [x] Helmet security headers
- [x] CORS configuration
- [x] Error handling middleware
- [x] Health check endpoint
- [x] Request logging with Morgan
- [x] MongoDB indexes (email, userId+createdAt, status)
- [x] Docker multi-stage build
- [x] Non-root user in container

### Phase 2: Worker Service
- [x] Python 3.11 worker
- [x] Redis BRPOP for task consumption
- [x] MongoDB connection with connection pooling
- [x] Task processing (uppercase, lowercase, reverse, wordcount)
- [x] Structured JSON logging
- [x] Exponential backoff retry for Redis
- [x] Graceful shutdown (SIGTERM/SIGINT)
- [x] Error handling with tracebacks
- [x] Docker multi-stage build
- [x] Non-root user in container

### Phase 3: Kubernetes Infrastructure
- [x] Namespace configuration
- [x] ConfigMap for environment variables
- [x] Secrets for sensitive data
- [x] MongoDB deployment with PVC
- [x] Redis deployment
- [x] Backend deployment (2 replicas)
- [x] Frontend deployment (2 replicas)
- [x] Worker deployment with HPA (2-10 replicas)
- [x] Services for all components
- [x] Ingress with TLS
- [x] Resource limits and requests
- [x] Health probes (liveness and readiness)
- [x] All manifests validated

### Phase 4: GitOps with Argo CD
- [x] Argo CD installation script
- [x] AppProject configuration
- [x] Application CRD with auto-sync
- [x] Prune and self-heal enabled
- [x] Retry policy configured
- [x] Documentation (README, SETUP, GITOPS_WORKFLOW)
- [x] Dashboard usage guide
- [x] Repository layout documentation

### Phase 5: CI/CD Pipeline
- [x] GitHub Actions workflow
- [x] Lint job (ESLint for Node.js/React, flake8 for Python)
- [x] Build and push job (Docker images)
- [x] Update infrastructure job (image tags)
- [x] Docker layer caching
- [x] Multi-platform builds
- [x] ESLint configurations
- [x] flake8 configuration

### Phase 6: Security Hardening
- [x] Input validation (Joi schemas)
- [x] Helmet security headers (explicit config)
- [x] Rate limiting (two tiers)
- [x] Request logging (Morgan)
- [x] Health endpoint with service checks
- [x] Global error handler
- [x] MongoDB indexes
- [x] CORS hardening
- [x] CSRF protection
- [x] Docker health check

### Phase 7: Documentation
- [x] ARCHITECTURE.md (system design, scaling, capacity planning)
- [x] README.md (setup, deployment, API reference)
- [x] SETUP_GUIDE.md (troubleshooting)
- [x] REGISTRATION_GUIDE.md (auth workflow)
- [x] QUICK_REFERENCE.md (API reference)
- [x] All issues documented and resolved

### Testing & Validation
- [x] All validation tests passing (21/21)
- [x] Syntax validation passing (5/5)
- [x] Zero vulnerabilities
- [x] Registration workflow tested
- [x] Login workflow tested
- [x] Task creation tested
- [x] Worker processing verified
- [x] Health checks verified

### Production Readiness
- [x] Environment variables configured
- [x] Secrets management
- [x] Staging and production environments
- [x] Manual production sync
- [x] Image promotion workflow
- [x] Monitoring strategy defined
- [x] Scaling strategy documented
- [x] Failure handling implemented

---

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/ai-task-platform/issues
- Documentation: See `/docs` directory
- Email: support@example.com

---

**Built with ❤️ by the AI Task Platform Team**
