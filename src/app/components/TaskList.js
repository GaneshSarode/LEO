'use client';

import { useState, useEffect } from 'react';
import { getTasks, deleteTask, updateTask } from '@/lib/firebase';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTaskData, setEditTaskData] = useState(null);

  const fetchTasks = async () => {
    const data = await getTasks();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId) => {
    await deleteTask(taskId);
    fetchTasks();
  };

  const handleToggleComplete = async (task) => {
    await updateTask(task.id, { completed: !task.completed });
    fetchTasks();
  };

  const handleEdit = (task) => {
    setEditTaskData(task);
    setShowModal(true);
  };

  const handleBreakdownRefresh = () => {
    fetchTasks();
  };

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    if (filter === 'completed') return task.completed;
    if (filter === 'overdue') return !task.completed && task.deadline && task.deadline < now;
    if (filter === 'today') return !task.completed && task.deadline && task.deadline <= todayEnd.getTime() && task.deadline >= now;
    
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', position: 'relative', minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="Search tasks..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'today', 'overdue', 'completed'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-primary' : 'btn-ghost'}
              style={{ textTransform: 'capitalize', padding: '6px 12px', fontSize: '14px' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        {filteredTasks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No tasks found.</p>
        ) : (
          filteredTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onDelete={handleDelete} 
              onToggleComplete={handleToggleComplete} 
              onEdit={handleEdit}
              onBreakdown={handleBreakdownRefresh}
            />
          ))
        )}
      </div>

      <button 
        className="btn-primary"
        onClick={() => { setEditTaskData(null); setShowModal(true); }}
        style={{ position: 'fixed', bottom: '32px', right: '32px', width: '56px', height: '56px', borderRadius: '28px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
      >
        +
      </button>

      <TaskModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={fetchTasks} 
        editTask={editTaskData} 
      />
    </div>
  );
}
