import React from 'react';

const OperationBadge = ({ operation }) => {
  const getStyles = () => {
    switch (operation) {
      case 'uppercase':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'lowercase':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'reverse':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'wordcount':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getLabel = () => {
    switch (operation) {
      case 'uppercase': return '🔠 Uppercase';
      case 'lowercase': return '🔡 Lowercase';
      case 'reverse': return '🔄 Reverse';
      case 'wordcount': return '🔢 Word Count';
      default: return operation;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${getStyles()}`}>
      {getLabel()}
    </span>
  );
};

export default OperationBadge;
