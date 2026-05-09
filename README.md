# AI Task Processing Platform

A production-grade MERN + Python worker platform for asynchronous AI text processing, deployed with Docker, Kubernetes, and Argo CD GitOps.

## Features

- **JWT Authentication** — Secure registration and login with bcrypt password hashing
- **Task Processing** — Create tasks with operations: uppercase, lowercase, reverse, word count
- **Async Worker** — Python worker processes jobs from Redis queue in the background
- **Real-time Status** — Track task status (pending → running → success/failed) with live logs
- **Production Security** — Helmet, rate limiting, input validation, non-root containers

## Architecture

```
Frontend (React/Nginx) → Backend (Express) → MongoDB
                                           → Redis Queue → Python Worker(s)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed scaling strategy and design decisions.

## Quick Start — Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (running locally on port 27017)
- Redis (optional — app works without it for auth, task queuing disabled)

### 1. Backend

```bash
cd backend
npm install
cp ../.env.example .env  # Edit with your values
npm start
# Server starts on http://localhost:5001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

### 3. Worker (requires Redis)

```bash
cd worker
pip install -r requirements.txt
python main.py
```

## Docker Compose — Full Stack

```bash
docker compose up --build -d
# Frontend: http://localhost
# Backend API: http://localhost:5000
# Run tests:
./test.sh
```

## Kubernetes Deployment

### Prerequisites

- k3s or minikube cluster
- kubectl configured
- Argo CD installed

### Manual Deploy

```bash
kubectl apply -f infra/namespace.yaml
kubectl apply -f infra/secret.yaml
kubectl apply -f infra/configmap.yaml
kubectl apply -f infra/mongo/
kubectl apply -f infra/redis/
kubectl apply -f infra/backend/
kubectl apply -f infra/worker/
kubectl apply -f infra/frontend/
kubectl apply -f infra/ingress.yaml
```

### Argo CD Deploy

```bash
kubectl apply -f infra/argocd/project.yaml
kubectl apply -f infra/argocd/application.yaml
```

Argo CD will auto-sync all manifests from the `infra/` directory.

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. **Lint** — ESLint (backend/frontend), flake8 (worker)
2. **Build** — Multi-stage Docker builds for all 3 services
3. **Push** — Docker Hub with `latest` and git SHA tags
4. **Update** — Automatically updates image tags in K8s manifests
5. **Sync** — Argo CD detects the manifest change and deploys

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

## Project Structure

```
ai-task-platform/
├── backend/           # Express API server
│   ├── src/
│   │   ├── index.js          # Entry point
│   │   ├── routes/           # Auth and task routes
│   │   ├── models/           # Mongoose schemas
│   │   ├── middleware/       # Auth, validation, error handling
│   │   └── validators/       # Joi schemas
│   └── Dockerfile
├── frontend/          # React SPA
│   ├── src/
│   │   ├── pages/            # Login, Register, Dashboard, TaskDetail
│   │   ├── components/       # Navbar, TaskCard, badges
│   │   ├── context/          # AuthContext
│   │   └── api/              # Axios configuration
│   ├── nginx.conf            # Reverse proxy config
│   └── Dockerfile
├── worker/            # Python job processor
│   ├── main.py
│   └── Dockerfile
├── infra/             # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── ingress.yaml
│   ├── backend/       # Deployment + Service
│   ├── frontend/      # Deployment + Service
│   ├── worker/        # Deployment + HPA
│   ├── mongo/         # Deployment + Service + PVC
│   ├── redis/         # Deployment + Service
│   └── argocd/        # Application + Project
├── .github/workflows/ # CI/CD pipeline
├── docker-compose.yml
├── ARCHITECTURE.md
├── test.sh
└── README.md
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/tasks` | Yes | List user's tasks |
| POST | `/api/tasks` | Yes | Create new task |
| GET | `/api/tasks/:id` | Yes | Get task details + logs |
| GET | `/api/health` | No | Health check |

## Supported Operations

| Operation | Input | Output |
|---|---|---|
| `uppercase` | "hello world" | "HELLO WORLD" |
| `lowercase` | "HELLO WORLD" | "hello world" |
| `reverse` | "Hello World" | "dlroW olleH" |
| `wordcount` | "one two three" | 3 |

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 24-hour expiry
- Helmet security headers
- Rate limiting (50 auth requests / 15 min)
- Joi input validation on all endpoints
- Non-root Docker containers
- Kubernetes Secrets for credentials
