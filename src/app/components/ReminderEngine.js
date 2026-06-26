'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getTasks } from '@/lib/firebase';
import { getTasksNeedingAttention } from '@/lib/taskEngine';
import { X, AlertTriangle } from 'lucide-react';

export default function ReminderEngine({ onNavigate }) {
  const [bannerItems, setBannerItems] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const notifiedIdsRef = useRef(new Set());
  const intervalRef = useRef(null);
  const notificationsSupported = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      notificationsSupported.current = true;
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const formatTimeDiff = (deadlineMs) => {
    const now = Date.now();
    const diffMs = deadlineMs - now;

    if (diffMs < 0) {
      const overdueMins = Math.abs(Math.floor(diffMs / 60000));
      if (overdueMins < 60) return `overdue by ${overdueMins} minute${overdueMins !== 1 ? 's' : ''}`;
      const overdueHrs = Math.floor(overdueMins / 60);
      return `overdue by ${overdueHrs} hour${overdueHrs !== 1 ? 's' : ''}`;
    }

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `due in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    const diffHrs = Math.floor(diffMins / 60);
    return `due in ${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`;
  };

  const checkTasks = useCallback(async () => {
    try {
      const tasks = await getTasks();
      const attentionTasks = getTasksNeedingAttention(tasks);

      // Build banner items for all attention-needing tasks
      const items = attentionTasks.map((task) => {
        const deadlineMs = new Date(task.deadline).getTime();
        const timeDiffStr = formatTimeDiff(deadlineMs);
        return {
          task,
          message: `'${task.title}' is ${timeDiffStr}!`,
        };
      });

      setBannerItems(items);

      // Fire browser notifications for tasks due within 1 hour that haven't been notified yet
      const now = Date.now();
      const oneHourFromNow = now + 60 * 60 * 1000;

      attentionTasks.forEach((task) => {
        const deadlineMs = new Date(task.deadline).getTime();
        const isDueWithinOneHour = deadlineMs <= oneHourFromNow;
        const alreadyNotified = notifiedIdsRef.current.has(task.id);

        if (isDueWithinOneHour && !alreadyNotified) {
          notifiedIdsRef.current.add(task.id);

          if (
            notificationsSupported.current &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification('⏰ LEO Reminder', {
                body: `'${task.title}' is due soon!`,
                icon: '/favicon.ico',
                tag: `leo-reminder-${task.id}`,
              });
            } catch (err) {
              console.warn('Failed to send notification:', err);
            }
          }
        }
      });
    } catch (err) {
      console.error('ReminderEngine: error checking tasks:', err);
    }
  }, []);

  // Set up the interval on mount
  useEffect(() => {
    // Run immediately on mount
    checkTasks();

    // Then every 60 seconds
    intervalRef.current = setInterval(checkTasks, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkTasks]);

  const handleDismiss = (taskId) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  };

  const handleTaskClick = (task) => {
    if (onNavigate) {
      onNavigate(task);
    }
  };

  // Filter out dismissed items
  const visibleItems = bannerItems.filter(
    (item) => !dismissedIds.has(item.task.id)
  );

  // Don't render anything if no visible banners
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
    }}>
      {visibleItems.map((item) => {
        const deadlineMs = new Date(item.task.deadline).getTime();
        const isOverdue = deadlineMs < Date.now();

        return (
          <div
            key={item.task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              backgroundColor: isOverdue
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              borderBottom: `1px solid ${
                isOverdue
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)'
              }`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
              minWidth: 0,
            }}>
              <AlertTriangle
                size={16}
                style={{
                  color: isOverdue ? 'var(--accent-danger)' : 'var(--accent-warning)',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: '13px',
                color: isOverdue ? 'var(--accent-danger)' : 'var(--accent-warning)',
                fontWeight: 500,
              }}>
                {isOverdue ? '🚨' : '⚠️'}
              </span>
              <span style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                <span
                  onClick={() => handleTaskClick(item.task)}
                  style={{
                    cursor: onNavigate ? 'pointer' : 'default',
                    textDecoration: onNavigate ? 'underline' : 'none',
                    textDecorationColor: isOverdue
                      ? 'var(--accent-danger)'
                      : 'var(--accent-warning)',
                    textUnderlineOffset: '2px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                  }}
                >
                  {item.task.title}
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  is {formatTimeDiff(new Date(item.task.deadline).getTime())}!
                </span>
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              marginLeft: '12px',
            }}>
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                {new Date(item.task.deadline).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button
                onClick={() => handleDismiss(item.task.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'none';
                }}
                aria-label="Dismiss reminder"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
