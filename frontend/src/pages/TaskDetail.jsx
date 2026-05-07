import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const logsEndRef = useRef(null);

  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    
    // Polling setup
    let intervalId;
    if (task?.status === 'pending' || task?.status === 'running' || !task) {
      intervalId = setInterval(() => {
        fetchTask();
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, task?.status]);

  useEffect(() => {
    // Auto-scroll to bottom of logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task?.logs]);

  if (loading && !task) {
    return <LoadingSpinner />;
  }

  if (error && !task) {
    return (
      <div>
        <button onClick={() => navigate('/dashboard')} className="mb-4 text-primary hover:underline flex items-center">
          &larr; Back to Dashboard
        </button>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="mb-6 text-primary hover:text-primary-hover font-medium flex items-center transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </button>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
            <div className="mt-1 flex items-center text-sm text-gray-500">
              <span className="font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-700 text-xs border border-gray-300">
                {task.operation}
              </span>
              <span className="mx-2">•</span>
              <span>{new Date(task.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div>
            <StatusBadge status={task.status} />
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">Input Text</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-gray-800 whitespace-pre-wrap">
              {task.inputText}
            </div>
          </div>

          {task.status === 'success' && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">Result</h3>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-green-900 font-mono whitespace-pre-wrap shadow-inner">
                {task.result}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">Execution Logs</h3>
            <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm shadow-inner">
              {task.logs && task.logs.length > 0 ? (
                <ol className="list-decimal list-inside text-gray-300 space-y-1.5">
                  {task.logs.map((log, idx) => (
                    <li key={idx} className="pb-1 border-b border-gray-800 last:border-0">{log}</li>
                  ))}
                  <div ref={logsEndRef} />
                </ol>
              ) : (
                <div className="text-gray-500 italic h-full flex items-center justify-center">
                  Waiting for worker logs...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
