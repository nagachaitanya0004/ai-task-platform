# Kubernetes Deployment Guide - AI Task Platform

## Prerequisites
- Kubernetes cluster (1.24+)
- kubectl configured
- nginx-ingress-controller installed
- cert-manager installed (for TLS)
- Container registry access (for image pulls)

## Deployment Steps

### 1. Create Namespace
```bash
kubectl apply -f infra/namespace.yaml
```

### 2. Update Secrets (IMPORTANT)
Before deploying, update the base64-encoded values in `infra/secret.yaml`:

```bash
# Generate base64-encoded values
echo -n "your-mongo-password" | base64
echo -n "your-jwt-secret" | base64
echo -n "mongodb://admin:your-mongo-password@mongo:27017/admin?authSource=admin" | base64
```

Replace the placeholder values in `infra/secret.yaml` with the actual base64-encoded secrets.

### 3. Apply ConfigMap and Secrets
```bash
kubectl apply -f infra/configmap.yaml
kubectl apply -f infra/secret.yaml
```

### 4. Deploy MongoDB
```bash
kubectl apply -f infra/mongo/pvc.yaml
kubectl apply -f infra/mongo/deployment.yaml
kubectl apply -f infra/mongo/service.yaml
```

Wait for MongoDB to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=mongo -n ai-task-platform --timeout=300s
```

### 5. Deploy Redis
```bash
kubectl apply -f infra/redis/deployment.yaml
kubectl apply -f infra/redis/service.yaml
```

Wait for Redis to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=redis -n ai-task-platform --timeout=300s
```

### 6. Deploy Backend
Update image tag in `infra/backend/deployment.yaml`:
```yaml
image: REGISTRY/ai-task-backend:IMAGE_TAG  # Replace with actual registry and tag
```

```bash
kubectl apply -f infra/backend/service.yaml
kubectl apply -f infra/backend/deployment.yaml
```

### 7. Deploy Frontend
Update image tag in `infra/frontend/deployment.yaml`:
```yaml
image: REGISTRY/ai-task-frontend:IMAGE_TAG  # Replace with actual registry and tag
```

```bash
kubectl apply -f infra/frontend/service.yaml
kubectl apply -f infra/frontend/deployment.yaml
```

### 8. Deploy Worker
Update image tag in `infra/worker/deployment.yaml`:
```yaml
image: REGISTRY/ai-task-worker:IMAGE_TAG  # Replace with actual registry and tag
```

```bash
kubectl apply -f infra/worker/deployment.yaml
kubectl apply -f infra/worker/hpa.yaml
```

### 9. Deploy Ingress
Update hostname in `infra/ingress.yaml`:
```yaml
host: your-domain.com  # Replace with actual domain
secretName: ai-task-tls
```

```bash
kubectl apply -f infra/ingress.yaml
```

## Verification

### Check all pods are running
```bash
kubectl get pods -n ai-task-platform
```

### Check services
```bash
kubectl get svc -n ai-task-platform
```

### Check ingress
```bash
kubectl get ingress -n ai-task-platform
```

### View logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n ai-task-platform

# Worker logs
kubectl logs -f deployment/worker -n ai-task-platform

# MongoDB logs
kubectl logs -f deployment/mongo -n ai-task-platform

# Redis logs
kubectl logs -f deployment/redis -n ai-task-platform
```

### Test health endpoint
```bash
kubectl port-forward svc/backend 5000:5000 -n ai-task-platform
curl http://localhost:5000/api/health
```

## Scaling

### Manual scaling
```bash
kubectl scale deployment backend --replicas=3 -n ai-task-platform
kubectl scale deployment frontend --replicas=3 -n ai-task-platform
```

### Worker autoscaling
Worker deployment uses HPA (HorizontalPodAutoscaler) configured to:
- Minimum replicas: 2
- Maximum replicas: 10
- Target CPU utilization: 70%

Monitor HPA status:
```bash
kubectl get hpa -n ai-task-platform
kubectl describe hpa worker-hpa -n ai-task-platform
```

## Cleanup

To remove all resources:
```bash
kubectl delete namespace ai-task-platform
```

## Troubleshooting

### Pod not starting
```bash
kubectl describe pod <pod-name> -n ai-task-platform
kubectl logs <pod-name> -n ai-task-platform
```

### Database connection issues
Verify MongoDB is running:
```bash
kubectl exec -it deployment/mongo -n ai-task-platform -- mongosh
```

### Redis connection issues
Verify Redis is running:
```bash
kubectl exec -it deployment/redis -n ai-task-platform -- redis-cli ping
```

### Ingress not working
Check cert-manager status:
```bash
kubectl get certificate -n ai-task-platform
kubectl describe certificate ai-task-tls -n ai-task-platform
```

## Notes

- All manifests use namespace: `ai-task-platform`
- Images use `imagePullPolicy: Always` for production deployments
- Resource requests and limits are set for proper scheduling and QoS
- Health probes ensure pod readiness and liveness
- MongoDB uses persistent storage (5Gi PVC)
- Redis runs in-memory (no persistence)
- Worker deployment includes HPA for automatic scaling based on CPU usage
