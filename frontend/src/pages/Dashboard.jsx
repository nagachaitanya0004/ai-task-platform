import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import OperationBadge from '../components/OperationBadge';
import TaskCard from '../components/TaskCard';
import { 
  Loader2, Plus, LayoutDashboard, Clock, CheckCircle, 
  Play, ListFilter, Search, ArrowUpRight, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', operation: 'uppercase', inputText: '' });

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
    const interval = setInterval(fetchTasks, 10000); // Background refresh
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tasks', formData);
      toast.success('Task submitted successfully!');
      setFormData({ title: '', operation: 'uppercase', inputText: '' });
      setIsFormOpen(false);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'success').length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-brand-600" size={32} />
            Platform Dashboard
          </h1>
          <p className="text-slate-500 font-medium">Manage and monitor your AI processing pipelines</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
            isFormOpen 
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
              : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/20'
          }`}
        >
          {isFormOpen ? <ChevronUp size={20} /> : <Plus size={20} />}
          {isFormOpen ? 'Close Editor' : 'New Task'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Tasks', val: stats.total, icon: ListFilter, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Pending', val: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Running', val: stats.running, icon: Play, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Completed', val: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 leading-none">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Form */}
      {isFormOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-50 px-8 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Zap className="text-brand-500" size={18} />
              Task Configuration
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Customer Review Analysis"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Operation</label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.operation}
                    onChange={(e) => setFormData({...formData, operation: e.target.value})}
                  >
                    <option value="uppercase">🔠 Uppercase Transformation</option>
                    <option value="lowercase">🔡 Lowercase Transformation</option>
                    <option value="reverse">🔄 String Reversal</option>
                    <option value="wordcount">🔢 Word Count Analysis</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Input Content</label>
              <textarea
                required
                rows={4}
                placeholder="Paste your text content here for processing..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                value={formData.inputText}
                onChange={(e) => setFormData({...formData, inputText: e.target.value})}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-10 py-3 rounded-xl shadow-lg shadow-brand-600/20 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play size={18} fill="currentColor" /> Run Task</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900">Task Execution Queue</h2>
            <div className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-black tracking-widest uppercase">
              Live
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter tasks..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
              <p className="text-slate-500 font-medium">Synchronizing task queue...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                <ListFilter size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-slate-900">No tasks yet</p>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">Create your first processing task using the "New Task" button above.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 text-slate-400 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4">Task Info</th>
                  <th className="px-8 py-4">Operation</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4">Execution Time</th>
                  <th className="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map(task => (
                  <TaskCard key={task._id} task={task} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
