'use client';

import { useState } from 'react';
import { updateTask } from '@/lib/firebase';
import { calculatePriorityScore } from '@/lib/taskEngine';
import { generateGoogleCalendarLink } from '@/lib/generateICS';
import { askGemini } from '@/lib/gemini';
import { differenceInHours } from 'date-fns';

export default function TaskCard({ task, onDelete, onToggleComplete, onEdit, onBreakdown, onFocus, onStuck }) {
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const priorityScore = task.priorityScore || calculatePriorityScore(task);

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

  const getUrgency = (deadline) => {
    if (!deadline) return null;
    const hrs = differenceInHours(new Date(deadline), new Date());
    if (hrs < 0)   return { label: '❌ Overdue',   cls: 'bg-red-900/60 text-red-300' };
    if (hrs < 6)   return { label: '🔴 URGENT',    cls: 'bg-red-600 text-white animate-pulse' };
    if (hrs < 24)  return { label: '⚠️ Due soon',  cls: 'bg-orange-500/80 text-white' };
    if (hrs < 48)  return { label: '🟡 Coming up', cls: 'bg-yellow-600/70 text-white' };
    return         { label: '🟢 On track',         cls: 'bg-green-900/60 text-green-300' };
  };

  const urgency = getUrgency(task.deadline);

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--accent-danger)';
    if (score >= 60) return 'var(--accent-warning)';
    if (score >= 40) return 'var(--accent-primary)';
    return 'var(--text-muted)';
  };

  const handleBreakdown = async () => {
    setIsBreakingDown(true);
    try {
      const data = await askGemini('breakdown', { title: task.title, deadline: task.deadline });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <h3 style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0, flex: 1 }}>
            {task.title}
          </h3>
          {/* Priority Score Badge */}
          <span 
            className="font-mono"
            style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              color: getScoreColor(priorityScore),
              backgroundColor: 'var(--bg-primary)',
              border: `1px solid ${getScoreColor(priorityScore)}`,
              borderRadius: '6px',
              padding: '2px 6px',
              minWidth: '32px',
              textAlign: 'center'
            }}
          >
            {priorityScore}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {task.category}
          </span>
          <span className={`badge badge-${task.priority}`} style={{ fontSize: '12px', textTransform: 'capitalize' }}>
            {task.priority}
          </span>
          {urgency && !task.completed && (
            <span 
              className={urgency.cls.includes('bg-red-600') ? 'animate-pulse' : ''}
              style={{ 
                fontSize: '11px', 
                padding: '2px 8px', 
                borderRadius: '12px',
                fontWeight: 600,
                // fallback inline styles if tailwind classes don't work
                backgroundColor: urgency.cls.includes('bg-red-600') ? '#dc2626' : urgency.cls.includes('bg-orange') ? 'rgba(249, 115, 22, 0.2)' : urgency.cls.includes('bg-yellow') ? 'rgba(202, 138, 4, 0.2)' : urgency.cls.includes('bg-red-900') ? 'rgba(127, 29, 29, 0.4)' : 'rgba(21, 128, 61, 0.2)',
                color: urgency.cls.includes('text-white') ? 'white' : urgency.cls.includes('text-red-300') ? '#fca5a5' : '#86efac'
              }}
            >
              {urgency.label}
            </span>
          )}
          {task.deadline && (
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
              {getCountdown(task.deadline)}
            </div>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
              <span>{Math.round((completedSubtasks/totalSubtasks)*100)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: `${(completedSubtasks/totalSubtasks)*100}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 0.3s' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '4px' }}>
              {task.subtasks.map((st, i) => (
                <div 
                  key={st.id || i} 
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: st.completed ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: 'pointer' }}
                  onClick={async () => {
                    const newSubtasks = [...task.subtasks];
                    newSubtasks[i].completed = !newSubtasks[i].completed;
                    await updateTask(task.id, { subtasks: newSubtasks });
                    if (onBreakdown) onBreakdown(); // Triggers a parent fetch
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={st.completed || false} 
                    readOnly
                    style={{ cursor: 'pointer', width: '14px', height: '14px', marginTop: '2px' }}
                  />
                  <span style={{ textDecoration: st.completed ? 'line-through' : 'none', lineHeight: '1.4' }}>{st.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!task.completed && (
            <button 
              className="btn-primary" 
              style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} 
              onClick={() => onFocus && onFocus(task)}
            >
              ▶️ Start Working
            </button>
          )}
          {!task.completed && (
            <button 
              className="btn-ghost" 
              style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--accent-warning)', borderColor: 'var(--accent-warning)' }} 
              onClick={() => onStuck && onStuck(task)}
            >
              🆘 I'm Stuck
            </button>
          )}
          <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={handleBreakdown} disabled={isBreakingDown}>
            {isBreakingDown ? '⏳ Breaking down...' : '🔨 Break it down'}
          </button>
          {task.deadline && (
            <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => generateGoogleCalendarLink(task)}>
              📅 Add to Calendar
            </button>
          )}
          <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => onEdit(task)}>✏️ Edit</button>
          <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--accent-danger)', borderColor: 'transparent' }} onClick={() => onDelete(task.id)}>🗑 Delete</button>
        </div>
      </div>
    </div>
  );
}
