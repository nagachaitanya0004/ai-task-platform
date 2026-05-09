const express = require('express');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema } = require('../validators/task');

const router = express.Router();

router.use(verifyToken);

// ─── Inline task processor (used when Redis/Worker is unavailable) ────
async function processTaskInline(taskId) {
  try {
    const task = await Task.findById(taskId);
    if (!task) return;

    // Update to running
    task.status = 'running';
    task.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Started processing operation: ${task.operation}`
    });
    await task.save();

    // Process the operation
    let result;
    switch (task.operation) {
      case 'uppercase':
        result = task.inputText.toUpperCase();
        break;
      case 'lowercase':
        result = task.inputText.toLowerCase();
        break;
      case 'reverse':
        result = task.inputText.split('').reverse().join('');
        break;
      case 'wordcount':
        result = task.inputText.trim().split(/\s+/).filter(w => w.length > 0).length;
        break;
      default:
        throw new Error(`Unknown operation: ${task.operation}`);
    }

    // Update to success
    task.status = 'success';
    task.result = result;
    task.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Task completed successfully'
    });
    await task.save();
    console.log(`✅ Task ${taskId} processed inline: ${task.operation} → ${typeof result === 'string' ? result.substring(0, 50) : result}`);
  } catch (err) {
    console.error(`❌ Inline task processing failed for ${taskId}:`, err.message);
    try {
      await Task.findByIdAndUpdate(taskId, {
        status: 'failed',
        $push: {
          logs: {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Task failed: ${err.message}`
          }
        }
      });
    } catch (updateErr) {
      console.error('Failed to update task status:', updateErr.message);
    }
  }
}

// ─── Create Task ─────────────────────────────────────────────────────
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

    // Try to queue to Redis for the Python worker
    const redisClient = req.app.locals.redisClient;
    let queued = false;

    if (redisClient) {
      try {
        const jobPayload = JSON.stringify({
          taskId: task._id.toString(),
          operation,
          inputText
        });
        await redisClient.lPush('task_queue', jobPayload);
        queued = true;
        console.log(`📤 Task ${task._id} queued to Redis for worker`);
      } catch (redisErr) {
        console.warn('⚠️  Redis push failed:', redisErr.message);
      }
    }

    // If Redis is unavailable, process the task inline (no worker needed)
    if (!queued) {
      console.log(`⚡ Redis unavailable — processing task ${task._id} inline`);
      // Process asynchronously so the response returns immediately
      setImmediate(() => processTaskInline(task._id));
    }
    
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// ─── List Tasks ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// ─── Get Single Task ─────────────────────────────────────────────────
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
