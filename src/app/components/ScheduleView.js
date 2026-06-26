'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTasks } from '@/lib/firebase';
import { getDailyScheduleSuggestion } from '@/lib/taskEngine';
import { RefreshCw, Calendar, Clock, Sparkles } from 'lucide-react';

export default function ScheduleView() {
  const [schedule, setSchedule] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(''); // 'ai' or 'local'

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const buildSchedule = useCallback(async (taskList) => {
    const incompleteTasks = taskList.filter((t) => !t.completed);

    if (incompleteTasks.length === 0) {
      setSchedule([]);
      setSource('');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          payload: { tasks: incompleteTasks },
        }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((slot) => {
          const matchedTask = taskList.find((t) => t.id === slot.taskId);
          return {
            time: slot.time || slot.suggestedTime || '--:--',
            activity: slot.activity || slot.title || 'Untitled',
            taskId: slot.taskId || null,
            category: matchedTask?.category || null,
            priority: matchedTask?.priority || null,
          };
        });
        setSchedule(mapped);
        setSource('ai');
        setLoading(false);
        return;
      }

      throw new Error('Invalid AI response');
    } catch (err) {
      console.warn('AI schedule failed, using local fallback:', err.message);
      const localSchedule = getDailyScheduleSuggestion(taskList);
      const mapped = localSchedule.map((slot) => {
        const matchedTask = taskList.find((t) => t.id === slot.taskId);
        return {
          time: slot.suggestedTime,
          activity: slot.title,
          taskId: slot.taskId,
          category: matchedTask?.category || null,
          priority: matchedTask?.priority || null,
        };
      });
      setSchedule(mapped);
      setSource('local');
      setLoading(false);
    }
  }, []);

  const loadAndSchedule = useCallback(async () => {
    setLoading(true);
    const data = await getTasks();
    setTasks(data);
    await buildSchedule(data);
  }, [buildSchedule]);

  useEffect(() => {
    loadAndSchedule();
  }, [loadAndSchedule]);

  const handleRegenerate = () => {
    loadAndSchedule();
  };

  // Skeleton loader
  const SkeletonSlot = () => (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        flexShrink: 0,
        marginTop: '6px',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{
          height: '14px',
          width: '60px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '4px',
          marginBottom: '8px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          height: '60px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '8px',
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: '0.2s',
        }} />
      </div>
    </div>
  );

  return (
    <div style={{
      padding: '32px',
      maxWidth: '700px',
      margin: '0 auto',
      minHeight: '100%',
    }}>
      {/* Pulse animation keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
          }}>
            <Calendar size={22} style={{ color: 'var(--accent-primary)' }} />
            <h1 className="font-heading" style={{ fontSize: '28px', margin: 0 }}>
              Today&#39;s Plan
            </h1>
          </div>
          <p className="font-heading" style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            margin: 0,
          }}>
            {todayFormatted}
          </p>
          {source && !loading && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              fontSize: '11px',
              color: source === 'ai' ? 'var(--accent-glow)' : 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: source === 'ai'
                ? 'rgba(99, 102, 241, 0.12)'
                : 'rgba(71, 85, 105, 0.15)',
            }}>
              {source === 'ai' ? <Sparkles size={11} /> : <Clock size={11} />}
              {source === 'ai' ? 'AI-generated schedule' : 'Local schedule'}
            </div>
          )}
        </div>

        <button
          className="btn-ghost"
          onClick={handleRegenerate}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            padding: '8px 14px',
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}
          />
          Regenerate
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Content */}
      {loading ? (
        /* Skeleton Loading State */
        <div style={{
          position: 'relative',
          paddingLeft: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Skeleton timeline line */}
          <div style={{
            position: 'absolute',
            left: '5px',
            top: '0',
            bottom: '0',
            width: '2px',
            backgroundColor: 'var(--bg-elevated)',
          }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonSlot key={i} />
          ))}
        </div>
      ) : schedule.length === 0 ? (
        /* Empty State */
        <div className="card" style={{
          textAlign: 'center',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <Calendar size={40} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            margin: 0,
          }}>
            No tasks to schedule. Add some tasks first!
          </p>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '13px',
            margin: 0,
          }}>
            Once you add tasks, LEO will create an optimized daily plan for you.
          </p>
        </div>
      ) : (
        /* Timeline */
        <div style={{
          position: 'relative',
          paddingLeft: '24px',
        }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute',
            left: '5px',
            top: '6px',
            bottom: '6px',
            width: '2px',
            backgroundColor: 'var(--accent-primary)',
            opacity: 0.4,
            borderRadius: '1px',
          }} />

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {schedule.map((slot, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'flex-start',
                  position: 'relative',
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '18px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  border: '2px solid var(--bg-primary)',
                  boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
                  zIndex: 1,
                }} />

                {/* Time label */}
                <div style={{
                  minWidth: '52px',
                  paddingTop: '14px',
                  flexShrink: 0,
                }}>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '14px',
                      color: 'var(--accent-glow)',
                      fontWeight: 600,
                    }}
                  >
                    {slot.time}
                  </span>
                </div>

                {/* Activity card */}
                <div
                  className="card"
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    cursor: 'default',
                    transition: 'border-color 0.2s',
                    borderLeft: `3px solid ${
                      slot.priority === 'critical'
                        ? 'var(--accent-danger)'
                        : slot.priority === 'high'
                        ? 'var(--accent-warning)'
                        : slot.priority === 'medium'
                        ? 'var(--accent-primary)'
                        : 'var(--border)'
                    }`,
                  }}
                >
                  <h4 style={{
                    fontSize: '15px',
                    margin: '0 0 8px 0',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                  }}>
                    {slot.activity}
                  </h4>

                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}>
                    {slot.category && (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        textTransform: 'capitalize',
                      }}>
                        {slot.category}
                      </span>
                    )}
                    {slot.priority && (
                      <span
                        className={`badge badge-${slot.priority}`}
                        style={{
                          fontSize: '10px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {slot.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
