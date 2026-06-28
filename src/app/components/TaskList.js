'use client';

import { useState, useEffect } from 'react';
import { getTasks, deleteTask, updateTask } from '@/lib/firebase';
import { calculatePriorityScore, sortByPriority } from '@/lib/taskEngine';
import { askGemini } from '@/lib/gemini';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function TaskList({ onFocus, onStuck }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTaskData, setEditTaskData] = useState(null);
  const [reprioritizing, setReprioritizing] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');

  const fetchTasks = async () => {
    const data = await getTasks();
    // Attach live priority scores
    const scored = data.map(t => ({
      ...t,
      priorityScore: calculatePriorityScore(t)
    }));
    setTasks(scored);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId) => {
    await deleteTask(taskId);
    fetchTasks();
  };

  const handleToggleComplete = async (task) => {
    await updateTask(task.id, { completed: !task.completed, completedAt: !task.completed ? Date.now() : null });
    fetchTasks();
  };

  const handleEdit = (task) => {
    setEditTaskData(task);
    setShowModal(true);
  };

  const handleBreakdownRefresh = () => {
    fetchTasks();
  };

  const handleReprioritize = async () => {
    setReprioritizing(true);
    setAiReasoning('');
    try {
      const incompleteTasks = tasks.filter(t => !t.completed);
      const data = await askGemini('prioritize', { tasks: incompleteTasks.map(t => ({ id: t.id, title: t.title, deadline: t.deadline, priority: t.priority })) });
      
      if (data.result && typeof data.result === 'string') {
        setAiReasoning(data.result);
      } else if (Array.isArray(data)) {
        // AI returned ordered IDs — reorder tasks
        const orderedIds = data;
        const reordered = [];
        orderedIds.forEach(id => {
          const found = tasks.find(t => t.id === id);
          if (found) reordered.push(found);
        });
        // Append any tasks not in the AI's list
        tasks.forEach(t => {
          if (!reordered.find(r => r.id === t.id)) reordered.push(t);
        });
        setTasks(reordered);
        setAiReasoning('✅ Tasks re-ordered by AI based on urgency and importance.');
      }
    } catch (error) {
      console.error('Reprioritize error:', error);
      // Fallback: sort by local score
      setTasks(prev => sortByPriority(prev));
      setAiReasoning('Sorted by LEO\'s priority engine (deadline proximity + urgency).');
    } finally {
      setReprioritizing(false);
    }
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
          />
          <button
            className="btn-ghost"
            onClick={handleReprioritize}
            disabled={reprioritizing}
            style={{ whiteSpace: 'nowrap', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {reprioritizing ? '⏳ Analyzing...' : '🧠 Re-prioritize with AI'}
          </button>
        </div>

        {aiReasoning && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            border: '1px solid var(--accent-primary)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{aiReasoning}</span>
            <button onClick={() => setAiReasoning('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

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
              onFocus={onFocus}
              onStuck={onStuck}
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
