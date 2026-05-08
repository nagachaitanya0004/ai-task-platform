import React from 'react';
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'pending': return <Clock size={12} />;
      case 'running': return <Loader2 size={12} className="animate-spin" />;
      case 'success': return <CheckCircle2 size={12} />;
      case 'failed': return <AlertCircle size={12} />;
      default: return null;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${getStyles()}`}>
      {getIcon()}
      {status}
    </span>
  );
};

export default StatusBadge;
