const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  inputText: { type: String, required: true },
  operation: { 
    type: String, 
    enum: ['uppercase', 'lowercase', 'reverse', 'wordcount'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending'
  },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  logs: [{
    timestamp: String,
    level: String,
    message: String
  }]
}, { timestamps: true });

taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);
