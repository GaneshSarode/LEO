'use client';

import { useState, useEffect, useRef } from 'react';
import { getTasks, deleteTask, updateTask } from '@/lib/firebase';
import { calculatePriorityScore, sortByPriority } from '@/lib/taskEngine';
import { askGemini, askGeminiRaw } from '@/lib/gemini';
import { differenceInHours } from 'date-fns';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function TaskList({ onFocus, onStuck, userProfile }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTaskData, setEditTaskData] = useState(null);
  const [reprioritizing, setReprioritizing] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');
  const [urgentBanner, setUrgentBanner] = useState('');
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const bannerFetched = useRef(false);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const data = await getTasks();
    // Attach live priority scores
    const scored = data.map(t => ({
      ...t,
      priorityScore: calculatePriorityScore(t)
    }));
    setTasks(sortByPriority(scored));
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && !bannerFetched.current && !dismissedBanner) {
      const urgentTask = tasks.find(t => !t.completed && t.deadline && differenceInHours(new Date(t.deadline), new Date()) < 6 && differenceInHours(new Date(t.deadline), new Date()) >= 0);
      if (urgentTask) {
        bannerFetched.current = true;
        askGeminiRaw(`Task '${urgentTask.title}' is due in ${Math.floor(differenceInHours(new Date(urgentTask.deadline), new Date()))} hours. One urgent coaching sentence under 15 words. No emojis.`)
        .then(data => {
          if (data.text) setUrgentBanner(data.text.trim());
        })
        .catch(console.error);
      }
    }
  }, [tasks, dismissedBanner]);

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
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div className="task-search-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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

        {urgentBanner && !dismissedBanner && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            background: 'rgba(239, 68, 68, 0.2)', 
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{urgentBanner}</span>
            </div>
            <button onClick={() => setDismissedBanner(true)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>✕</button>
          </div>
        )}

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
        {loadingTasks ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <span style={{ color: 'var(--text-secondary)', animation: 'pulse 1.5s infinite' }}>Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
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

      {/* Priority Info Card */}
      {!loadingTasks && tasks.length > 0 && (
        <div style={{
          marginTop: '40px',
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-elevated)',
          borderLeft: '4px solid var(--accent-primary)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          lineHeight: '1.6'
        }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            ℹ️ How LEO sorts your tasks
          </h4>
          <p style={{ margin: 0 }}>
            Your tasks are sorted automatically using a dynamic priority score (0-100) based on four factors:
            <br/>• <strong style={{ color: 'var(--text-primary)' }}>Deadline (40%)</strong>: Closer deadlines get higher scores. Overdue tasks are pinned to the top.
            <br/>• <strong style={{ color: 'var(--text-primary)' }}>Manual Priority (30%)</strong>: Critical {'>'} High {'>'} Medium {'>'} Low.
            <br/>• <strong style={{ color: 'var(--text-primary)' }}>Completion Status (20%)</strong>: Completed tasks drop to the bottom.
            <br/>• <strong style={{ color: 'var(--text-primary)' }}>Subtasks (10%)</strong>: Tasks with fewer completed subtasks score higher because they require more work.
          </p>
        </div>
      )}

      <button 
        className="btn-primary"
        onClick={() => { setEditTaskData(null); setShowModal(true); }}
        style={{ position: 'fixed', bottom: '32px', right: '32px', width: '56px', height: '56px', borderRadius: '28px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
      >
        +
      </button>

      {/* Empty State Popup (First Task Prompt) */}
      {!loadingTasks && tasks.length === 0 && (
        <div 
          onClick={() => { setEditTaskData(null); setShowModal(true); }}
          style={{
            position: 'fixed',
            bottom: '104px', // 32px (button bottom) + 56px (button height) + 16px (gap)
            right: '40px',
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            maxWidth: '280px',
            zIndex: 100,
            cursor: 'pointer',
            animation: 'slideUp 0.3s ease-out, float 3s ease-in-out infinite'
          }}
        >
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            right: '20px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid var(--accent-primary)',
          }}></div>
          <h4 style={{ marginBottom: '4px', fontSize: '15px' }}>👋 Hey {userProfile?.name}!</h4>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
            You don't have any tasks yet. Click here to add your first task and let LEO help you crush it!
          </p>
        </div>
      )}

      <TaskModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={fetchTasks} 
        editTask={editTaskData} 
      />
    </div>
  );
}
