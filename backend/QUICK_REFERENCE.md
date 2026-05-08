# Backend Quick Reference Guide

## File Structure
```
backend/src/
├── index.js                 # Main app with security middleware
├── middleware/
│   ├── auth.js             # JWT verification
│   ├── validate.js         # Joi validation middleware
│   └── errorHandler.js     # Global error handler
├── routes/
│   ├── auth.js             # Register/Login endpoints
│   └── tasks.js            # Task CRUD endpoints
├── models/
│   ├── User.js             # User schema with indexes
│   └── Task.js             # Task schema with indexes
└── validators/
    ├── auth.js             # Auth validation schemas
    └── task.js             # Task validation schemas
```

## Security Features Implemented

### 1. Input Validation
All endpoints validate input using Joi schemas:
- **Register**: username (3-30 alphanum), email (valid), password (8+ with uppercase/lowercase/number)
- **Login**: email (valid), password (required)
- **Create Task**: title (1-100), inputText (1-10000), operation (enum)

### 2. Authentication
- JWT tokens with 24h expiration
- Token passed in Authorization header: `Bearer <token>`
- Verified on protected routes

### 3. Rate Limiting
- Global: 100 req/15min per IP
- Auth endpoints: 10 req/15min per IP
- Prevents brute force attacks

### 4. Security Headers (Helmet)
- CSP: Restricts scripts/styles to self
- HSTS: 1 year with subdomains
- X-Frame-Options: deny
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled

### 5. CORS
- Restricted to CORS_ORIGIN environment variable
- Credentials enabled for cookies
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS

### 6. CSRF Protection
- SameSite=Strict cookies
- Secure + HttpOnly flags
- JWT token-based auth

### 7. Error Handling
- No stack traces in production
- Generic error messages for 500s
- Operational errors return specific messages
- Centralized via global error handler

### 8. Observability
- Morgan request logging (combined/dev format)
- Health endpoint: GET /api/health
- Docker health check every 30s
- Structured error logging

## API Endpoints

### Authentication
```
POST /api/auth/register
  Body: { username, email, password }
  Response: { token, user: { id, username, email } }

POST /api/auth/login
  Body: { email, password }
  Response: { token, user: { id, username, email } }
```

### Tasks (Requires Auth)
```
POST /api/tasks
  Headers: Authorization: Bearer <token>
  Body: { title, inputText, operation }
  Response: { _id, userId, title, inputText, operation, status, result, logs, createdAt, updatedAt }

GET /api/tasks
  Headers: Authorization: Bearer <token>
  Response: [{ task objects }]

GET /api/tasks/:id
  Headers: Authorization: Bearer <token>
  Response: { task object }
```

### Health (No Auth)
```
GET /api/health
  Response: { status, services: { mongo, redis }, uptime, timestamp }
  Status: 200 (healthy) or 503 (degraded)
```

## Environment Variables

```bash
# Database
MONGO_URI=mongodb://mongo:27017/ai-task-platform

# Cache
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key-here

# CORS
CORS_ORIGIN=http://localhost:80

# Environment
NODE_ENV=production
PORT=5000
```

## Error Response Format

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "password", "message": "Password must contain at least one uppercase letter..." }
  ]
}
```

### Operational Error (4xx/5xx)
```json
{
  "error": "User already exists"
}
```

### Server Error (500 - Production)
```json
{
  "error": "Internal server error"
}
```

## Testing

Run validation tests:
```bash
npm install
node test-validation.js
```

Expected output:
```
✓ Valid register: PASSED
✓ Invalid register rejected: PASSED
✓ Valid login: PASSED
✓ Valid task: PASSED
✓ Invalid task rejected: PASSED
✓ Valid data passes middleware: PASSED
✓ Invalid data rejected by middleware: PASSED
✓ Weak passwords rejected: PASSED (4/4)
✓ Invalid emails rejected: PASSED (3/3)
✓ Valid operations accepted: PASSED (4/4)
✓ Invalid operation rejected: PASSED
```

## Docker Deployment

Health check configured:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
```

Build and run:
```bash
docker build -t ai-task-backend .
docker run -p 5000:5000 \
  -e MONGO_URI=mongodb://mongo:27017/ai-task-platform \
  -e REDIS_HOST=redis \
  -e JWT_SECRET=secret \
  ai-task-backend
```

## Security Best Practices

1. **Always use HTTPS in production** (TLS/SSL)
2. **Rotate JWT_SECRET regularly**
3. **Monitor rate limit headers** in responses
4. **Review logs for suspicious patterns**
5. **Keep dependencies updated** (npm audit)
6. **Use strong passwords** (enforced by validator)
7. **Restrict CORS_ORIGIN** to known domains
8. **Enable database authentication**
9. **Use environment variables** for secrets
10. **Monitor health endpoint** for service degradation

## Troubleshooting

### Health check failing
- Check MongoDB connection: `mongoose.connection.readyState === 1`
- Check Redis connection: `redisClient.ping()`
- Review logs for connection errors

### Validation errors
- Ensure password has uppercase, lowercase, and number
- Ensure email is valid format
- Ensure task operation is one of: uppercase, lowercase, reverse, wordcount

### Rate limit exceeded
- Wait 15 minutes for window to reset
- Check X-RateLimit-* headers in response
- Implement exponential backoff in client

### CORS errors
- Verify CORS_ORIGIN environment variable
- Check browser console for specific origin
- Ensure credentials: true in fetch options
