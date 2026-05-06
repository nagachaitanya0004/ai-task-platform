import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);

  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTask();
    const interval = setInterval(() => {
      if (task && (task.status === 'pending' || task.status === 'running')) {
        fetchTask();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [id, task?.status]);

  if (!task) return <p>Loading...</p>;

  return (
    <div className="task-detail">
      <Link to="/dashboard" style={{ display: 'inline-block', marginBottom: '1rem' }}>&larr; Back to Dashboard</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{task.title}</h2>
        <span className={`status-badge status-${task.status}`}>{task.status}</span>
      </div>
      
      <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
        <div>
          <strong>Operation:</strong> {task.operation}
        </div>
        <div>
          <strong>Input Text:</strong> 
          <p style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem' }}>
            {task.inputText}
          </p>
        </div>
        
        {task.status === 'success' && (
          <div>
            <strong>Result:</strong>
            <p style={{ background: '#d1fae5', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem', color: '#065f46' }}>
              {task.result}
            </p>
          </div>
        )}

        <div>
          <strong>Execution Logs:</strong>
          <div className="logs-container">
            {task.logs.length > 0 ? (
              task.logs.map((log, index) => <div key={index}>{log}</div>)
            ) : (
              <div>No logs yet...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetail;
