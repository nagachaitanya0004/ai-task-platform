# Argo CD Dashboard Guide - AI Task Platform

Complete guide to understanding and using the Argo CD dashboard for monitoring deployments.

## Dashboard Access

### Local Access (Port-Forward)

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then open: `https://localhost:8080`

### Remote Access (LoadBalancer)

```bash
kubectl get svc argocd-server -n argocd
```

Use the external IP/hostname from the output.

### Login

- **Username:** `admin`
- **Password:** (from initial setup)

---

## Dashboard Layout

### Top Navigation Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ Argo CD  [Logo]  Applications  Repositories  Settings  Help     │
└─────────────────────────────────────────────────────────────────┘
```

### Main Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ Applications                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ai-task-platform                                         │  │
│  │ ✅ Synced  ✅ Healthy                                    │  │
│  │ Repo: https://github.com/YOUR_ORG/ai-task-platform-infra│  │
│  │ Path: infra                                              │  │
│  │ Target: main                                             │  │
│  │ Last Sync: 2 minutes ago                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Application Card Details

### Status Indicators

#### Sync Status

| Status | Color | Meaning |
|--------|-------|---------|
| Synced | 🟢 Green | Cluster matches Git |
| OutOfSync | 🔴 Red | Cluster differs from Git |
| Syncing | 🟡 Yellow | Currently syncing |
| Unknown | ⚪ Gray | Status unknown |

#### Health Status

| Status | Color | Meaning |
|--------|-------|---------|
| Healthy | 🟢 Green | All resources healthy |
| Progressing | 🟡 Yellow | Resources being deployed |
| Degraded | 🔴 Red | Some resources unhealthy |
| Unknown | ⚪ Gray | Health unknown |
| Suspended | ⚪ Gray | Application suspended |

### Healthy Deployment Indicators

When deployment is successful, you should see:

```
┌─────────────────────────────────────────────────────────────────┐
│ ai-task-platform                                                │
│                                                                  │
│ Sync Status:   ✅ Synced (Green Button)                         │
│ Health Status: ✅ Healthy (Green)                               │
│                                                                  │
│ Repository:    https://github.com/YOUR_ORG/ai-task-platform-infra
│ Path:          infra                                            │
│ Target Rev:    main                                             │
│ Last Sync:     2 minutes ago                                    │
│ Sync Result:   Synced                                           │
│                                                                  │
│ Resources:     16 total                                         │
│ ├─ Synced:     16 ✅                                            │
│ ├─ OutOfSync:  0                                                │
│ └─ Error:      0                                                │
│                                                                  │
│ Pods:          9 total                                          │
│ ├─ Running:    9 ✅                                             │
│ ├─ Pending:    0                                                │
│ ├─ Failed:     0                                                │
│ └─ Unknown:    0                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resource Tree View

Click on the application card to see the resource tree.

### Healthy Resource Tree

```
ai-task-platform (Namespace) ✅
├─ argocd (Namespace) ✅
├─ ai-task-platform (Namespace) ✅
│  ├─ ConfigMap
│  │  └─ ai-task-config ✅
│  ├─ Secret
│  │  └─ ai-task-secret ✅
│  ├─ Deployment
│  │  ├─ mongo ✅
│  │  │  └─ Pod: mongo-xxxxx ✅ Running
│  │  ├─ redis ✅
│  │  │  └─ Pod: redis-xxxxx ✅ Running
│  │  ├─ backend ✅
│  │  │  ├─ Pod: backend-xxxxx ✅ Running
│  │  │  └─ Pod: backend-yyyyy ✅ Running
│  │  ├─ frontend ✅
│  │  │  ├─ Pod: frontend-xxxxx ✅ Running
│  │  │  └─ Pod: frontend-yyyyy ✅ Running
│  │  └─ worker ✅
│  │     ├─ Pod: worker-xxxxx ✅ Running
│  │     └─ Pod: worker-yyyyy ✅ Running
│  ├─ Service
│  │  ├─ mongo ✅
│  │  ├─ redis ✅
│  │  ├─ backend ✅
│  │  └─ frontend ✅
│  ├─ PersistentVolumeClaim
│  │  └─ mongo-pvc ✅
│  ├─ HorizontalPodAutoscaler
│  │  └─ worker-hpa ✅
│  └─ Ingress
│     └─ ai-task-ingress ✅
```

### Color Coding

- 🟢 **Green:** Resource is healthy and synced
- 🟡 **Yellow:** Resource is progressing (being deployed)
- 🔴 **Red:** Resource has errors or is unhealthy
- ⚪ **Gray:** Resource status unknown

---

## Detailed Application View

### Overview Tab

Shows:
- Application name
- Project
- Namespace
- Repository URL
- Path
- Target revision
- Sync policy
- Last sync time
- Sync result

### Resources Tab

Shows all resources with:
- Resource type (Deployment, Service, etc.)
- Resource name
- Namespace
- Sync status
- Health status
- Age

### Logs Tab

Shows:
- Sync operation logs
- Error messages
- Warnings
- Timestamps

### Events Tab

Shows:
- Recent events
- Sync events
- Error events
- Timestamps

---

## Sync Details

### Successful Sync

```
Sync Result: Synced
Sync Time: 2024-01-15 10:30:45 UTC
Duration: 45 seconds
Revision: abc1234def5678

Resources Synced:
✅ Namespace/ai-task-platform
✅ ConfigMap/ai-task-config
✅ Secret/ai-task-secret
✅ Deployment/mongo
✅ Deployment/redis
✅ Deployment/backend
✅ Deployment/frontend
✅ Deployment/worker
✅ Service/mongo
✅ Service/redis
✅ Service/backend
✅ Service/frontend
✅ PersistentVolumeClaim/mongo-pvc
✅ HorizontalPodAutoscaler/worker-hpa
✅ Ingress/ai-task-ingress
```

### Failed Sync

```
Sync Result: Failed
Sync Time: 2024-01-15 10:35:20 UTC
Duration: 30 seconds
Revision: abc1234def5678

Error:
❌ Deployment/backend: ImagePullBackOff
   - Image not found: REGISTRY/ai-task-backend:v1.0.0

Action:
1. Check image exists in registry
2. Update image tag in deployment.yaml
3. Push to Git
4. Argo CD will auto-retry
```

---

## Pod Status View

### Healthy Pods

```
Deployment: backend
├─ Pod: backend-5d8f8f8f8-xxxxx
│  Status: ✅ Running
│  Ready: 1/1
│  Restarts: 0
│  Age: 2 hours
│  IP: 10.42.0.10
│  Node: k3s-node-1
│
└─ Pod: backend-5d8f8f8f8-yyyyy
   Status: ✅ Running
   Ready: 1/1
   Restarts: 0
   Age: 2 hours
   IP: 10.42.0.11
   Node: k3s-node-2
```

### Pod Events

```
Pod: backend-5d8f8f8f8-xxxxx

Events:
✅ Created: 2 hours ago
✅ Started: 2 hours ago
✅ Ready: 2 hours ago
✅ Liveness probe passed: 1 hour ago
✅ Readiness probe passed: 1 hour ago
```

---

## Health Checks

### Liveness Probe Status

```
Deployment: backend
Container: backend
Liveness Probe: ✅ Passing
├─ Type: HTTP GET
├─ Path: /api/health
├─ Port: 5000
├─ Initial Delay: 20s
├─ Period: 10s
└─ Last Check: 30 seconds ago
```

### Readiness Probe Status

```
Deployment: backend
Container: backend
Readiness Probe: ✅ Passing
├─ Type: HTTP GET
├─ Path: /api/health
├─ Port: 5000
├─ Initial Delay: 10s
├─ Period: 5s
└─ Last Check: 5 seconds ago
```

---

## Screenshot Checklist

When taking screenshots for documentation, verify:

### ✅ Top Status Bar
- [ ] Application name visible: `ai-task-platform`
- [ ] Sync status button shows: `Synced` (green)
- [ ] Health status shows: `Healthy` (green)
- [ ] No error messages or warnings

### ✅ Application Card
- [ ] Repository URL correct
- [ ] Path shows: `infra`
- [ ] Target revision shows: `main`
- [ ] Last sync time is recent (within 3 minutes)
- [ ] Sync result shows: `Synced`

### ✅ Resource Tree
- [ ] Namespace expanded showing all resources
- [ ] All resources have green checkmarks
- [ ] No red X marks or warnings
- [ ] All pods show as Running
- [ ] Pod count matches expected (9 total)

### ✅ Pod Status
- [ ] MongoDB pod: Running ✅
- [ ] Redis pod: Running ✅
- [ ] Backend pods (2): Running ✅
- [ ] Frontend pods (2): Running ✅
- [ ] Worker pods (2): Running ✅
- [ ] All pods have Ready: 1/1
- [ ] All pods have Restarts: 0

### ✅ Sync Details
- [ ] Sync result: `Synced`
- [ ] All resources synced successfully
- [ ] No errors or warnings
- [ ] Sync duration reasonable (< 2 minutes)

### ✅ Health Indicators
- [ ] All deployments healthy
- [ ] All services healthy
- [ ] All pods healthy
- [ ] No pending or failed resources

---

## Common Dashboard Views

### View 1: Application List

Shows all applications with their sync and health status.

```
Applications

┌─────────────────────────────────────────────────────────────────┐
│ Name                  Sync Status    Health Status   Last Sync  │
├─────────────────────────────────────────────────────────────────┤
│ ai-task-platform      ✅ Synced      ✅ Healthy      2 min ago  │
│ monitoring            ✅ Synced      ✅ Healthy      5 min ago  │
│ logging               ✅ Synced      ✅ Healthy      10 min ago │
└─────────────────────────────────────────────────────────────────┘
```

### View 2: Application Details

Shows detailed information about a single application.

```
ai-task-platform

Status:
├─ Sync Status: ✅ Synced
├─ Health Status: ✅ Healthy
├─ Last Sync: 2 minutes ago
└─ Sync Result: Synced

Configuration:
├─ Repository: https://github.com/YOUR_ORG/ai-task-platform-infra
├─ Path: infra
├─ Target Revision: main
└─ Sync Policy: Automated

Resources:
├─ Total: 16
├─ Synced: 16 ✅
├─ OutOfSync: 0
└─ Error: 0

Pods:
├─ Total: 9
├─ Running: 9 ✅
├─ Pending: 0
├─ Failed: 0
└─ Unknown: 0
```

### View 3: Resource Tree

Shows hierarchical view of all resources.

```
ai-task-platform
├─ Namespace ✅
├─ ConfigMap ✅
├─ Secret ✅
├─ Deployment (mongo) ✅
│  └─ Pod ✅
├─ Deployment (redis) ✅
│  └─ Pod ✅
├─ Deployment (backend) ✅
│  ├─ Pod ✅
│  └─ Pod ✅
├─ Deployment (frontend) ✅
│  ├─ Pod ✅
│  └─ Pod ✅
├─ Deployment (worker) ✅
│  ├─ Pod ✅
│  └─ Pod ✅
├─ Service (mongo) ✅
├─ Service (redis) ✅
├─ Service (backend) ✅
├─ Service (frontend) ✅
├─ PersistentVolumeClaim ✅
├─ HorizontalPodAutoscaler ✅
└─ Ingress ✅
```

---

## Monitoring Tips

### Real-Time Monitoring

1. Open Argo CD dashboard
2. Click on `ai-task-platform` application
3. Watch the resource tree update in real-time
4. Monitor pod status changes

### Checking Sync Status

```bash
# CLI command
kubectl get application ai-task-platform -n argocd

# Expected output
NAME                  SYNC STATUS   HEALTH STATUS   REPO                                                    PATH   TARGET
ai-task-platform      Synced        Healthy         https://github.com/YOUR_ORG/ai-task-platform-infra      infra  main
```

### Viewing Logs

1. Click on application
2. Go to "Logs" tab
3. View sync operation logs
4. Check for errors or warnings

### Checking Events

1. Click on application
2. Go to "Events" tab
3. View recent events
4. Check timestamps and status

---

## Troubleshooting Dashboard Issues

### Application Not Showing

```bash
# Check if application exists
kubectl get application -n argocd

# Check application status
kubectl describe application ai-task-platform -n argocd
```

### Sync Status Not Updating

```bash
# Force sync
argocd app sync ai-task-platform

# Check controller logs
kubectl logs -f deployment/argocd-application-controller -n argocd
```

### Health Status Showing Degraded

```bash
# Check resource status
kubectl get all -n ai-task-platform

# Check pod events
kubectl describe pod <POD_NAME> -n ai-task-platform

# Check pod logs
kubectl logs <POD_NAME> -n ai-task-platform
```

---

## Summary

✅ Dashboard provides real-time visibility  
✅ Color-coded status indicators  
✅ Resource tree shows all deployed resources  
✅ Sync details show operation history  
✅ Pod status shows container health  
✅ Easy troubleshooting with logs and events  

**Key Indicators for Healthy Deployment:**
- Sync Status: 🟢 Synced
- Health Status: 🟢 Healthy
- All Resources: 🟢 Green
- All Pods: 🟢 Running
- No Errors: ✅

---

**Status:** ✅ Dashboard Ready  
**Refresh Rate:** Real-time  
**Update Interval:** 3 seconds
