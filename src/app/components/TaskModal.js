'use client';

import { useState, useEffect } from 'react';
import { addTask, updateTask } from '@/lib/firebase';

export default function TaskModal({ show, onClose, onSave, editTask, initialTitle = '' }) {
  const [formData, setFormData] = useState({
    title: initialTitle,
    category: 'work',
    priority: 'medium',
    deadline: ''
  });

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title || '',
        category: editTask.category || 'work',
        priority: editTask.priority || 'medium',
        deadline: editTask.deadline ? new Date(editTask.deadline).toISOString().slice(0, 16) : ''
      });
    } else {
      setFormData({
        title: initialTitle || '',
        category: 'work',
        priority: 'medium',
        deadline: ''
      });
    }
  }, [editTask, show, initialTitle]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const deadlineDate = formData.deadline ? new Date(formData.deadline).getTime() : null;
      if (editTask) {
        await updateTask(editTask.id, {
          ...formData,
          deadline: deadlineDate
        });
      } else {
        await addTask({
          ...formData,
          deadline: deadlineDate,
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
            <input 
              type="datetime-local" 
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
