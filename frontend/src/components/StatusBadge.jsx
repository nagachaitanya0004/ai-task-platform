import React from 'react';

const StatusBadge = ({ status }) => {
  const statusStyles = {
    pending: 'bg-gray-100 text-gray-800 border-gray-200',
    running: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse',
    success: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
  };

  const currentStyle = statusStyles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle} uppercase tracking-wider`}>
      {status}
    </span>
  );
};

export default StatusBadge;
