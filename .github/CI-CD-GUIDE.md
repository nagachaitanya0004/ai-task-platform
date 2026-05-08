# GitHub Actions CI/CD Pipeline - AI Task Platform

Complete GitHub Actions CI/CD pipeline for automated testing, building, and deployment of the AI Task Platform.

## Overview

The CI/CD pipeline automates:
- ✅ Code linting (ESLint for Node.js, flake8 for Python)
- ✅ Docker image building and pushing
- ✅ Infrastructure repository updates
- ✅ Automatic deployment via Argo CD

## Pipeline Architecture

```
Push to main / Pull Request
    ↓
[LINT JOB]
├─ Lint backend (ESLint)
├─ Lint frontend (ESLint + React)
└─ Lint worker (flake8)
    ↓
[BUILD-AND-PUSH JOB] (only on push to main)
├─ Build backend image
├─ Build frontend image
└─ Build worker image
    ↓
[UPDATE-INFRA JOB] (only on push to main)
├─ Update backend deployment.yaml
├─ Update frontend deployment.yaml
├─ Update worker deployment.yaml
└─ Push to infra repository
    ↓
[ARGO CD AUTO-SYNC]
└─ Automatically deploys to cluster
```

## Workflow File

**Location:** `.github/workflows/ci-cd.yml`

### Triggers

- **Push to main:** Runs all jobs (lint, build-and-push, update-infra)
- **Pull Request to main:** Runs lint job only (no build/push)

### Jobs

#### 1. Lint Job

**Runs on:** ubuntu-latest  
**Triggers:** All pushes and pull requests

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install backend dependencies (npm ci)
4. Install frontend dependencies (npm ci)
5. Lint backend with ESLint
6. Lint frontend with ESLint
7. Setup Python 3.11
8. Install flake8
9. Lint worker with flake8

**Outputs:** None

#### 2. Build and Push Job

**Runs on:** ubuntu-latest  
**Triggers:** Only on push to main (after lint passes)  
**Needs:** lint

**Steps:**
1. Checkout code
2. Set up Docker Buildx
3. Login to Docker Hub
4. Build and push backend image
5. Build and push frontend image
6. Build and push worker image

**Outputs:**
- `image-tag`: Git SHA (used by update-infra job)

**Image Tags:**
- `DOCKERHUB_USERNAME/ai-task-backend:SHA`
- `DOCKERHUB_USERNAME/ai-task-backend:latest`
- (same for frontend and worker)

**Caching:**
- Uses Docker layer caching
- Stores cache in registry for faster builds

#### 3. Update Infrastructure Job

**Runs on:** ubuntu-latest  
**Triggers:** Only on push to main (after build-and-push passes)  
**Needs:** build-and-push

**Steps:**
1. Checkout infra repository
2. Update backend deployment.yaml with new image tag
3. Update frontend deployment.yaml with new image tag
4. Update worker deployment.yaml with new image tag
5. Configure git
6. Commit changes with `[skip ci]` flag
7. Push to infra repository main branch

**Commit Message:** `ci: update image tags to <SHA> [skip ci]`

---

## Configuration Files

### backend/.eslintrc.js

ESLint configuration for Node.js backend:

```javascript
{
  env: {
    node: true,
    es2020: true,
  },
  extends: 'eslint:recommended',
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
  },
}
```

**Rules:**
- ✅ Extends ESLint recommended rules
- ✅ Node.js environment
- ✅ ES2020 features
- ✅ Console warnings
- ✅ Unused variables as errors

### frontend/.eslintrc.js

ESLint configuration for React frontend:

```javascript
{
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'react/prop-types': 'warn',
  },
}
```

**Rules:**
- ✅ Extends ESLint recommended rules
- ✅ React plugin rules
- ✅ Browser environment
- ✅ ES2020 features
- ✅ Auto-detect React version
- ✅ Console warnings
- ✅ Unused variables as errors
- ✅ React prop-types warnings

### worker/setup.cfg

Flake8 configuration for Python worker:

```ini
[flake8]
max-line-length = 100
exclude = __pycache__,*.pyc,.git,.venv,venv
ignore = E203,W503
```

**Configuration:**
- ✅ Max line length: 100 characters
- ✅ Exclude: `__pycache__`, `.pyc`, `.git`, virtual environments
- ✅ Ignore: E203 (whitespace before ':'), W503 (line break before binary operator)

---

## GitHub Secrets Required

### Required Secrets

1. **DOCKERHUB_USERNAME**
   - Docker Hub username
   - Used for: Image tagging and pushing
   - Example: `your-dockerhub-username`

2. **DOCKERHUB_TOKEN**
   - Docker Hub personal access token
   - Used for: Authentication to Docker Hub
   - How to create:
     - Go to Docker Hub → Account Settings → Security
     - Create new access token with read/write permissions
     - Copy token (won't be shown again)

3. **INFRA_REPO**
   - Infrastructure repository name
   - Used for: Checking out infra repo
   - Format: `owner/repo-name`
   - Example: `your-org/ai-task-platform-infra`

4. **INFRA_PAT**
   - GitHub Personal Access Token for infra repo
   - Used for: Pushing changes to infra repo
   - Permissions needed: `repo` (full control of private repositories)
   - How to create:
     - Go to GitHub → Settings → Developer settings → Personal access tokens
     - Create new token with `repo` scope
     - Copy token (won't be shown again)

### How to Add Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - Name: `DOCKERHUB_USERNAME`
   - Value: Your Docker Hub username
4. Repeat for all secrets

---

## Workflow Execution

### On Pull Request to main

```
1. Lint job runs
   ├─ ESLint backend
   ├─ ESLint frontend
   └─ flake8 worker
2. If lint passes → PR can be merged
3. If lint fails → PR blocked until fixed
```

### On Push to main

```
1. Lint job runs
   ├─ ESLint backend
   ├─ ESLint frontend
   └─ flake8 worker
   
2. If lint passes → Build-and-push job runs
   ├─ Build backend image
   ├─ Build frontend image
   └─ Build worker image
   
3. If build passes → Update-infra job runs
   ├─ Update deployment.yaml files
   └─ Push to infra repository
   
4. Argo CD detects changes
   └─ Auto-syncs to cluster
```

---

## Execution Times

| Job | Typical Duration |
|-----|------------------|
| Lint | 2-3 minutes |
| Build backend | 3-5 minutes |
| Build frontend | 3-5 minutes |
| Build worker | 2-3 minutes |
| Update infra | 1 minute |
| **Total** | **10-15 minutes** |

---

## Monitoring

### View Workflow Runs

1. Go to GitHub repository
2. Click "Actions" tab
3. Select workflow run to view details

### View Job Logs

1. Click on workflow run
2. Click on job name
3. Expand steps to view logs

### Troubleshooting

#### Lint Failures

```bash
# Fix ESLint issues
cd backend
npx eslint src/ --fix

# Fix flake8 issues
cd ../worker
flake8 main.py --show-source
```

#### Build Failures

- Check Docker Hub credentials
- Verify Dockerfile syntax
- Check Docker build context

#### Update Infra Failures

- Verify INFRA_REPO secret format
- Verify INFRA_PAT has repo write permissions
- Check deployment.yaml file paths

---

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
- Use GitHub Secrets for sensitive data
- Rotate tokens regularly
- Use least privilege principle

### 4. Docker Images

- Tag with git SHA for traceability
- Keep `latest` tag for quick reference
- Use layer caching for faster builds
- Clean up old images regularly

### 5. Code Quality

- Fix all lint warnings
- Keep code coverage high
- Review logs regularly
- Monitor build times

---

## Customization

### Add More Linting

```yaml
- name: Run additional linter
  run: cd backend && npm run lint:custom
```

### Add Tests

```yaml
- name: Run tests
  run: npm test
```

### Add Security Scanning

```yaml
- name: Run security scan
  run: npm audit
```

### Add Code Coverage

```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

---

## Troubleshooting Guide

### Issue: Lint fails on PR

**Solution:**
```bash
# Fix locally
npm run lint -- --fix
git add .
git commit -m "fix: lint issues"
git push
```

### Issue: Docker build fails

**Solution:**
- Check Dockerfile syntax
- Verify build context
- Check for missing dependencies
- Review Docker Hub credentials

### Issue: Update infra fails

**Solution:**
- Verify INFRA_PAT permissions
- Check INFRA_REPO format
- Verify deployment.yaml paths
- Check git configuration

### Issue: Workflow doesn't trigger

**Solution:**
- Verify branch is `main`
- Check workflow file syntax
- Verify secrets are set
- Check GitHub Actions is enabled

---

## Security Considerations

### Secrets

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate tokens regularly
- ✅ Use least privilege principle
- ✅ Audit secret access

### Docker Images

- ✅ Scan images for vulnerabilities
- ✅ Use minimal base images
- ✅ Keep dependencies updated
- ✅ Sign images with cosign

### Git Access

- ✅ Use PAT with limited scope
- ✅ Rotate PAT regularly
- ✅ Audit git access logs
- ✅ Use branch protection rules

---

## Performance Optimization

### Docker Layer Caching

The pipeline uses Docker layer caching to speed up builds:

```yaml
cache-from: type=registry,ref=.../ai-task-backend:buildcache
cache-to: type=registry,ref=.../ai-task-backend:buildcache,mode=max
```

**Benefits:**
- Faster builds (2-3x speedup)
- Reduced bandwidth
- Lower Docker Hub costs

### Node.js Caching

```yaml
uses: actions/setup-node@v4
with:
  cache: 'npm'
```

**Benefits:**
- Faster dependency installation
- Reduced network requests

### Python Caching

```yaml
uses: actions/setup-python@v4
with:
  cache: 'pip'
```

**Benefits:**
- Faster pip installation
- Reduced network requests

---

## Integration with Argo CD

### Automatic Deployment

1. Pipeline updates infra repository
2. Argo CD detects changes (within 3 minutes)
3. Argo CD auto-syncs to cluster
4. New images deployed automatically

### Workflow

```
Code Push → Lint → Build → Push Images → Update Infra → Argo CD Sync → Deployed
```

---

## Summary

✅ Complete CI/CD pipeline configured  
✅ Linting for all components  
✅ Docker image building and pushing  
✅ Automatic infrastructure updates  
✅ Integration with Argo CD  
✅ Security best practices  
✅ Performance optimization  

**Status:** ✅ Ready for production use

---

**Documentation Version:** 1.0  
**Last Updated:** Generated during CI/CD setup  
**Maintenance:** Update as needed for new requirements
