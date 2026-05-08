import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    let interval;
    const fetchTask = async () => {
      try {
        const { data } = await api.get(`/api/tasks/${id}`);
        setTask(data);
        setError('');
      } catch (err) {
        setError('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();

    if (task && ['pending', 'running'].includes(task.status)) {
      interval = setInterval(fetchTask, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, task?.status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.logs]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="text-center p-8 bg-red-50 text-red-600 rounded-xl">
        <p>{error || 'Task not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <span className="uppercase tracking-wider font-semibold text-xs text-blue-600">{task.operation}</span>
              •
              <span>Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
            </p>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="p-6 grid gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Input Text</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-800 text-sm whitespace-pre-wrap font-mono border border-gray-100">
              {task.inputText}
            </div>
          </div>

          {task.status === 'success' && task.result && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Result
              </h3>
              <div className="bg-green-50 rounded-lg p-5 text-gray-800 text-sm whitespace-pre-wrap border border-green-200 shadow-inner">
                {typeof task.result === 'object' ? JSON.stringify(task.result, null, 2) : task.result}
              </div>
            </div>
          )}

          {task.status === 'failed' && task.error && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-2">Error Details</h3>
              <div className="bg-red-50 rounded-lg p-4 text-red-800 text-sm whitespace-pre-wrap border border-red-200">
                {task.error}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Execution Logs
          </h3>
          {['pending', 'running'].includes(task.status) && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
        <div className="p-4 h-64 overflow-y-auto font-mono text-xs sm:text-sm">
          {task.logs && task.logs.length > 0 ? (
            <div className="space-y-2">
              {task.logs.map((log, i) => (
                <div key={i} className="flex gap-4 hover:bg-gray-800/50 p-1 rounded transition-colors">
                  <span className="text-gray-500 shrink-0">
                    {new Date(log.timestamp).toISOString().split('T')[1].replace('Z', '')}
                  </span>
                  <span className={`${log.level === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-gray-300 break-words">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          ) : (
            <p className="text-gray-600 italic">Waiting for logs...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
