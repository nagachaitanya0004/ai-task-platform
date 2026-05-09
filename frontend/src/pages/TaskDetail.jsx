import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import OperationBadge from '../components/OperationBadge';
import { 
  ArrowLeft, Loader2, CheckCircle2, Clock, Copy, 
  Terminal, Calendar, Activity, ChevronRight, Share2 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef(null);

  const fetchTask = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/tasks/${id}`);
      setTask(data);
    } catch (err) {
      if (loading) toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [id, loading]);

  // Initial fetch
  useEffect(() => {
    fetchTask();
  }, [id]);

  // Polling — separate effect that watches task.status
  useEffect(() => {
    if (!task || !['pending', 'running'].includes(task.status)) return;
    const interval = setInterval(fetchTask, 3000);
    return () => clearInterval(interval);
  }, [task?.status, fetchTask]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.logs?.length]);

  const copyToClipboard = (value) => {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-[80vh] space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
      <p className="text-slate-500 font-medium animate-pulse">Loading execution environment...</p>
    </div>
  );

  if (!task) return (
    <div className="max-w-md mx-auto mt-20 text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
        <Activity size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Task Not Found</h2>
        <p className="text-slate-500">The execution record you're looking for doesn't exist or was deleted.</p>
      </div>
      <button 
        onClick={() => navigate('/dashboard')}
        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors group bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={18} />
          Dashboard
        </button>
        <div className="flex gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                  Task ID: {task._id.slice(-8)}
                  <ChevronRight size={14} />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{task.title}</h1>
              </div>
              <StatusBadge status={task.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Process</p>
                <OperationBadge operation={task.operation} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</p>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Calendar size={14} className="text-slate-400" />
                  {format(new Date(task.createdAt), 'MMM d, p')}
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Updated</p>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Clock size={14} className="text-slate-400" />
                  {format(new Date(task.updatedAt), 'p')}
                </div>
              </div>
            </div>
          </div>

          {/* Result Section */}
          {task.status === 'success' && task.result != null && (
            <div className="bg-emerald-50 rounded-3xl border border-emerald-100 p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-emerald-900 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Execution Result
                </h3>
                <button 
                  onClick={() => copyToClipboard(task.result)}
                  className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 font-bold text-xs bg-white/50 px-3 py-1.5 rounded-lg border border-emerald-200/50 transition-all active:scale-95"
                >
                  <Copy size={14} />
                  Copy Result
                </button>
              </div>
              <div className="bg-white rounded-2xl p-6 text-slate-800 text-lg font-mono whitespace-pre-wrap border border-emerald-200/30 shadow-inner">
                {typeof task.result === 'object' ? JSON.stringify(task.result, null, 2) : String(task.result)}
              </div>
            </div>
          )}

          {/* Failed Section */}
          {task.status === 'failed' && (
            <div className="bg-red-50 rounded-3xl border border-red-100 p-8 space-y-4 shadow-sm">
              <h3 className="text-red-900 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <Activity size={18} className="text-red-600" />
                Execution Failed
              </h3>
              <div className="bg-white rounded-2xl p-6 text-red-700 text-sm font-mono border border-red-200/30">
                {task.error || 'An unknown error occurred during processing.'}
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-sm">
            <h3 className="text-slate-500 font-black text-sm uppercase tracking-widest">Input Raw Content</h3>
            <div className="bg-slate-50 rounded-2xl p-6 text-slate-700 text-sm font-mono whitespace-pre-wrap border border-slate-200/50">
              {task.inputText}
            </div>
          </div>
        </div>

        {/* Right Column - Logs Sidebar */}
        <div className="space-y-8">
          <div className="bg-surface rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] sticky top-24 border border-surface-border">
            <div className="px-6 py-4 border-b border-surface-border bg-surface-card flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={18} className="text-brand-500" />
                Live Console
              </h3>
              {['pending', 'running'].includes(task.status) && (
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></span>
                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" style={{animationDelay: '75ms'}}></span>
                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[12px] scrollbar-thin">
              {task.logs && task.logs.length > 0 ? (
                <div className="space-y-4">
                  {task.logs.map((log, i) => (
                    <div key={i} className="group flex gap-3 items-start">
                      <span className="text-slate-600 font-bold shrink-0">
                        {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : '--:--:--'}
                      </span>
                      <div className="space-y-1">
                        <span className={`font-black uppercase tracking-widest text-[10px] ${
                          log.level === 'error' ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          [{log.level || 'info'}]
                        </span>
                        <p className="text-slate-300 leading-relaxed group-hover:text-white transition-colors">{log.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 bg-surface-card rounded-xl flex items-center justify-center text-slate-600">
                    <Activity size={24} className="animate-pulse" />
                  </div>
                  <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest italic">
                    {['pending', 'running'].includes(task.status) 
                      ? 'Waiting for execution stream...' 
                      : 'No logs recorded for this task.'}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-surface-card border-t border-surface-border">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span className={`w-2 h-2 rounded-full ${
                  ['pending', 'running'].includes(task.status) ? 'bg-brand-500 animate-pulse' : 'bg-emerald-500'
                }`}></span>
                {['pending', 'running'].includes(task.status) ? 'Processing...' : 'Execution Complete'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
