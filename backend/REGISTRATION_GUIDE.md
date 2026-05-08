# Registration Troubleshooting Guide

## ✅ Issues Fixed

### 1. Missing Environment Variables
**Problem**: Backend couldn't connect to MongoDB and Redis
**Status**: ✅ FIXED
**Solution**: Updated `.env` with all required variables

### 2. Incorrect Database Name
**Problem**: docker-compose.yml uses `aitasks` but .env had different name
**Status**: ✅ FIXED
**Solution**: Updated MONGO_URI to use `aitasks` database

### 3. Poor Error Handling
**Problem**: Registration errors not properly logged or reported
**Status**: ✅ FIXED
**Solution**: Added comprehensive error handling and logging

### 4. Missing Success Responses
**Problem**: Responses didn't include success flag
**Status**: ✅ FIXED
**Solution**: Added `success: true/false` to all responses

---

## 📋 Complete Setup Instructions

### Step 1: Verify Environment Variables

```bash
cat /Users/nagachaitanya/ai-task-platform/.env
```

Expected output:
```
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin
MONGO_URI=mongodb://admin:admin@mongo:27017/aitasks?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=yoursupersecretjwtkeyhere
CORS_ORIGIN=http://localhost:80
NODE_ENV=development
PORT=5000
```

### Step 2: Start Docker Compose

```bash
cd /Users/nagachaitanya/ai-task-platform
docker compose up --build
```

Wait for all services to be ready:
```
✅ MongoDB connected
✅ Redis connected
✅ Server running on port 5000 in development mode
```

### Step 3: Verify Health Endpoint

```bash
curl http://localhost:5000/api/health
```

Expected response (200):
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

### Step 4: Test Registration

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
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Step 5: Test Login

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
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Step 6: Test Task Creation

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

---

## ❌ Common Errors & Solutions

### Error: "Validation failed"

**Cause**: Invalid input data

**Solution**: Check validation rules:
- Username: 3-30 alphanumeric characters
- Email: Valid email format
- Password: 8+ characters with uppercase letter and number

**Example**:
```bash
# ❌ WRONG - password has no uppercase
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# ✅ CORRECT
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Password123"}'
```

### Error: "Username already taken" or "Email already registered"

**Cause**: User already exists in database

**Solution**: Use different username/email or delete existing user from MongoDB

```bash
# View MongoDB
docker exec ai-mongo mongosh -u admin -p admin --authenticationDatabase admin

# In mongosh shell:
use aitasks
db.users.find()
db.users.deleteOne({email: "test@example.com"})
```

### Error: "Invalid email or password"

**Cause**: Email not found or password incorrect

**Solution**: 
1. Verify email is registered
2. Check password is correct
3. Ensure no typos

### Error: "CORS error" in browser

**Cause**: Frontend origin not allowed

**Solution**: Update CORS_ORIGIN in .env
```bash
CORS_ORIGIN=http://localhost:3000  # or your frontend URL
```

### Error: "MongoDB connection error"

**Cause**: MongoDB not running or wrong connection string

**Solution**:
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs ai-mongo

# Verify MONGO_URI in .env
cat .env | grep MONGO_URI

# Expected: mongodb://admin:admin@mongo:27017/aitasks?authSource=admin
```

### Error: "Redis connection error"

**Cause**: Redis not running or wrong host/port

**Solution**:
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs ai-redis

# Verify Redis config in .env
cat .env | grep REDIS
```

### Error: "Internal server error"

**Cause**: Unexpected server error

**Solution**:
1. Check backend logs: `docker logs ai-backend`
2. Look for error messages
3. Verify all environment variables are set
4. Check database and Redis connections

---

## 🧪 Testing Workflow

### Run All Tests

```bash
cd /Users/nagachaitanya/ai-task-platform/backend
node workflow-test.js
```

### Run Diagnostic

```bash
node diagnostic.js
```

### Check Syntax

```bash
node -c src/index.js
node -c src/routes/auth.js
node -c src/routes/tasks.js
```

---

## 📊 Expected Validation Rules

### Register Endpoint

```
POST /api/auth/register
Body: {
  "username": "string (3-30 alphanumeric)",
  "email": "string (valid email)",
  "password": "string (8+ chars, 1 uppercase, 1 number)"
}
```

**Valid Examples**:
```json
{"username": "john_doe", "email": "john@example.com", "password": "MyPassword123"}
{"username": "user123", "email": "user@test.co.uk", "password": "SecurePass456"}
```

**Invalid Examples**:
```json
{"username": "ab", "email": "john@example.com", "password": "Password123"}  // username too short
{"username": "john", "email": "invalid-email", "password": "Password123"}  // invalid email
{"username": "john", "email": "john@example.com", "password": "password123"}  // no uppercase
{"username": "john", "email": "john@example.com", "password": "Password"}  // no number
{"username": "john", "email": "john@example.com", "password": "Pass1"}  // too short
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

## 🔍 Debugging Tips

### View Backend Logs

```bash
docker logs -f ai-backend
```

### View MongoDB Logs

```bash
docker logs -f ai-mongo
```

### View Redis Logs

```bash
docker logs -f ai-redis
```

### Check All Services

```bash
docker ps
```

### Connect to MongoDB

```bash
docker exec -it ai-mongo mongosh -u admin -p admin --authenticationDatabase admin
```

### Connect to Redis

```bash
docker exec -it ai-redis redis-cli
```

---

## ✅ Verification Checklist

- [ ] `.env` file has all required variables
- [ ] Docker services are running (`docker ps`)
- [ ] MongoDB is accessible
- [ ] Redis is accessible
- [ ] Health endpoint returns 200
- [ ] Registration works with valid data
- [ ] Login works with correct credentials
- [ ] Task creation works with valid token
- [ ] All validation tests pass
- [ ] No errors in logs

---

## 📝 Next Steps

1. **Verify environment**: `node diagnostic.js`
2. **Start services**: `docker compose up --build`
3. **Test health**: `curl http://localhost:5000/api/health`
4. **Test registration**: Use curl command above
5. **Check logs**: `docker logs -f ai-backend`
6. **Run tests**: `node workflow-test.js`

---

## 🆘 Still Having Issues?

1. Check all environment variables are set
2. Verify Docker services are running
3. Check backend logs for detailed errors
4. Ensure correct database name (`aitasks`)
5. Verify MongoDB and Redis are healthy
6. Try deleting and recreating containers
7. Check for port conflicts (5000, 6379, 27017)

If issues persist, provide the error message from:
```bash
docker logs ai-backend
```
