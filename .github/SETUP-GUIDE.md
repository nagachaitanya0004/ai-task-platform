# GitHub Actions CI/CD Setup Guide

Complete guide to set up the GitHub Actions CI/CD pipeline for AI Task Platform.

## Prerequisites

- GitHub repository with main branch
- Docker Hub account
- GitHub Personal Access Token (PAT)
- Separate infrastructure repository

## Step 1: Create Docker Hub Access Token

### 1.1 Go to Docker Hub

1. Visit https://hub.docker.com
2. Sign in with your account
3. Click on your profile icon (top right)
4. Select "Account Settings"

### 1.2 Create Access Token

1. Click "Security" in the left sidebar
2. Click "New Access Token"
3. Enter token description: `GitHub Actions CI/CD`
4. Select access permissions: `Read & Write`
5. Click "Generate"
6. **Copy the token** (won't be shown again)

### 1.3 Save Token

Save the token securely:
```
DOCKERHUB_TOKEN: <your-token-here>
DOCKERHUB_USERNAME: <your-username>
```

## Step 2: Create GitHub Personal Access Token

### 2.1 Go to GitHub Settings

1. Visit https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"

### 2.2 Configure Token

1. **Token name:** `AI Task Platform CI/CD`
2. **Expiration:** 90 days (or as per your policy)
3. **Scopes:** Select `repo` (full control of private repositories)
4. Click "Generate token"
5. **Copy the token** (won't be shown again)

### 2.3 Save Token

Save the token securely:
```
INFRA_PAT: <your-token-here>
```

## Step 3: Add GitHub Secrets

### 3.1 Go to Repository Settings

1. Go to your application repository on GitHub
2. Click "Settings" (top right)
3. Click "Secrets and variables" → "Actions"

### 3.2 Add DOCKERHUB_USERNAME

1. Click "New repository secret"
2. **Name:** `DOCKERHUB_USERNAME`
3. **Value:** Your Docker Hub username
4. Click "Add secret"

### 3.3 Add DOCKERHUB_TOKEN

1. Click "New repository secret"
2. **Name:** `DOCKERHUB_TOKEN`
3. **Value:** Docker Hub access token (from Step 1)
4. Click "Add secret"

### 3.4 Add INFRA_REPO

1. Click "New repository secret"
2. **Name:** `INFRA_REPO`
3. **Value:** `owner/infra-repo-name` (e.g., `your-org/ai-task-platform-infra`)
4. Click "Add secret"

### 3.5 Add INFRA_PAT

1. Click "New repository secret"
2. **Name:** `INFRA_PAT`
3. **Value:** GitHub Personal Access Token (from Step 2)
4. Click "Add secret"

## Step 4: Verify Workflow File

### 4.1 Check Workflow File

1. Go to `.github/workflows/ci-cd.yml`
2. Verify file exists and contains:
   - `lint` job
   - `build-and-push` job
   - `update-infra` job

### 4.2 Check Configuration Files

Verify these files exist:
- `backend/.eslintrc.js`
- `frontend/.eslintrc.js`
- `worker/setup.cfg`

## Step 5: Test Pipeline

### 5.1 Create Test Branch

```bash
git checkout -b test/ci-cd-setup
```

### 5.2 Make Small Change

```bash
# Make a small change to trigger linting
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin test/ci-cd-setup
```

### 5.3 Create Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Create PR to main branch
4. Wait for lint job to complete

### 5.4 Check Results

1. Go to "Actions" tab
2. Click on the workflow run
3. Verify lint job passed
4. Check logs for any issues

### 5.5 Merge PR

1. If lint passes, merge PR to main
2. Watch build-and-push job
3. Watch update-infra job
4. Verify images pushed to Docker Hub
5. Verify infra repository updated

## Step 6: Verify Docker Hub Images

### 6.1 Check Docker Hub

1. Go to https://hub.docker.com
2. Click on your profile
3. Go to "Repositories"
4. Verify these repositories exist:
   - `ai-task-backend`
   - `ai-task-frontend`
   - `ai-task-worker`

### 6.2 Check Image Tags

1. Click on each repository
2. Verify tags exist:
   - `latest` (most recent)
   - Git SHA (specific commit)

## Step 7: Verify Infrastructure Repository

### 7.1 Check Infra Repository

1. Go to infrastructure repository
2. Check `infra/backend/deployment.yaml`
3. Verify image tag updated to latest SHA

### 7.2 Check Git History

```bash
cd infra-repo
git log --oneline | head -5
```

Should show recent commit:
```
abc1234 ci: update image tags to <SHA> [skip ci]
```

## Step 8: Verify Argo CD Sync

### 8.1 Check Argo CD Dashboard

1. Go to Argo CD dashboard
2. Click on `ai-task-platform` application
3. Verify sync status: `Synced`
4. Verify health status: `Healthy`

### 8.2 Check Deployed Images

```bash
kubectl get deployment -n ai-task-platform -o wide
```

Should show new image tags deployed.

## Troubleshooting

### Issue: Lint Job Fails

**Problem:** ESLint or flake8 errors

**Solution:**
```bash
# Fix ESLint issues
cd backend
npx eslint src/ --fix
cd ../frontend
npx eslint src/ --fix

# Fix flake8 issues
cd ../worker
flake8 main.py --show-source
```

### Issue: Docker Build Fails

**Problem:** Docker build error

**Solution:**
1. Check Dockerfile syntax
2. Verify build context
3. Check for missing dependencies
4. Review Docker Hub credentials

### Issue: Update Infra Fails

**Problem:** Git push fails

**Solution:**
1. Verify INFRA_PAT has `repo` scope
2. Verify INFRA_REPO format: `owner/repo`
3. Check deployment.yaml file paths
4. Verify git configuration

### Issue: Secrets Not Found

**Problem:** `Secrets not found` error

**Solution:**
1. Go to Settings → Secrets and variables → Actions
2. Verify all 4 secrets are added:
   - DOCKERHUB_USERNAME
   - DOCKERHUB_TOKEN
   - INFRA_REPO
   - INFRA_PAT
3. Verify secret names match exactly (case-sensitive)

### Issue: Workflow Doesn't Trigger

**Problem:** Workflow doesn't run on push

**Solution:**
1. Verify branch is `main`
2. Check workflow file syntax: `yamllint .github/workflows/ci-cd.yml`
3. Verify GitHub Actions is enabled
4. Check repository settings → Actions

## Monitoring

### View Workflow Runs

1. Go to GitHub repository
2. Click "Actions" tab
3. Select workflow run to view details

### View Job Logs

1. Click on workflow run
2. Click on job name
3. Expand steps to view logs

### Set Up Notifications

1. Go to GitHub Settings → Notifications
2. Enable workflow notifications
3. Choose notification method (email, web, etc.)

## Best Practices

### 1. Commit Messages

Use conventional commits:
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
ci: Update CI/CD pipeline
chore: Update dependencies
```

### 2. Pull Requests

- Create PR for all changes
- Wait for lint to pass
- Request review
- Merge after approval

### 3. Secrets Management

- Never commit secrets
- Rotate tokens every 90 days
- Use least privilege principle
- Audit secret access

### 4. Docker Images

- Tag with git SHA for traceability
- Keep `latest` tag for quick reference
- Clean up old images regularly
- Scan images for vulnerabilities

## Maintenance

### Monthly Tasks

- [ ] Review workflow logs
- [ ] Check for failed builds
- [ ] Update dependencies
- [ ] Verify secrets are still valid

### Quarterly Tasks

- [ ] Rotate Docker Hub token
- [ ] Rotate GitHub PAT
- [ ] Review and update workflow
- [ ] Audit Docker Hub images

### Annually Tasks

- [ ] Review and update GitHub Actions versions
- [ ] Review and update base images
- [ ] Audit security practices
- [ ] Plan for new features

## Summary

✅ GitHub Actions CI/CD pipeline configured  
✅ Secrets added to repository  
✅ Workflow tested and verified  
✅ Docker images pushed to Docker Hub  
✅ Infrastructure repository updated  
✅ Argo CD auto-sync working  

**Status:** ✅ Ready for production use

---

**Setup Version:** 1.0  
**Last Updated:** Generated during CI/CD setup  
**Next Review:** After first production deployment
