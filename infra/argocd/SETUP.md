# Argo CD Setup Guide - AI Task Platform

Complete guide to set up Argo CD for GitOps-based deployment management of the AI Task Platform.

## Prerequisites

- Kubernetes cluster (k3s, EKS, GKE, etc.)
- kubectl configured and authenticated
- Git repository with infra/ directory (this repository)
- Git credentials (for private repos)

## STEP 1 — Install Argo CD on Kubernetes

### 1.1 Create Argo CD Namespace

```bash
kubectl create namespace argocd
```

### 1.2 Install Argo CD

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 1.3 Wait for Argo CD to be Ready

```bash
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

Verify all pods are running:
```bash
kubectl get pods -n argocd
```

Expected output:
```
NAME                                                READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                     1/1     Running   0          2m
argocd-applicationset-controller-0                  1/1     Running   0          2m
argocd-dex-server-5d8f8f8f8-xxxxx                   1/1     Running   0          2m
argocd-notifications-controller-deployment-xxxxx   1/1     Running   0          2m
argocd-redis-xxxxx                                  1/1     Running   0          2m
argocd-repo-server-xxxxx                            1/1     Running   0          2m
argocd-server-xxxxx                                 1/1     Running   0          2m
```

### 1.4 Expose Argo CD Server

Change service type to LoadBalancer:
```bash
kubectl patch svc argocd-server -n argocd -p '{"spec":{"type":"LoadBalancer"}}'
```

Get the external IP/hostname:
```bash
kubectl get svc argocd-server -n argocd
```

For local k3s, use port-forward:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then access at: `https://localhost:8080`

### 1.5 Get Initial Admin Password

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Save this password for first login.

### 1.6 Login to Argo CD

**Web UI:**
- URL: `https://localhost:8080` (or LoadBalancer IP)
- Username: `admin`
- Password: (from step 1.5)

**CLI:**
```bash
argocd login localhost:8080 --insecure --username admin --password <PASSWORD>
```

### 1.7 Change Admin Password (Recommended)

```bash
argocd account update-password --account admin --new-password <NEW_PASSWORD>
```

---

## STEP 2 — Configure Git Repository Access

### 2.1 For Public Repositories

No additional configuration needed. Argo CD can access public repos directly.

### 2.2 For Private Repositories (SSH)

Generate SSH key:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/argocd_key -N ""
```

Add public key to GitHub/GitLab deploy keys:
```bash
cat ~/.ssh/argocd_key.pub
```

Create Argo CD repository secret:
```bash
kubectl create secret generic argocd-repo-creds \
  -n argocd \
  --from-file=sshPrivateKey=~/.ssh/argocd_key \
  --from-literal=type=git \
  --from-literal=url=git@github.com:YOUR_ORG/ai-task-platform-infra.git
```

### 2.3 For Private Repositories (HTTPS)

Create Argo CD repository secret:
```bash
kubectl create secret generic argocd-repo-creds \
  -n argocd \
  --from-literal=type=git \
  --from-literal=url=https://github.com/YOUR_ORG/ai-task-platform-infra.git \
  --from-literal=username=<GITHUB_USERNAME> \
  --from-literal=password=<GITHUB_TOKEN>
```

---

## STEP 3 — Create Argo CD Project

Apply the AppProject manifest:
```bash
kubectl apply -f infra/argocd/project.yaml
```

Verify:
```bash
kubectl get appproject -n argocd
```

Expected output:
```
NAME                  AGE
ai-task-platform      10s
default               2m
```

---

## STEP 4 — Create Argo CD Application

### 4.1 Update Repository URL

Edit `infra/argocd/application.yaml` and replace:
```yaml
repoURL: https://github.com/YOUR_ORG/ai-task-platform-infra
```

With your actual repository URL.

### 4.2 Apply Application Manifest

```bash
kubectl apply -f infra/argocd/application.yaml
```

Verify:
```bash
kubectl get applications -n argocd
```

Expected output:
```
NAME                  SYNC STATUS   HEALTH STATUS   REPO                                                    PATH   TARGET
ai-task-platform      Syncing       Progressing     https://github.com/YOUR_ORG/ai-task-platform-infra      infra  main
```

### 4.3 Monitor Sync Progress

```bash
kubectl get application ai-task-platform -n argocd -o wide
```

Watch real-time sync:
```bash
kubectl get application ai-task-platform -n argocd -w
```

---

## STEP 5 — Verify Deployment

### 5.1 Check Application Status

```bash
kubectl describe application ai-task-platform -n argocd
```

### 5.2 Check Deployed Resources

```bash
kubectl get all -n ai-task-platform
```

Expected resources:
- 1 Namespace
- 5 Deployments (MongoDB, Redis, Backend, Frontend, Worker)
- 5 Services
- 1 ConfigMap
- 1 Secret
- 1 PVC
- 1 HPA
- 1 Ingress

### 5.3 Check Pod Status

```bash
kubectl get pods -n ai-task-platform
```

All pods should be in Running state.

### 5.4 Check Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n ai-task-platform

# Worker logs
kubectl logs -f deployment/worker -n ai-task-platform

# MongoDB logs
kubectl logs -f deployment/mongo -n ai-task-platform
```

---

## STEP 6 — Repository Layout

The infra repository should be organized as follows:

```
ai-task-platform-infra/
├── README.md
├── infra/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
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
│   ├── ingress.yaml
│   ├── DEPLOYMENT.md
│   ├── README.md
│   ├── VALIDATION_REPORT.md
│   └── argocd/
│       ├── project.yaml
│       ├── application.yaml
│       └── kustomization.yaml
└── .gitignore
```

### How Argo CD Finds Manifests

1. **Source Repository:** Argo CD clones the repository specified in `application.yaml`
2. **Path:** Argo CD looks in the `infra/` directory (specified in `source.path`)
3. **Manifest Discovery:** Argo CD recursively finds all YAML files in the path
4. **Kustomization:** If `kustomization.yaml` exists, Argo CD uses Kustomize to build manifests
5. **Helm:** If `Chart.yaml` exists, Argo CD uses Helm to render manifests

### Auto-Sync Behavior

When you push changes to the `main` branch:

1. **Webhook Trigger (if configured):** Immediate sync
2. **Polling (default):** Sync within 3 minutes (default polling interval)
3. **Manual Trigger:** Use Argo CD UI or CLI

To configure webhook for instant sync:
```bash
# Get Argo CD webhook URL
kubectl get svc argocd-server -n argocd

# Add webhook to GitHub:
# Settings → Webhooks → Add webhook
# Payload URL: https://<ARGOCD_URL>/api/webhook
# Content type: application/json
# Events: Push events
```

---

## STEP 7 — Argo CD Dashboard

### 7.1 Access Dashboard

```bash
# Port-forward for local access
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Open browser
https://localhost:8080
```

### 7.2 Healthy Sync Indicators

When deployment is successful, you should see:

**Application Card:**
- ✅ **Sync Status:** `Synced` (green)
- ✅ **Health Status:** `Healthy` (green)
- ✅ **Repository:** Shows correct repo URL
- ✅ **Path:** Shows `infra`
- ✅ **Target Revision:** Shows `main`

**Resource Tree:**
- ✅ All resources show green checkmarks
- ✅ Namespace: `ai-task-platform` (green)
- ✅ Deployments: All showing green
- ✅ Services: All showing green
- ✅ ConfigMap: Green
- ✅ Secret: Green
- ✅ PVC: Green
- ✅ HPA: Green
- ✅ Ingress: Green

**Pod Status:**
- ✅ MongoDB pod: Running (green)
- ✅ Redis pod: Running (green)
- ✅ Backend pods (2): Running (green)
- ✅ Frontend pods (2): Running (green)
- ✅ Worker pods (2-10): Running (green)

**Sync Details:**
- ✅ Last sync time: Recent (within last 3 minutes)
- ✅ Sync result: `Synced`
- ✅ No errors or warnings

### 7.3 Screenshot Checklist

When taking screenshots for documentation, verify:

1. **Top Status Bar:**
   - Application name: `ai-task-platform`
   - Sync status: `Synced` (green button)
   - Health: `Healthy` (green)

2. **Resource Tree (Left Panel):**
   - Namespace expanded showing all resources
   - All resources with green checkmarks
   - No red X marks or warnings

3. **Details Panel (Right):**
   - Source: Correct repository URL
   - Path: `infra`
   - Target Revision: `main`
   - Sync Policy: `Automated`

4. **Pod Status:**
   - All pods in Running state
   - No pending or failed pods

---

## STEP 8 — GitOps Workflow

### 8.1 Making Changes

1. **Update manifests** in the infra/ directory
2. **Commit and push** to main branch
3. **Argo CD detects** the change (within 3 minutes)
4. **Auto-sync** applies the changes to the cluster

Example:
```bash
# Update backend replicas
sed -i 's/replicas: 2/replicas: 3/' infra/backend/deployment.yaml

# Commit and push
git add infra/backend/deployment.yaml
git commit -m "Scale backend to 3 replicas"
git push origin main

# Argo CD will automatically sync within 3 minutes
```

### 8.2 Monitoring Changes

Watch Argo CD sync in real-time:
```bash
kubectl get application ai-task-platform -n argocd -w
```

View sync history:
```bash
kubectl describe application ai-task-platform -n argocd | grep -A 20 "Status:"
```

### 8.3 Rollback

Revert to previous commit:
```bash
git revert <COMMIT_HASH>
git push origin main
```

Argo CD will automatically sync to the previous state.

---

## STEP 9 — Troubleshooting

### 9.1 Application Not Syncing

Check application status:
```bash
kubectl describe application ai-task-platform -n argocd
```

Check Argo CD controller logs:
```bash
kubectl logs -f deployment/argocd-application-controller -n argocd
```

### 9.2 Repository Access Issues

Check repository credentials:
```bash
kubectl get secrets -n argocd | grep repo
```

Test repository access:
```bash
argocd repo list
```

### 9.3 Sync Failures

Check sync result:
```bash
kubectl get application ai-task-platform -n argocd -o jsonpath='{.status.operationState.message}'
```

View detailed error:
```bash
kubectl describe application ai-task-platform -n argocd | grep -A 10 "Conditions:"
```

### 9.4 Pod Not Starting

Check pod events:
```bash
kubectl describe pod <POD_NAME> -n ai-task-platform
```

Check pod logs:
```bash
kubectl logs <POD_NAME> -n ai-task-platform
```

---

## STEP 10 — Advanced Configuration

### 10.1 Multiple Environments

Create separate applications for dev/staging/prod:

```bash
# dev environment
kubectl apply -f infra/argocd/application-dev.yaml

# staging environment
kubectl apply -f infra/argocd/application-staging.yaml

# production environment
kubectl apply -f infra/argocd/application-prod.yaml
```

### 10.2 Notifications

Configure Slack notifications:
```bash
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token=<SLACK_TOKEN>
```

### 10.3 RBAC

Create read-only user:
```bash
argocd account create viewer --password <PASSWORD>
argocd account update-role viewer --add-role readonly
```

### 10.4 Backup

Backup Argo CD configuration:
```bash
kubectl get all -n argocd -o yaml > argocd-backup.yaml
```

---

## STEP 11 — Cleanup

### 11.1 Delete Application

```bash
kubectl delete application ai-task-platform -n argocd
```

### 11.2 Delete Project

```bash
kubectl delete appproject ai-task-platform -n argocd
```

### 11.3 Uninstall Argo CD

```bash
kubectl delete namespace argocd
```

---

## Summary

✅ Argo CD installed and configured  
✅ AppProject created for ai-task-platform  
✅ Application CRD deployed  
✅ Auto-sync enabled (3-minute polling)  
✅ All resources deployed and healthy  
✅ GitOps workflow ready  

Any push to the `main` branch will automatically sync to the cluster within 3 minutes.

---

**Status:** ✅ Ready for GitOps  
**Sync Interval:** 3 minutes (default)  
**Auto-Sync:** Enabled  
**Self-Heal:** Enabled  
**Prune:** Enabled
