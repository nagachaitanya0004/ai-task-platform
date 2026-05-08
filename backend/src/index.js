require('dotenv').config();
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

// CORS MUST BE BEFORE HELMET AND ROUTES
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:80',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors()); // handle preflight

// Security Middleware - Helmet with explicit config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));

app.use(express.json({ limit: '10mb' }));

// Request Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting - Global tier
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});
app.use(globalLimiter);

// Rate Limiting - Auth tier (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// Redis connection
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.on('ready', () => console.log('✅ Redis ready'));
app.locals.redisClient = redisClient;

// Database connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aitasks';
console.log(`Connecting to MongoDB: ${mongoUri}`);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log(`Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Connection event handlers
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

// Health endpoint - NO auth required
app.get('/api/health', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
    let redisStatus = 'down';
    
    try {
      const pong = await redisClient.ping();
      redisStatus = pong === 'PONG' ? 'up' : 'down';
    } catch (err) {
      redisStatus = 'down';
    }

    const isHealthy = mongoStatus === 'up' && redisStatus === 'up';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: 'ok',
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
      services: {
        mongo: 'down',
        redis: 'down'
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    success: false
  });
});

// Global error handler (must be last)
app.use(errorHandler);

async function startServer() {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected');
    
    app.listen(PORT, () => {
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
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
