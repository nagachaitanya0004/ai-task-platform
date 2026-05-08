const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth');

const router = express.Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    console.log('Register attempt:', { username, email });

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('User already exists:', { username, email });
      const err = new Error(existingUser.username === username ? 'Username already taken' : 'Email already registered');
      err.isOperational = true;
      err.statusCode = 400;
      return next(err);
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();
    
    console.log('User created successfully:', { userId: user._id, username, email });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', { email });
      const err = new Error('Invalid email or password');
      err.isOperational = true;
      err.statusCode = 400;
      return next(err);
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch:', { email });
      const err = new Error('Invalid email or password');
      err.isOperational = true;
      err.statusCode = 400;
      return next(err);
    }

    console.log('Login successful:', { userId: user._id, email });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

module.exports = router;
