const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createClient } = require('redis');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║              BACKEND INITIALIZATION                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log(`Environment: ${NODE_ENV}`);
console.log(`Port: ${PORT}`);
console.log(`MONGO_URI: ${process.env.MONGO_URI || 'NOT SET'}`);
console.log(`REDIS_HOST: ${process.env.REDIS_HOST || 'NOT SET'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***SET***' : 'NOT SET'}`);
console.log(`CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'NOT SET'}`);
console.log('');

// ─── CORS (MUST be before helmet and all routes) ─────────────────────
const allowedOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (curl, Postman, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, true); // In dev mode, allow anyway but warn
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// ─── Security ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in dev to avoid blocking frontend
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10mb' }));

// Request Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Rate Limiting ───────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // More forgiving for dev/testing
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Redis connection (optional — app works without it) ──────────────
let redisClient = null;
let redisReady = false;

async function connectRedis() {
  try {
    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return false; // Stop retrying after 10 attempts
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      if (redisReady) {
        console.error('❌ Redis Client Error:', err.message);
      }
      redisReady = false;
    });

    redisClient.on('ready', () => {
      redisReady = true;
      console.log('✅ Redis ready');
    });

    await redisClient.connect();
    redisReady = true;
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️  Redis not available — task queuing disabled. App will still work for auth.');
    redisClient = null;
    redisReady = false;
  }
}

app.locals.redisClient = null; // Will be set after connection

// ─── MongoDB connection ──────────────────────────────────────────────
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aitasks';
console.log(`Connecting to MongoDB: ${mongoUri}`);

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log(`Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

// ─── Health endpoint (NO auth) ───────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
    let redisStatus = 'down';
    
    if (redisClient && redisReady) {
      try {
        const pong = await redisClient.ping();
        redisStatus = pong === 'PONG' ? 'up' : 'down';
      } catch (err) {
        redisStatus = 'down';
      }
    }

    const isHealthy = mongoStatus === 'up';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'ok' : 'degraded',
      services: {
        mongo: mongoStatus,
        redis: redisStatus
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      services: { mongo: 'down', redis: 'down' },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    success: false
  });
});

// ─── Global error handler (must be last) ─────────────────────────────
app.use(errorHandler);

// ─── Start server ────────────────────────────────────────────────────
async function startServer() {
  // Try to connect Redis, but don't block server start
  await connectRedis();
  app.locals.redisClient = redisClient;

  app.listen(PORT, () => {
    console.log('');
    console.log(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST   /api/auth/register');
    console.log('  POST   /api/auth/login');
    console.log('  POST   /api/tasks');
    console.log('  GET    /api/tasks');
    console.log('  GET    /api/tasks/:id');
    console.log('  GET    /api/health');
    console.log('');
  });
}

startServer();

module.exports = app;
