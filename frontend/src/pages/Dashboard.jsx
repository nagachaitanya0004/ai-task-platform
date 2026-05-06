import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operation, setOperation] = useState('uppercase');

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', { title, inputText, operation });
      setTitle('');
      setInputText('');
      setOperation('uppercase');
      fetchTasks();
    } catch (err) {
      alert('Failed to create task');
    }
  };

  return (
    <div>
      <div className="auth-container" style={{ margin: '0 0 2rem 0', maxWidth: '100%' }}>
        <h2>Create New Task</h2>
        <form onSubmit={handleCreateTask}>
          <input 
            type="text" 
            placeholder="Task Title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="Input Text" 
            value={inputText} 
            onChange={e => setInputText(e.target.value)} 
            required 
          />
          <select value={operation} onChange={e => setOperation(e.target.value)}>
            <option value="uppercase">Uppercase</option>
            <option value="lowercase">Lowercase</option>
            <option value="reverse">Reverse</option>
            <option value="wordcount">Word Count</option>
          </select>
          <button type="submit">Submit Task</button>
        </form>
      </div>

      <h2>Your Tasks</h2>
      <div className="task-list">
        {tasks.map(task => (
          <div key={task._id} className="task-item">
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{task.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Operation: {task.operation}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className={`status-badge status-${task.status}`}>
                {task.status}
              </span>
              <Link to={`/tasks/${task._id}`} className="btn" style={{ textDecoration: 'none' }}>
                View Details
              </Link>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p>No tasks yet.</p>}
      </div>
    </div>
  );
}

export default Dashboard;
