# Argo CD Integration - AI Task Platform

Complete GitOps setup for managing AI Task Platform deployments using Argo CD.

## Overview

Argo CD is a declarative, GitOps continuous delivery tool for Kubernetes. This setup enables:

- ✅ **Git as Single Source of Truth:** All infrastructure defined in Git
- ✅ **Automatic Sync:** Changes in Git automatically deployed to cluster
- ✅ **Declarative Management:** Define desired state, Argo CD ensures compliance
- ✅ **Audit Trail:** All changes tracked in Git history
- ✅ **Easy Rollback:** Revert to any previous state via Git
- ✅ **Multi-Environment:** Support for dev, staging, and production

## Quick Start

### 1. Automated Installation (Recommended)

```bash
# Make script executable
chmod +x infra/argocd/install.sh

# Run installation script
./infra/argocd/install.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Create argocd namespace
- ✅ Install Argo CD
- ✅ Wait for pods to be ready
- ✅ Expose Argo CD server
- ✅ Get admin password
- ✅ Create AppProject
- ✅ Create Application
- ✅ Verify deployment

### 2. Manual Installation

Follow the step-by-step guide in [SETUP.md](SETUP.md).

### 3. Access Argo CD Dashboard

```bash
# Port-forward to Argo CD server
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Open browser
https://localhost:8080

# Login
Username: admin
Password: (from installation output)
```

## Files Included

### Configuration Files

- **project.yaml** - Argo CD AppProject (defines project scope)
- **application.yaml** - Argo CD Application (defines deployment)
- **kustomization.yaml** - Kustomization file (organizes manifests)

### Documentation

- **SETUP.md** - Complete installation and setup guide
- **GITOPS_WORKFLOW.md** - GitOps workflow and best practices
- **DASHBOARD_GUIDE.md** - Dashboard usage and monitoring
- **REPOSITORY_LAYOUT.md** - Repository organization guide
- **README.md** - This file

### Installation

- **install.sh** - Automated installation script

## Repository Structure

```
infra/
├── namespace.yaml
├── configmap.yaml
├── secret.yaml
├── mongo/
├── redis/
├── backend/
├── frontend/
├── worker/
├── ingress.yaml
└── argocd/                    ← You are here
    ├── project.yaml
    ├── application.yaml
    ├── kustomization.yaml
    ├── install.sh
    ├── SETUP.md
    ├── GITOPS_WORKFLOW.md
    ├── DASHBOARD_GUIDE.md
    ├── REPOSITORY_LAYOUT.md
    └── README.md
```

## How It Works

### 1. Git Push

```bash
# Make changes to manifests
vim infra/backend/deployment.yaml

# Commit and push
git add infra/backend/deployment.yaml
git commit -m "Update backend image"
git push origin main
```

### 2. Argo CD Detects Change

Argo CD polls the repository every 3 minutes (or immediately via webhook):

```
Git Repository
    ↓
Argo CD (polls/webhook)
    ↓
Detects changes
```

### 3. Automatic Sync

Argo CD automatically syncs the cluster to match Git:

```
Git State
    ↓
Argo CD Sync
    ↓
Kubernetes Cluster Updated
```

### 4. Verification

Check the Argo CD dashboard to verify sync:

```
Application Status: ✅ Synced
Health Status: ✅ Healthy
All Resources: ✅ Green
```

## Key Concepts

### AppProject

Defines the scope of the Argo CD project:
- Source repositories
- Destination clusters
- Allowed resources

### Application

Defines a deployment:
- Source repository and path
- Destination cluster and namespace
- Sync policy (automated, manual, etc.)

### Sync Policy

Controls how Argo CD syncs:
- **Automated:** Auto-sync on Git changes
- **Manual:** Require manual sync trigger
- **Prune:** Delete resources not in Git
- **Self-Heal:** Revert manual cluster changes

## Common Tasks

### Update Backend Image

```bash
# Edit deployment
vim infra/backend/deployment.yaml
# Change image tag

# Commit and push
git add infra/backend/deployment.yaml
git commit -m "Update backend to v1.1.0"
git push origin main

# Argo CD auto-syncs within 3 minutes
```

### Scale Worker Replicas

```bash
# Edit HPA
vim infra/worker/hpa.yaml
# Change maxReplicas

# Commit and push
git add infra/worker/hpa.yaml
git commit -m "Increase worker max replicas"
git push origin main

# Argo CD auto-syncs
```

### Rollback Deployment

```bash
# Revert to previous commit
git revert <COMMIT_HASH>
git push origin main

# Argo CD auto-syncs to previous state
```

## Monitoring

### Check Application Status

```bash
kubectl get application ai-task-platform -n argocd
```

### Watch Sync Progress

```bash
kubectl get application ai-task-platform -n argocd -w
```

### View Detailed Status

```bash
kubectl describe application ai-task-platform -n argocd
```

### Check Pod Status

```bash
kubectl get pods -n ai-task-platform
```

## Troubleshooting

### Application Not Syncing

```bash
# Check application status
kubectl describe application ai-task-platform -n argocd

# Check controller logs
kubectl logs -f deployment/argocd-application-controller -n argocd

# Manual sync
argocd app sync ai-task-platform
```

### Repository Access Issues

```bash
# Check repository credentials
kubectl get secrets -n argocd | grep repo

# Test repository access
argocd repo list
```

### Sync Failures

```bash
# Check sync result
kubectl get application ai-task-platform -n argocd -o jsonpath='{.status.operationState.message}'

# View detailed error
kubectl describe application ai-task-platform -n argocd | grep -A 10 "Conditions:"
```

## Best Practices

### 1. Use Git Branches

```bash
# Feature branch for changes
git checkout -b feature/update-backend

# Make changes
vim infra/backend/deployment.yaml

# Create pull request for review
# After approval, merge to main
```

### 2. Test Changes Locally

```bash
# Validate YAML before pushing
kubectl apply -f infra/ --dry-run=client
```

### 3. Document Changes

```bash
# Update CHANGELOG
echo "- Updated backend to v1.1.0" >> CHANGELOG.md

# Commit with documentation
git add CHANGELOG.md
git commit -m "docs: Update changelog"
git push origin main
```

### 4. Monitor Deployments

```bash
# Watch sync progress
kubectl get application ai-task-platform -n argocd -w

# Check pod status
kubectl get pods -n ai-task-platform -w
```

### 5. Use Semantic Versioning

```bash
# Good commit messages
git commit -m "feat: Update backend to v1.1.0"
git commit -m "fix: Increase MongoDB memory limit"
git commit -m "chore: Update dependencies"
```

## Advanced Configuration

### Multi-Environment Setup

Create separate applications for dev, staging, and production:

```bash
kubectl apply -f infra/argocd/application-dev.yaml
kubectl apply -f infra/argocd/application-staging.yaml
kubectl apply -f infra/argocd/application-prod.yaml
```

### Webhook Integration

For instant sync instead of 3-minute polling:

1. Get Argo CD webhook URL
2. Add webhook to GitHub/GitLab
3. Argo CD syncs immediately on push

See [SETUP.md](SETUP.md) for details.

### Notifications

Configure Slack, email, or other notifications:

```bash
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token=<TOKEN>
```

## Documentation

- **[SETUP.md](SETUP.md)** - Complete installation guide
- **[GITOPS_WORKFLOW.md](GITOPS_WORKFLOW.md)** - GitOps workflow guide
- **[DASHBOARD_GUIDE.md](DASHBOARD_GUIDE.md)** - Dashboard usage guide
- **[REPOSITORY_LAYOUT.md](REPOSITORY_LAYOUT.md)** - Repository organization guide

## Support

For issues or questions:

1. Check [SETUP.md](SETUP.md) troubleshooting section
2. Check [GITOPS_WORKFLOW.md](GITOPS_WORKFLOW.md) for workflow issues
3. Check [DASHBOARD_GUIDE.md](DASHBOARD_GUIDE.md) for dashboard issues
4. Check Argo CD logs: `kubectl logs -f deployment/argocd-application-controller -n argocd`

## Summary

✅ Argo CD installed and configured  
✅ AppProject created for ai-task-platform  
✅ Application CRD deployed  
✅ Auto-sync enabled (3-minute polling)  
✅ All resources deployed and healthy  
✅ GitOps workflow ready  

**Key Points:**
- Push changes to Git → Argo CD auto-syncs
- All changes tracked in Git history
- Easy rollback by reverting commits
- Audit trail of all deployments
- Declarative infrastructure as code

---

**Status:** ✅ Ready for GitOps  
**Sync Interval:** 3 minutes (default)  
**Auto-Sync:** Enabled  
**Self-Heal:** Enabled  
**Prune:** Enabled

For detailed setup instructions, see [SETUP.md](SETUP.md).
