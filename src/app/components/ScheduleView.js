'use client';

import { useState, useEffect } from 'react';
import { getTasks, updateTask } from '@/lib/firebase';
import { startOfWeek, addDays, format, isSameDay, differenceInHours } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function ScheduleView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    const data = await getTasks();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i));

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  const getUrgencyClass = (deadline, completed) => {
    if (completed) return 'bg-elevated border-elevated text-secondary';
    if (!deadline) return 'bg-primary border-primary text-primary';
    const hrs = differenceInHours(new Date(deadline), new Date());
    if (hrs < 0) return 'bg-danger border-danger text-white opacity-80';
    if (hrs < 24) return 'bg-warning border-warning text-white';
    return 'bg-success border-success text-white';
  };

  const getUrgencyStyles = (deadline, completed) => {
    if (completed) return { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' };
    if (!deadline) return { background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
    
    const hrs = differenceInHours(new Date(deadline), new Date());
    if (hrs < 0) return { background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5' };
    if (hrs < 24) return { background: 'rgba(249, 115, 22, 0.3)', border: '1px solid #f97316', color: '#fdba74' };
    return { background: 'rgba(21, 128, 61, 0.3)', border: '1px solid #15803d', color: '#86efac' };
  };

  const handleMarkComplete = async (taskId) => {
    await updateTask(taskId, { completed: true, completedAt: Date.now() });
    setSelectedTask(null);
    fetchTasks();
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schedule...</div>;
  }

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="schedule-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="font-heading" style={{ fontSize: '28px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar style={{ color: 'var(--accent-primary)' }} /> Schedule
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-ghost" onClick={prevWeek} style={{ padding: '8px' }}><ChevronLeft size={20} /></button>
          <span className="font-heading" style={{ fontSize: '16px', minWidth: '150px', textAlign: 'center' }}>
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <button className="btn-ghost" onClick={nextWeek} style={{ padding: '8px' }}><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="schedule-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', 
        gap: '12px',
        flex: 1,
        alignItems: 'stretch'
      }}>
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const dayTasks = tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));

          return (
            <div 
              key={i} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                overflow: 'hidden'
              }}
            >
              <div style={{ 
                padding: '12px', 
                textAlign: 'center', 
                borderBottom: '1px solid var(--border)',
                background: isToday ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{format(day, 'EEE')}</div>
                <div className="font-heading" style={{ fontSize: '24px', color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{format(day, 'd')}</div>
              </div>

              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, background: dayTasks.length === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                {dayTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '12px' }}>—</div>
                ) : (
                  dayTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        ...getUrgencyStyles(task.deadline, task.completed)
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>
                        {format(new Date(task.deadline), 'h:mm a')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Popup */}
      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '350px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', textDecoration: selectedTask.completed ? 'line-through' : 'none' }}>{selectedTask.title}</h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              Due: {format(new Date(selectedTask.deadline), 'PP p')}
              <br/>
              Priority: <span style={{ textTransform: 'capitalize' }}>{selectedTask.priority}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setSelectedTask(null)}>Close</button>
              {!selectedTask.completed && (
                <button className="btn-primary" onClick={() => handleMarkComplete(selectedTask.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> Mark Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
