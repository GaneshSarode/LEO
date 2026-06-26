'use client';

import { useState, useEffect } from 'react';
import { addTask, updateTask } from '@/lib/firebase';

export default function TaskModal({ show, onClose, onSave, editTask, initialTitle = '' }) {
  const [formData, setFormData] = useState({
    title: initialTitle,
    category: 'work',
    priority: 'medium'
  });
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title || '',
        category: editTask.category || 'work',
        priority: editTask.priority || 'medium'
      });
      if (editTask.deadline) {
        const d = new Date(editTask.deadline);
        const pad = (n) => n.toString().padStart(2, '0');
        setDeadlineDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setDeadlineTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setDeadlineDate('');
        setDeadlineTime('');
      }
    } else {
      setFormData({
        title: initialTitle || '',
        category: 'work',
        priority: 'medium'
      });
      setDeadlineDate('');
      setDeadlineTime('');
    }
  }, [editTask, show, initialTitle]);

  if (!show) return null;

  const handleAutoPlan = async () => {
    if (!formData.title) {
      alert('Please enter a title first.');
      return;
    }
    setIsPlanning(true);
    try {
      let finalDeadline = null;
      if (deadlineDate) {
        const t = deadlineTime || '23:59';
        finalDeadline = new Date(`${deadlineDate}T${t}`).getTime();
      }

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'autonomous_plan',
          payload: { title: formData.title, deadline: finalDeadline }
        })
      });
      const data = await res.json();
      
      let subtasks = [];
      if (Array.isArray(data)) {
        subtasks = data.map((st, idx) => ({
          id: Date.now().toString() + idx,
          title: st.title,
          completed: false
        }));
      }

      if (editTask) {
        await updateTask(editTask.id, {
          ...formData,
          deadline: finalDeadline,
          subtasks
        });
      } else {
        await addTask({
          ...formData,
          deadline: finalDeadline,
          completed: false,
          subtasks,
        });
      }
      onSave();
      onClose();
    } catch (e) {
      console.error("Auto plan error:", e);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalDeadline = null;
      if (deadlineDate) {
        const t = deadlineTime || '23:59';
        finalDeadline = new Date(`${deadlineDate}T${t}`).getTime();
      }

      if (editTask) {
        await updateTask(editTask.id, {
          ...formData,
          deadline: finalDeadline
        });
      } else {
        await addTask({
          ...formData,
          deadline: finalDeadline,
          completed: false,
          subtasks: [],
        });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 className="font-heading" style={{ marginBottom: '16px' }}>
          {editTask ? 'Edit Task' : 'New Task'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
            >
              <option value="work">Work</option>
              <option value="study">Study</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Priority</label>
            <select 
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Deadline</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="date" 
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
              />
              <input 
                type="time" 
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              className="btn-ghost" 
              onClick={handleAutoPlan} 
              disabled={isPlanning || !formData.title}
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              {isPlanning ? '⏳ Planning...' : '✨ Let LEO Plan This'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-ghost" onClick={onClose} disabled={isPlanning}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isPlanning}>Save Task</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
