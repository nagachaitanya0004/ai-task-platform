import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, PlusCircle, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', operation: 'summarize', inputText: '' });

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/api/tasks');
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tasks', formData);
      setFormData({ title: '', operation: 'summarize', inputText: '' });
      fetchTasks(); // Immediately re-fetch after creation
    } catch (error) {
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const getOperationColor = (op) => {
    const colors = {
      summarize: 'bg-purple-100 text-purple-800',
      analyze: 'bg-indigo-100 text-indigo-800',
      extract: 'bg-cyan-100 text-cyan-800'
    };
    return colors[op] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Form */}
      <div className="w-full lg:w-1/3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            New AI Task
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.operation}
                onChange={(e) => setFormData({...formData, operation: e.target.value})}
              >
                <option value="summarize">Summarize Text</option>
                <option value="analyze">Analyze Sentiment</option>
                <option value="extract">Extract Entities</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Text</label>
              <textarea
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={formData.inputText}
                onChange={(e) => setFormData({...formData, inputText: e.target.value})}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition-colors flex justify-center items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Task'}
            </button>
          </form>
        </div>
      </div>

      {/* Main Task List */}
      <div className="w-full lg:w-2/3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Your Tasks</h2>
            <span className="text-sm text-gray-500">{tasks.length} total</span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No tasks yet. Create one on the left!
              </div>
            ) : (
              tasks.map(task => (
                <div 
                  key={task._id} 
                  onClick={() => navigate(`/tasks/${task._id}`)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors group flex items-start justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getOperationColor(task.operation)}`}>
                        {task.operation}
                      </span>
                      <StatusBadge status={task.status} />
                      <span className="text-gray-400">
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors self-center" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
