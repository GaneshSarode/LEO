'use client';

import { useState } from 'react';
import { updateTask } from '@/lib/firebase';

export default function TaskCard({ task, onDelete, onToggleComplete, onEdit, onBreakdown }) {
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const getCountdown = (deadlineTime) => {
    if (!deadlineTime) return null;
    const now = Date.now();
    const diff = deadlineTime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (diff < 0) {
      return <span style={{ color: 'var(--accent-danger)' }} className="font-mono">OVERDUE</span>;
    } else if (days > 2) {
      return <span style={{ color: 'var(--text-secondary)' }} className="font-mono">{days} days left</span>;
    } else {
      return <span style={{ color: 'var(--accent-warning)' }} className="font-mono">{hours} hours left</span>;
    }
  };

  const handleBreakdown = async () => {
    setIsBreakingDown(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'breakdown',
          payload: { title: task.title, deadline: task.deadline }
        })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const subtasks = data.map((st, idx) => ({
          id: Date.now().toString() + idx,
          title: st.title,
          completed: false
        }));
        await updateTask(task.id, { subtasks });
        if (onBreakdown) onBreakdown();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBreakingDown(false);
    }
  };

  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  return (
    <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <input 
        type="checkbox" 
        checked={task.completed} 
        onChange={() => onToggleComplete(task)}
        style={{ marginTop: '4px', width: '20px', height: '20px', cursor: 'pointer' }}
      />
      <div style={{ flex: 1 }}>
        <h3 style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: '8px' }}>
          {task.title}
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {task.category}
          </span>
          <span className={`badge badge-${task.priority}`} style={{ fontSize: '12px', textTransform: 'capitalize' }}>
            {task.priority}
          </span>
          {task.deadline && (
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
              {getCountdown(task.deadline)}
            </div>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
              <span>{Math.round((completedSubtasks/totalSubtasks)*100)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(completedSubtasks/totalSubtasks)*100}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={handleBreakdown} disabled={isBreakingDown}>
            {isBreakingDown ? 'Breaking down...' : 'Break it down'}
          </button>
          <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => onEdit(task)}>Edit</button>
          <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--accent-danger)', borderColor: 'transparent' }} onClick={() => onDelete(task.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}
