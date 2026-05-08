# Backend Security Architecture

## Request Flow with Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER 1: HELMET                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Content-Security-Policy (CSP)                             │   │
│  │ • HTTP Strict-Transport-Security (HSTS)                     │   │
│  │ • X-Frame-Options: deny                                     │   │
│  │ • X-Content-Type-Options: nosniff                           │   │
│  │ • X-XSS-Protection: enabled                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER 2: CORS                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Origin validation (CORS_ORIGIN env var)                   │   │
│  │ • Credentials: true                                         │   │
│  │ • Methods: GET, POST, PUT, DELETE, OPTIONS                  │   │
│  │ • Headers: Content-Type, Authorization                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SECURITY LAYER 3: RATE LIMITING                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Global: 100 req/15min per IP                                │   │
│  │ Auth: 10 req/15min per IP (stricter)                        │   │
│  │ Returns: RateLimit-* headers                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SECURITY LAYER 4: CSRF PROTECTION                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • JWT token in Authorization header (primary)               │   │
│  │ • SameSite=Strict cookies (secondary)                       │   │
│  │ • Secure + HttpOnly flags                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SECURITY LAYER 5: INPUT VALIDATION                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Joi Schemas:                                                │   │
│  │ • Register: username, email, password validation            │   │
│  │ • Login: email, password validation                         │   │
│  │ • Task: title, inputText, operation validation              │   │
│  │ Returns: 400 with detailed error messages                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SECURITY LAYER 6: AUTHENTICATION                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • JWT token verification                                    │   │
│  │ • Token from Authorization header                           │   │
│  │ • 24h expiration                                            │   │
│  │ • Returns: 401 if invalid/missing                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Business logic                                            │   │
│  │ • Database operations                                       │   │
│  │ • Error handling via next(error)                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SECURITY LAYER 7: ERROR HANDLING                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Global error handler (last middleware)                    │   │
│  │ • No stack traces in production                             │   │
│  │ • Generic error messages for 500s                           │   │
│  │ • Specific messages for operational errors                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  OBSERVABILITY LAYER: LOGGING                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Morgan request logging                                    │   │
│  │ • Production: 'combined' format                             │   │
│  │ • Development: 'dev' format                                 │   │
│  │ • Output: stdout (container-friendly)                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT RESPONSE                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Status code (200, 400, 401, 403, 500, 503)                │   │
│  │ • Response body (JSON)                                      │   │
│  │ • Security headers                                          │   │
│  │ • Rate limit headers                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    MONGODB                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User Collection                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Unique Index on email (prevents duplicates)          │ │
│  │ • Password hashed with bcrypt (12 rounds)              │ │
│  │ • Timestamps (createdAt, updatedAt)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Task Collection                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Compound Index: {userId: 1, createdAt: -1}           │ │
│  │   → Fast user task listing with sorting                │ │
│  │ • Index on status: {status: 1}                         │ │
│  │   → Fast filtering by task state                       │ │
│  │ • Timestamps (createdAt, updatedAt)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Health Check Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              GET /api/health (No Auth Required)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Check 1: MongoDB Connection                          │  │
│  │ ├─ mongoose.connection.readyState === 1              │  │
│  │ └─ Result: "up" or "down"                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Check 2: Redis Connection                            │  │
│  │ ├─ await redisClient.ping() === 'PONG'               │  │
│  │ └─ Result: "up" or "down"                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Response:                                            │  │
│  │ ├─ Status: 200 (all up) or 503 (any down)            │  │
│  │ ├─ Services: { mongo, redis }                        │  │
│  │ ├─ Uptime: process.uptime()                          │  │
│  │ └─ Timestamp: ISO 8601                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR OCCURS                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ Is it an Operational Error?        │
        │ (err.isOperational === true)       │
        └────────┬──────────────────┬────────┘
                 │                  │
            YES  │                  │  NO
                 ▼                  ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Return:          │  │ Is Production?   │
        │ {                │  └────────┬─────┬───┘
        │  error: message  │       YES │     │ NO
        │ }                │          ▼     ▼
        │ Status: 4xx/5xx  │    ┌──────────────────┐
        └──────────────────┘    │ Return:          │
                                │ {                │
                                │  error: "Internal│
                                │  server error"   │
                                │ }                │
                                │ Status: 500      │
                                └──────────────────┘
                                        │
                                        │ Also return stack trace
                                        │ for debugging
                                        ▼
                                ┌──────────────────┐
                                │ Return:          │
                                │ {                │
                                │  error: message, │
                                │  stack: trace    │
                                │ }                │
                                │ Status: 500      │
                                └──────────────────┘
```

## Validation Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST BODY                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Joi Schema Validation                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Check required fields                            │   │
│  │ 2. Check field types                                │   │
│  │ 3. Check field lengths/patterns                     │   │
│  │ 4. Check enum values                                │   │
│  │ 5. Collect all errors (abortEarly: false)           │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
    VALID                             INVALID
        │                                 │
        ▼                                 ▼
┌──────────────────┐          ┌──────────────────────┐
│ Pass to handler  │          │ Return 400:          │
│ req.body updated │          │ {                    │
│ with validated   │          │  error: "Validation  │
│ values           │          │  failed",            │
│ (stripUnknown)   │          │  details: [          │
└──────────────────┘          │    {                 │
                              │     field: "...",    │
                              │     message: "..."   │
                              │    }                 │
                              │  ]                   │
                              │ }                    │
                              └──────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KUBERNETES POD                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Backend Container                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Node.js Application                            │  │  │
│  │  │ • Express server on port 5000                  │  │  │
│  │  │ • All security middleware                      │  │  │
│  │  │ • Health endpoint                              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Health Check (Docker)                          │  │  │
│  │  │ • Interval: 30s                                │  │  │
│  │  │ • Timeout: 5s                                  │  │  │
│  │  │ • Start Period: 40s                            │  │  │
│  │  │ • Retries: 3                                   │  │  │
│  │  │ • Command: curl /api/health                    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Kubernetes Probes                                    │  │
│  │ • Liveness: /api/health (30s interval)              │  │
│  │ • Readiness: /api/health (10s interval)             │  │
│  │ • Startup: /api/health (40s delay)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Layers Summary

| Layer | Technology | Purpose | Status |
|-------|-----------|---------|--------|
| 1 | Helmet | HTTP security headers | ✅ Configured |
| 2 | CORS | Cross-origin restrictions | ✅ Hardened |
| 3 | Rate Limit | Brute force prevention | ✅ Two-tier |
| 4 | CSRF | Cross-site request forgery | ✅ JWT + SameSite |
| 5 | Input Validation | Injection prevention | ✅ Joi schemas |
| 6 | Authentication | JWT verification | ✅ 24h tokens |
| 7 | Error Handling | Information disclosure | ✅ Global handler |
| 8 | Logging | Audit trail | ✅ Morgan |
| 9 | Health Checks | Service monitoring | ✅ Implemented |
| 10 | Database Indexes | Query performance | ✅ Created |

All layers working together provide defense-in-depth security.
