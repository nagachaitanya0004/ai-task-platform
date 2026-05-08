# Backend Setup & Troubleshooting Guide

## ✅ Issues Fixed

### 1. Missing Environment Variables
**Problem**: Backend couldn't connect to MongoDB and Redis
**Solution**: Added complete `.env` file with:
- `MONGO_URI=mongodb://admin:admin@mongo:27017/ai-task-platform?authSource=admin`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `JWT_SECRET=yoursupersecretjwtkeyhere`
- `CORS_ORIGIN=http://localhost:80`

### 2. Broken SameSite Cookie Header
**Problem**: Invalid Set-Cookie header was breaking all requests
**Solution**: Removed the problematic middleware that was setting invalid cookie headers
- SameSite protection is now handled via CORS and JWT authentication

### 3. CORS Configuration
**Problem**: CORS was hardcoded to localhost:80, causing issues
**Solution**: Made CORS configurable via `CORS_ORIGIN` environment variable

### 4. Password Validation
**Problem**: Password regex required lowercase (not in original spec)
**Solution**: Fixed regex to require only uppercase + number (8+ chars)
- Valid: `Password123`, `PASSWORD123`, `Pass12345`
- Invalid: `password123` (no uppercase), `Password` (no number), `Pass1` (too short)

### 5. Rate Limiting on Health Check
**Problem**: Health check was being rate limited
**Solution**: Added skip condition for `/api/health` endpoint

---

## Complete Setup Instructions

### Step 1: Verify Environment Variables
```bash
cd /Users/nagachaitanya/ai-task-platform
cat .env
```

Expected output:
```
MONGO_URI=mongodb://admin:admin@mongo:27017/ai-task-platform?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=yoursupersecretjwtkeyhere
CORS_ORIGIN=http://localhost:80
NODE_ENV=development
PORT=5000
```

### Step 2: Start Docker Compose
```bash
docker-compose up --build
```

Wait for all services to be ready:
```
✓ MongoDB connected
✓ Redis connected
✓ Server running on port 5000 in development mode
```

### Step 3: Verify Health Endpoint
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "mongo": "up",
    "redis": "up"
  },
  "uptime": 12.345,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Step 4: Test Register Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

Expected response (201):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Step 5: Test Login Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

Expected response (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Step 6: Test Create Task (with token)
```bash
TOKEN="<token-from-login>"

curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Convert to Uppercase",
    "inputText": "hello world",
    "operation": "uppercase"
  }'
```

Expected response (201):
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

### Step 7: Test Get Tasks (with token)
```bash
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

Expected response (200):
```json
[
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
]
```

---

## Validation Rules

### Register Endpoint
```
POST /api/auth/register
Body: {
  "username": "string (3-30 alphanumeric)",
  "email": "string (valid email)",
  "password": "string (8+ chars, 1 uppercase, 1 number)"
}
```

**Valid Example**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "MyPassword123"
}
```

**Invalid Examples**:
```json
// Username too short
{"username": "ab", "email": "test@example.com", "password": "Password123"}

// Invalid email
{"username": "john", "email": "invalid-email", "password": "Password123"}

// Password too weak (no uppercase)
{"username": "john", "email": "john@example.com", "password": "mypassword123"}

// Password too weak (no number)
{"username": "john", "email": "john@example.com", "password": "MyPassword"}

// Password too short
{"username": "john", "email": "john@example.com", "password": "Pass1"}
```

### Login Endpoint
```
POST /api/auth/login
Body: {
  "email": "string (valid email)",
  "password": "string (any)"
}
```

### Create Task Endpoint
```
POST /api/tasks
Headers: Authorization: Bearer <token>
Body: {
  "title": "string (1-100 chars)",
  "inputText": "string (1-10000 chars)",
  "operation": "enum(uppercase, lowercase, reverse, wordcount)"
}
```

---

## Common Errors & Solutions

### Error: "Validation failed"
**Cause**: Invalid input data
**Solution**: Check validation rules above and ensure all fields meet requirements

Example error response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter and one number"
    }
  ]
}
```

### Error: "User already exists"
**Cause**: Username or email already registered
**Solution**: Use a different username or email

### Error: "Invalid credentials"
**Cause**: Email not found or password incorrect
**Solution**: Check email and password are correct

### Error: "Unauthorized"
**Cause**: Missing or invalid JWT token
**Solution**: Include valid token in Authorization header: `Bearer <token>`

### Error: "Rate limit exceeded"
**Cause**: Too many requests in 15 minutes
**Solution**: Wait 15 minutes or use different IP address

### Error: "CORS error"
**Cause**: Request from unauthorized origin
**Solution**: Ensure frontend is running on `http://localhost:80` or update `CORS_ORIGIN` env var

### Error: "MongoDB connection error"
**Cause**: MongoDB not running or wrong connection string
**Solution**: 
1. Check MongoDB is running: `docker-compose ps`
2. Verify `MONGO_URI` in `.env`
3. Check MongoDB logs: `docker-compose logs mongo`

### Error: "Redis connection error"
**Cause**: Redis not running or wrong host/port
**Solution**:
1. Check Redis is running: `docker-compose ps`
2. Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
3. Check Redis logs: `docker-compose logs redis`

---

## Testing Workflow

### Run All Tests
```bash
cd /Users/nagachaitanya/ai-task-platform/backend
node workflow-test.js
```

Expected output:
```
🎉 ALL TESTS PASSED - BACKEND READY FOR DEPLOYMENT
```

### Run Validation Tests
```bash
node test-validation.js
```

### Check Syntax
```bash
node -c src/index.js
node -c src/routes/auth.js
node -c src/routes/tasks.js
```

---

## Security Features Implemented

✅ **Input Validation**: Joi schemas on all endpoints
✅ **Rate Limiting**: 100 req/15min global, 10 req/15min auth
✅ **CORS**: Restricted to CORS_ORIGIN
✅ **Helmet**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
✅ **JWT**: 24-hour token expiration
✅ **Password Hashing**: bcrypt with 12 rounds
✅ **Error Handling**: No stack traces in production
✅ **Request Logging**: Morgan logging
✅ **Health Checks**: MongoDB and Redis monitoring
✅ **Database Indexes**: Optimized queries

---

## Monitoring & Logs

### View Backend Logs
```bash
docker-compose logs -f backend
```

### View MongoDB Logs
```bash
docker-compose logs -f mongo
```

### View Redis Logs
```bash
docker-compose logs -f redis
```

### Check Service Status
```bash
docker-compose ps
```

---

## Production Deployment

### 1. Update Environment Variables
```bash
export MONGO_URI=mongodb://admin:password@mongo-host:27017/ai-task-platform?authSource=admin
export REDIS_HOST=redis-host
export REDIS_PORT=6379
export JWT_SECRET=$(openssl rand -base64 32)
export CORS_ORIGIN=https://yourdomain.com
export NODE_ENV=production
```

### 2. Build Docker Image
```bash
docker build -t ai-task-backend:latest .
```

### 3. Push to Registry
```bash
docker tag ai-task-backend:latest your-registry/ai-task-backend:latest
docker push your-registry/ai-task-backend:latest
```

### 4. Deploy to Kubernetes
```bash
kubectl apply -f infra/backend/deployment.yaml
kubectl apply -f infra/backend/service.yaml
```

### 5. Verify Deployment
```bash
kubectl get pods -n ai-task-platform
kubectl logs -f deployment/backend -n ai-task-platform
```

---

## Troubleshooting Checklist

- [ ] `.env` file exists with all required variables
- [ ] Docker Compose services are running (`docker-compose ps`)
- [ ] MongoDB is accessible (`curl http://localhost:27017`)
- [ ] Redis is accessible (`redis-cli ping`)
- [ ] Backend health check passes (`curl http://localhost:5000/api/health`)
- [ ] Register endpoint works
- [ ] Login endpoint works
- [ ] Task creation works with valid token
- [ ] All validation tests pass (`node workflow-test.js`)
- [ ] No errors in logs (`docker-compose logs`)

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f backend`
2. Run tests: `node workflow-test.js`
3. Verify environment: `cat .env`
4. Check connectivity: `curl http://localhost:5000/api/health`
