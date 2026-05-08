const express = require('express');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema } = require('../validators/task');

const router = express.Router();

router.use(verifyToken);

router.post('/', validate(createTaskSchema), async (req, res, next) => {
  try {
    const { title, inputText, operation } = req.body;
    
    const task = new Task({
      userId: req.user.id,
      title,
      inputText,
      operation,
      status: 'pending'
    });
    
    await task.save();

    // Queue to Redis if available
    const redisClient = req.app.locals.redisClient;
    if (redisClient) {
      try {
        const jobPayload = JSON.stringify({
          taskId: task._id.toString(),
          operation,
          inputText
        });
        await redisClient.lPush('task_queue', jobPayload);
      } catch (redisErr) {
        console.warn('⚠️  Redis unavailable, task saved but not queued:', redisErr.message);
      }
    } else {
      console.warn('⚠️  Redis not connected, task saved but not queued');
    }
    
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      const err = new Error('Task not found');
      err.isOperational = true;
      err.statusCode = 404;
      return next(err);
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
