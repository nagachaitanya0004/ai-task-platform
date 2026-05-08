# GitOps Workflow Guide - AI Task Platform with Argo CD

Complete guide to using Argo CD for GitOps-based deployment management.

## Overview

Argo CD continuously monitors the Git repository and automatically syncs the cluster state to match the desired state defined in Git. This is the GitOps principle: **Git is the single source of truth**.

## Workflow

```
Developer → Git Push → Argo CD → Kubernetes Cluster
                ↓
         Webhook/Polling
                ↓
         Auto-Sync (3 min)
                ↓
         Cluster Updated
```

---

## Making Changes

### 1. Update Manifests Locally

Edit any manifest in the `infra/` directory:

```bash
# Example: Scale backend to 3 replicas
cd infra/backend
vim deployment.yaml
# Change: replicas: 2 → replicas: 3
```

### 2. Commit Changes

```bash
git add infra/backend/deployment.yaml
git commit -m "Scale backend to 3 replicas"
```

### 3. Push to Main Branch

```bash
git push origin main
```

### 4. Argo CD Auto-Syncs

Argo CD detects the change and automatically syncs:
- **Webhook:** Immediate (if configured)
- **Polling:** Within 3 minutes (default)

### 5. Verify Changes

Check Argo CD dashboard or CLI:

```bash
# Check sync status
kubectl get application ai-task-platform -n argocd

# Watch sync in real-time
kubectl get application ai-task-platform -n argocd -w

# Verify pods scaled
kubectl get pods -n ai-task-platform
```

---

## Common Tasks

### Task 1: Update Backend Image

```bash
# Edit backend deployment
vim infra/backend/deployment.yaml

# Change image tag
# FROM: image: REGISTRY/ai-task-backend:v1.0.0
# TO:   image: REGISTRY/ai-task-backend:v1.1.0

# Commit and push
git add infra/backend/deployment.yaml
git commit -m "Update backend to v1.1.0"
git push origin main

# Argo CD will automatically update the deployment
```

### Task 2: Scale Worker Replicas

```bash
# Edit worker HPA
vim infra/worker/hpa.yaml

# Change max replicas
# FROM: maxReplicas: 10
# TO:   maxReplicas: 20

# Commit and push
git add infra/worker/hpa.yaml
git commit -m "Increase worker max replicas to 20"
git push origin main

# Argo CD will automatically update the HPA
```

### Task 3: Update Environment Variables

```bash
# Edit ConfigMap
vim infra/configmap.yaml

# Update values
# FROM: VITE_API_URL: "http://localhost/api"
# TO:   VITE_API_URL: "https://api.example.com"

# Commit and push
git add infra/configmap.yaml
git commit -m "Update API URL to production"
git push origin main

# Argo CD will automatically update the ConfigMap
# Pods will restart to pick up new values
```

### Task 4: Update Secrets

```bash
# Edit secret
vim infra/secret.yaml

# Update base64-encoded values
# Generate new base64 value:
echo -n "new-password" | base64

# Update the secret
# FROM: MONGO_PASSWORD: "b2xkLXBhc3N3b3Jk"
# TO:   MONGO_PASSWORD: "bmV3LXBhc3N3b3Jk"

# Commit and push
git add infra/secret.yaml
git commit -m "Rotate MongoDB password"
git push origin main

# Argo CD will automatically update the Secret
# Pods will restart to pick up new values
```

### Task 5: Add New Resource

```bash
# Create new manifest
cat > infra/monitoring/prometheus.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: ai-task-platform
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
EOF

# Commit and push
git add infra/monitoring/prometheus.yaml
git commit -m "Add Prometheus monitoring"
git push origin main

# Argo CD will automatically create the new resource
```

### Task 6: Remove Resource

```bash
# Delete manifest file
rm infra/monitoring/prometheus.yaml

# Commit and push
git add -A
git commit -m "Remove Prometheus monitoring"
git push origin main

# Argo CD will automatically delete the resource (prune: true)
```

---

## Monitoring Deployments

### Real-Time Monitoring

```bash
# Watch application sync status
kubectl get application ai-task-platform -n argocd -w

# Watch pod status
kubectl get pods -n ai-task-platform -w

# Watch events
kubectl get events -n ai-task-platform --sort-by='.lastTimestamp'
```

### Check Sync History

```bash
# View last sync
kubectl describe application ai-task-platform -n argocd | grep -A 5 "Last Sync"

# View all syncs
kubectl get application ai-task-platform -n argocd -o jsonpath='{.status.operationState}'
```

### View Logs

```bash
# Argo CD controller logs
kubectl logs -f deployment/argocd-application-controller -n argocd

# Argo CD repo server logs
kubectl logs -f deployment/argocd-repo-server -n argocd

# Application logs
kubectl logs -f deployment/backend -n ai-task-platform
```

---

## Rollback

### Automatic Rollback (Git Revert)

```bash
# View commit history
git log --oneline

# Revert to previous commit
git revert <COMMIT_HASH>

# Push revert
git push origin main

# Argo CD will automatically sync to previous state
```

### Manual Rollback (Argo CD CLI)

```bash
# Rollback to previous sync
argocd app rollback ai-task-platform

# Rollback to specific revision
argocd app rollback ai-task-platform <REVISION_ID>
```

### Emergency Rollback (kubectl)

```bash
# Manually revert deployment (not recommended)
kubectl rollout undo deployment/backend -n ai-task-platform

# Then update Git to match cluster state
```

---

## Troubleshooting

### Application Not Syncing

**Check sync status:**
```bash
kubectl get application ai-task-platform -n argocd
```

**Check for errors:**
```bash
kubectl describe application ai-task-platform -n argocd
```

**Check controller logs:**
```bash
kubectl logs -f deployment/argocd-application-controller -n argocd
```

**Manual sync:**
```bash
argocd app sync ai-task-platform
```

### Repository Access Issues

**Check repository credentials:**
```bash
kubectl get secrets -n argocd | grep repo
```

**Test repository access:**
```bash
argocd repo list
```

**Add repository:**
```bash
argocd repo add https://github.com/YOUR_ORG/ai-task-platform-infra \
  --username <USERNAME> \
  --password <TOKEN>
```

### Sync Failures

**Check sync result:**
```bash
kubectl get application ai-task-platform -n argocd -o jsonpath='{.status.operationState.message}'
```

**View detailed error:**
```bash
kubectl describe application ai-task-platform -n argocd | grep -A 10 "Conditions:"
```

**Check resource status:**
```bash
kubectl get all -n ai-task-platform
```

### Pod Not Starting

**Check pod events:**
```bash
kubectl describe pod <POD_NAME> -n ai-task-platform
```

**Check pod logs:**
```bash
kubectl logs <POD_NAME> -n ai-task-platform
```

**Check resource requests:**
```bash
kubectl top nodes
kubectl top pods -n ai-task-platform
```

---

## Best Practices

### 1. Use Semantic Versioning

```bash
# Good commit messages
git commit -m "feat: Update backend to v1.1.0"
git commit -m "fix: Increase MongoDB memory limit"
git commit -m "chore: Update dependencies"
```

### 2. Test Changes Locally

```bash
# Validate YAML before pushing
kubectl apply -f infra/ --dry-run=client

# Or use kustomize
kustomize build infra/ --dry-run=client
```

### 3. Use Pull Requests

```bash
# Create feature branch
git checkout -b feature/scale-workers

# Make changes
vim infra/worker/hpa.yaml

# Commit and push
git add infra/worker/hpa.yaml
git commit -m "Increase worker max replicas"
git push origin feature/scale-workers

# Create PR for review
# After approval, merge to main
# Argo CD will auto-sync
```

### 4. Monitor Sync Status

```bash
# Set up alerts for sync failures
# Use Argo CD notifications or external monitoring
```

### 5. Document Changes

```bash
# Update CHANGELOG
echo "- Updated backend to v1.1.0" >> CHANGELOG.md

# Commit with documentation
git add CHANGELOG.md
git commit -m "docs: Update changelog"
git push origin main
```

### 6. Use Kustomization for Overlays

```
infra/
├── base/
│   ├── backend/
│   ├── frontend/
│   └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── prod/
│       └── kustomization.yaml
```

---

## Advanced Workflows

### Multi-Environment Deployment

```bash
# Create separate applications
kubectl apply -f infra/argocd/application-dev.yaml
kubectl apply -f infra/argocd/application-staging.yaml
kubectl apply -f infra/argocd/application-prod.yaml

# Each environment syncs from different branch/path
# dev: branch=develop, path=infra/overlays/dev
# staging: branch=staging, path=infra/overlays/staging
# prod: branch=main, path=infra/overlays/prod
```

### Blue-Green Deployment

```bash
# Create two applications
kubectl apply -f infra/argocd/application-blue.yaml
kubectl apply -f infra/argocd/application-green.yaml

# Switch traffic between them
# Update ingress to point to active version
```

### Canary Deployment

```bash
# Use Flagger for automated canary deployments
# Gradually shift traffic to new version
# Automatic rollback on errors
```

---

## Monitoring and Alerts

### Prometheus Metrics

```bash
# Argo CD exposes Prometheus metrics
# Scrape endpoint: argocd-metrics:8082/metrics

# Key metrics:
# - argocd_app_sync_total
# - argocd_app_sync_duration_seconds
# - argocd_app_health
```

### Slack Notifications

```bash
# Configure Argo CD notifications
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token=<SLACK_TOKEN>

# Receive notifications on sync success/failure
```

### Email Alerts

```bash
# Configure email notifications
# Receive alerts on deployment failures
```

---

## Summary

✅ GitOps workflow established  
✅ Automatic sync enabled (3-minute polling)  
✅ Git is single source of truth  
✅ Easy rollback via Git revert  
✅ Monitoring and troubleshooting tools available  

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
