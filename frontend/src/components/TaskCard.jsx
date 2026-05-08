import React from 'react';
import { useNavigate } from 'react-router-dom';
import OperationBadge from './OperationBadge';
import StatusBadge from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';

const TaskCard = ({ task }) => {
  const navigate = useNavigate();

  return (
    <tr 
      onClick={() => navigate(`/tasks/${task._id}`)}
      className="group hover:bg-slate-50 cursor-pointer transition-all duration-300"
    >
      <td className="px-8 py-5">
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{task.title}</p>
          <p className="text-[10px] text-slate-400 font-mono">{task._id}</p>
        </div>
      </td>
      <td className="px-8 py-5">
        <OperationBadge operation={task.operation} />
      </td>
      <td className="px-8 py-5">
        <div className="flex justify-center">
          <StatusBadge status={task.status} />
        </div>
      </td>
      <td className="px-8 py-5">
        <p className="text-sm font-bold text-slate-600">
          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </p>
      </td>
      <td className="px-8 py-5 text-right">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all transform group-hover:rotate-12 group-hover:scale-110">
          <ArrowUpRight size={18} />
        </div>
      </td>
    </tr>
  );
};

export default TaskCard;
