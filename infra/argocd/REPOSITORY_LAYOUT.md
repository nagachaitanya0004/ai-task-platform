# Repository Layout Guide - Argo CD Integration

Complete guide to organizing the infra repository for optimal Argo CD integration.

## Repository Structure

The infra repository should be organized as follows:

```
ai-task-platform-infra/
│
├── README.md                          # Repository overview
├── .gitignore                         # Git ignore rules
├── CHANGELOG.md                       # Change log
│
├── infra/                             # Main deployment directory (Argo CD source path)
│   │
│   ├── README.md                      # Deployment documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   ├── VALIDATION_REPORT.md           # Validation results
│   ├── MANIFEST_INDEX.md              # Manifest index
│   ├── VALIDATION_SUMMARY.md          # Validation summary
│   ├── FILE_INDEX.md                  # File index
│   │
│   ├── namespace.yaml                 # Kubernetes namespace
│   ├── configmap.yaml                 # Environment variables
│   ├── secret.yaml                    # Secrets (base64-encoded)
│   │
│   ├── mongo/                         # MongoDB manifests
│   │   ├── deployment.yaml            # MongoDB deployment
│   │   ├── service.yaml               # MongoDB service
│   │   └── pvc.yaml                   # MongoDB persistent volume
│   │
│   ├── redis/                         # Redis manifests
│   │   ├── deployment.yaml            # Redis deployment
│   │   └── service.yaml               # Redis service
│   │
│   ├── backend/                       # Backend manifests
│   │   ├── deployment.yaml            # Backend deployment
│   │   └── service.yaml               # Backend service
│   │
│   ├── frontend/                      # Frontend manifests
│   │   ├── deployment.yaml            # Frontend deployment
│   │   └── service.yaml               # Frontend service
│   │
│   ├── worker/                        # Worker manifests
│   │   ├── deployment.yaml            # Worker deployment
│   │   └── hpa.yaml                   # Worker autoscaler
│   │
│   ├── ingress.yaml                   # Ingress configuration
│   │
│   └── argocd/                        # Argo CD configuration
│       ├── project.yaml               # AppProject manifest
│       ├── application.yaml           # Application manifest
│       ├── kustomization.yaml         # Kustomization file
│       ├── SETUP.md                   # Argo CD setup guide
│       ├── GITOPS_WORKFLOW.md         # GitOps workflow guide
│       └── DASHBOARD_GUIDE.md         # Dashboard guide
│
└── docs/                              # Additional documentation
    ├── architecture.md                # Architecture overview
    ├── troubleshooting.md             # Troubleshooting guide
    └── faq.md                         # Frequently asked questions
```

---

## How Argo CD Discovers Manifests

### Step 1: Repository Cloning

Argo CD clones the repository specified in `application.yaml`:

```yaml
source:
  repoURL: https://github.com/YOUR_ORG/ai-task-platform-infra
  targetRevision: main
```

### Step 2: Path Navigation

Argo CD navigates to the path specified:

```yaml
source:
  path: infra
```

This means Argo CD looks in the `infra/` directory.

### Step 3: Manifest Discovery

Argo CD recursively discovers all YAML files in the path:

```
infra/
├── namespace.yaml          ✅ Found
├── configmap.yaml          ✅ Found
├── secret.yaml             ✅ Found
├── mongo/
│   ├── deployment.yaml     ✅ Found
│   ├── service.yaml        ✅ Found
│   └── pvc.yaml            ✅ Found
├── redis/
│   ├── deployment.yaml     ✅ Found
│   └── service.yaml        ✅ Found
├── backend/
│   ├── deployment.yaml     ✅ Found
│   └── service.yaml        ✅ Found
├── frontend/
│   ├── deployment.yaml     ✅ Found
│   └── service.yaml        ✅ Found
├── worker/
│   ├── deployment.yaml     ✅ Found
│   └── hpa.yaml            ✅ Found
├── ingress.yaml            ✅ Found
└── argocd/
    ├── project.yaml        ✅ Found
    ├── application.yaml    ✅ Found
    └── kustomization.yaml  ✅ Found
```

### Step 4: Manifest Processing

Argo CD processes manifests in the following order:

1. **Kustomization Detection:** If `kustomization.yaml` exists, Argo CD uses Kustomize
2. **Helm Detection:** If `Chart.yaml` exists, Argo CD uses Helm
3. **Plain YAML:** Otherwise, Argo CD treats files as plain Kubernetes manifests

### Step 5: Deployment

Argo CD applies all discovered manifests to the cluster:

```
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f mongo/deployment.yaml
kubectl apply -f mongo/service.yaml
... (all other manifests)
```

---

## Manifest Organization Best Practices

### 1. Logical Grouping

Group related manifests in directories:

```
infra/
├── mongo/          # All MongoDB-related manifests
├── redis/          # All Redis-related manifests
├── backend/        # All Backend-related manifests
├── frontend/       # All Frontend-related manifests
└── worker/         # All Worker-related manifests
```

### 2. Naming Conventions

Use consistent naming:

```
deployment.yaml    # Deployment resource
service.yaml       # Service resource
pvc.yaml          # PersistentVolumeClaim resource
hpa.yaml          # HorizontalPodAutoscaler resource
configmap.yaml    # ConfigMap resource
secret.yaml       # Secret resource
```

### 3. File Organization

Keep related resources together:

```
backend/
├── deployment.yaml    # Deployment definition
└── service.yaml       # Service definition
```

### 4. Documentation

Include documentation files:

```
infra/
├── README.md                  # Overview
├── DEPLOYMENT.md              # Deployment guide
├── VALIDATION_REPORT.md       # Validation results
└── argocd/
    ├── SETUP.md               # Argo CD setup
    ├── GITOPS_WORKFLOW.md     # GitOps workflow
    └── DASHBOARD_GUIDE.md     # Dashboard guide
```

---

## Kustomization Integration

### Using Kustomization

If you want to use Kustomize for overlays:

```
infra/
├── base/
│   ├── mongo/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── redis/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── worker/
│   │   ├── deployment.yaml
│   │   └── hpa.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── ingress.yaml
│   └── kustomization.yaml
│
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patches/
    │       └── replicas.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    │       └── replicas.yaml
    └── prod/
        ├── kustomization.yaml
        └── patches/
            └── replicas.yaml
```

### Kustomization File Example

```yaml
# infra/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ai-task-platform

resources:
- namespace.yaml
- configmap.yaml
- secret.yaml
- mongo/deployment.yaml
- mongo/service.yaml
- mongo/pvc.yaml
- redis/deployment.yaml
- redis/service.yaml
- backend/deployment.yaml
- backend/service.yaml
- frontend/deployment.yaml
- frontend/service.yaml
- worker/deployment.yaml
- worker/hpa.yaml
- ingress.yaml
```

---

## Helm Integration

### Using Helm Charts

If you want to use Helm:

```
infra/
├── charts/
│   ├── ai-task-platform/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   ├── templates/
│   │   │   ├── namespace.yaml
│   │   │   ├── configmap.yaml
│   │   │   ├── secret.yaml
│   │   │   ├── mongo/
│   │   │   ├── redis/
│   │   │   ├── backend/
│   │   │   ├── frontend/
│   │   │   ├── worker/
│   │   │   └── ingress.yaml
│   │   └── values/
│   │       ├── dev.yaml
│   │       ├── staging.yaml
│   │       └── prod.yaml
│   └── ...
```

### Argo CD Helm Configuration

```yaml
# application.yaml
source:
  repoURL: https://github.com/YOUR_ORG/ai-task-platform-infra
  targetRevision: main
  path: infra/charts/ai-task-platform
  helm:
    releaseName: ai-task-platform
    values: |
      replicas: 2
      image:
        tag: v1.0.0
```

---

## Multi-Environment Setup

### Directory Structure

```
infra/
├── base/                      # Base manifests
│   ├── mongo/
│   ├── redis/
│   ├── backend/
│   ├── frontend/
│   ├── worker/
│   └── kustomization.yaml
│
└── overlays/                  # Environment-specific overlays
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patches/
    │       ├── replicas.yaml
    │       └── resources.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    │       ├── replicas.yaml
    │       └── resources.yaml
    └── prod/
        ├── kustomization.yaml
        └── patches/
            ├── replicas.yaml
            └── resources.yaml
```

### Multiple Applications

Create separate applications for each environment:

```bash
# dev environment
kubectl apply -f infra/argocd/application-dev.yaml

# staging environment
kubectl apply -f infra/argocd/application-staging.yaml

# production environment
kubectl apply -f infra/argocd/application-prod.yaml
```

Each application points to different overlay:

```yaml
# application-dev.yaml
source:
  path: infra/overlays/dev

# application-staging.yaml
source:
  path: infra/overlays/staging

# application-prod.yaml
source:
  path: infra/overlays/prod
```

---

## Git Workflow

### Branch Strategy

```
main (production)
  ↓
staging (staging environment)
  ↓
develop (development environment)
```

### Argo CD Application Mapping

```
develop branch  → dev environment    → infra/overlays/dev
staging branch  → staging environment → infra/overlays/staging
main branch     → prod environment   → infra/overlays/prod
```

### Making Changes

```bash
# Create feature branch
git checkout -b feature/update-backend

# Make changes
vim infra/base/backend/deployment.yaml

# Commit and push
git add infra/base/backend/deployment.yaml
git commit -m "Update backend image"
git push origin feature/update-backend

# Create pull request
# After review and approval, merge to develop

# Argo CD automatically syncs dev environment
# After testing, merge to staging
# Argo CD automatically syncs staging environment
# After approval, merge to main
# Argo CD automatically syncs production environment
```

---

## Argo CD Sync Behavior

### Auto-Sync Process

1. **Repository Polling:** Argo CD polls the repository every 3 minutes (default)
2. **Change Detection:** Argo CD detects changes in the specified path
3. **Manifest Comparison:** Argo CD compares Git manifests with cluster state
4. **Sync Decision:** If different, Argo CD initiates sync
5. **Resource Application:** Argo CD applies manifests to cluster
6. **Status Update:** Argo CD updates application status

### Sync Timeline

```
Time    Event
────────────────────────────────────────────────────────
00:00   Developer pushes to main branch
00:00   Git webhook triggers (if configured)
00:00   Argo CD receives webhook notification
00:00   Argo CD starts sync immediately
00:30   Sync completes
00:30   Application status: Synced ✅

OR (without webhook)

00:00   Developer pushes to main branch
03:00   Argo CD polls repository
03:00   Argo CD detects changes
03:00   Argo CD starts sync
03:30   Sync completes
03:30   Application status: Synced ✅
```

### Webhook Configuration

For instant sync (instead of 3-minute polling):

1. Get Argo CD webhook URL:
```bash
kubectl get svc argocd-server -n argocd
```

2. Add webhook to GitHub:
   - Settings → Webhooks → Add webhook
   - Payload URL: `https://<ARGOCD_URL>/api/webhook`
   - Content type: `application/json`
   - Events: `Push events`

3. Argo CD will sync immediately on push

---

## Manifest Validation

### Pre-Commit Validation

```bash
# Validate YAML syntax
kubectl apply -f infra/ --dry-run=client

# Validate with Kustomize
kustomize build infra/ --dry-run=client

# Validate with Helm
helm template ai-task-platform infra/charts/ai-task-platform --dry-run
```

### Pre-Push Validation

Add git pre-push hook:

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Validating manifests..."
kubectl apply -f infra/ --dry-run=client || exit 1
echo "✅ Manifests valid"
```

---

## Troubleshooting

### Manifests Not Found

**Problem:** Argo CD shows "No resources found"

**Solution:**
1. Check path in `application.yaml`
2. Verify manifests exist in that path
3. Check file extensions (must be `.yaml` or `.yml`)
4. Verify YAML syntax

### Sync Failures

**Problem:** Argo CD shows "Sync failed"

**Solution:**
1. Check application logs: `kubectl describe application ai-task-platform -n argocd`
2. Check controller logs: `kubectl logs -f deployment/argocd-application-controller -n argocd`
3. Validate manifests locally
4. Check resource quotas and limits

### Out of Sync

**Problem:** Argo CD shows "OutOfSync"

**Solution:**
1. Manual sync: `argocd app sync ai-task-platform`
2. Check for manual cluster changes
3. Verify Git repository is up to date
4. Check for resource conflicts

---

## Summary

✅ Repository organized for Argo CD  
✅ Manifests discoverable and deployable  
✅ Multi-environment support  
✅ Git-based workflow  
✅ Auto-sync enabled  
✅ Webhook integration available  

**Key Points:**
- Argo CD looks in `infra/` directory
- All YAML files are discovered recursively
- Kustomization and Helm supported
- Changes auto-sync within 3 minutes
- Webhook enables instant sync
- Git is single source of truth

---

**Status:** ✅ Repository Ready  
**Sync Interval:** 3 minutes (default)  
**Webhook:** Optional (for instant sync)
