const express = require('express');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/auth');
const redisClient = require('../index').redisClient;

const router = express.Router();

router.use(verifyToken);

router.post('/', async (req, res) => {
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

    // Push to Redis
    const redisClient = req.app.locals.redisClient;
    const jobPayload = JSON.stringify({
      taskId: task._id.toString(),
      operation,
      inputText
    });
    
    await redisClient.lPush('task_queue', jobPayload);
    
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.req.params?.id || req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
