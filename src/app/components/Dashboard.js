'use client';

import { useState, useEffect } from 'react';
import { getTasks } from '@/lib/firebase';
import TaskModal from './TaskModal';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  const fetchTasks = async () => {
    const data = await getTasks();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const todayDate = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const now = Date.now();

  const dueTodayCount = tasks.filter(t => !t.completed && t.deadline && t.deadline <= todayEnd.getTime() && t.deadline > now).length;
  const overdueCount = tasks.filter(t => !t.completed && t.deadline && t.deadline < now).length;
  const completedCount = tasks.filter(t => t.completed).length;

  const upcomingTasks = tasks
    .filter(t => !t.completed && t.deadline)
    .sort((a, b) => a.deadline - b.deadline)
    .slice(0, 5);

  const getCountdown = (deadlineTime) => {
    const diff = deadlineTime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (diff < 0) return <span style={{ color: 'var(--accent-danger)' }}>OVERDUE</span>;
    if (days > 2) return <span style={{ color: 'var(--text-secondary)' }}>{days} days left</span>;
    return <span style={{ color: 'var(--accent-warning)' }}>{hours} hours left</span>;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', minHeight: '100%' }}>
      <header>
        <h1 className="font-heading" style={{ fontSize: '32px', marginBottom: '8px' }}>Good morning, Ganesh</h1>
        <p className="font-heading" style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
          {todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-primary)', marginBottom: '4px' }}>{dueTodayCount}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Due Today</p>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-danger)', marginBottom: '4px' }}>{overdueCount}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overdue</p>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-success)', marginBottom: '4px' }}>{completedCount}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Completed</p>
        </div>
      </div>

      <section>
        <h2 className="font-heading" style={{ fontSize: '20px', marginBottom: '16px' }}>Upcoming Deadlines</h2>
        <div className="card" style={{ padding: '0' }}>
          {upcomingTasks.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming deadlines.</p>
          ) : (
            upcomingTasks.map((task, i) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: i < upcomingTasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <h4 style={{ marginBottom: '4px' }}>{task.title}</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{task.category}</span>
                    <span className={`badge badge-${task.priority}`} style={{ fontSize: '10px' }}>{task.priority}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px' }}>{formatDate(task.deadline)}</div>
                  <div className="font-mono" style={{ fontSize: '12px', marginTop: '4px' }}>{getCountdown(task.deadline)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
        <input 
          type="text" 
          placeholder="Add a task..." 
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          style={{ flex: 1, padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quickAddTitle.trim() !== '') setShowModal(true);
          }}
        />
        <button className="btn-primary" onClick={() => quickAddTitle.trim() !== '' && setShowModal(true)}>Add</button>
      </div>

      <TaskModal 
        show={showModal} 
        onClose={() => { setShowModal(false); setQuickAddTitle(''); }} 
        onSave={() => { fetchTasks(); setQuickAddTitle(''); }} 
        editTask={null}
        initialTitle={quickAddTitle}
      />
    </div>
  );
}
