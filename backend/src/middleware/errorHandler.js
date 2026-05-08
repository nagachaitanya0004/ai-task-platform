const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    isOperational: err.isOperational,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      error: err.message,
      success: false
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation error',
      details: messages,
      success: false
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: `${field} already exists`,
      success: false
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      success: false
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      success: false
    });
  }

  if (isProduction) {
    return res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }

  res.status(500).json({
    error: err.message,
    stack: err.stack,
    success: false
  });
};

module.exports = errorHandler;
