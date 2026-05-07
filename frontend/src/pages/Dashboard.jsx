import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operation, setOperation] = useState('uppercase');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    
    try {
      await api.post('/tasks', { title, inputText, operation });
      setTitle('');
      setInputText('');
      setOperation('uppercase');
      fetchTasks();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* LEFT: New Task Form */}
      <div className="lg:w-1/3">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">New Task</h2>
          
          <ErrorMessage message={submitError} />
          
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                id="title"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My first task"
              />
            </div>
            
            <div>
              <label htmlFor="inputText" className="block text-sm font-medium text-gray-700 mb-1">Input Text</label>
              <textarea
                id="inputText"
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to process..."
              />
            </div>
            
            <div>
              <label htmlFor="operation" className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
              <select
                id="operation"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
              >
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="reverse">Reverse</option>
                <option value="wordcount">Word Count</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: Task List */}
      <div className="lg:w-2/3">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Tasks</h2>
        
        <ErrorMessage message={error} />
        
        {loading ? (
          <LoadingSpinner />
        ) : tasks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <li 
                  key={task._id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/tasks/${task._id}`)}
                >
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-primary truncate">{task.title}</p>
                      <div className="flex gap-2 text-xs text-gray-500 items-center">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200">
                          {task.operation}
                        </span>
                        <span>•</span>
                        <span>{new Date(task.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <StatusBadge status={task.status} />
                      <svg className="ml-4 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
