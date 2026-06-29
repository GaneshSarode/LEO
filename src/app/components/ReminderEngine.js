'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getTasks } from '@/lib/firebase';
import { getTasksNeedingAttention } from '@/lib/taskEngine';
import { X, AlertTriangle, Flame, Clock, Zap } from 'lucide-react';

// Escalation levels based on time remaining
const getEscalation = (deadlineMs) => {
  const now = Date.now();
  const diffMs = deadlineMs - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMs < 0) {
    return { level: 'critical', emoji: '🚨', tone: 'OVERDUE', color: 'var(--accent-danger)', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.5)', icon: Flame, pulse: true };
  }
  if (diffHours <= 1) {
    return { level: 'critical', emoji: '🔥', tone: 'URGENT', color: 'var(--accent-danger)', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: Flame, pulse: true };
  }
  if (diffHours <= 6) {
    return { level: 'high', emoji: '⚡', tone: 'ACT NOW', color: 'var(--accent-warning)', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', icon: Zap, pulse: false };
  }
  if (diffHours <= 24) {
    return { level: 'medium', emoji: '⏰', tone: 'HEADS UP', color: 'var(--accent-warning)', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', icon: Clock, pulse: false };
  }
  return { level: 'gentle', emoji: '📋', tone: 'REMINDER', color: 'var(--text-secondary)', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', icon: Clock, pulse: false };
};

const getEscalationMessage = (task, escalation, timeDiffStr) => {
  switch (escalation.level) {
    case 'critical':
      if (timeDiffStr.includes('overdue')) return `Stop everything! "${task.title}" is ${timeDiffStr}. Complete it NOW!`;
      return `"${task.title}" is due in under an hour! Drop what you're doing and finish this.`;
    case 'high':
      return `Hey, your ${task.title} assignment is due soon! Let's get to work!`;
    case 'medium':
      return `"${task.title}" is ${timeDiffStr}. Plan to tackle this today.`;
    default:
      return `"${task.title}" is ${timeDiffStr}. Keep it on your radar.`;
  }
};

export default function ReminderEngine({ onNavigate }) {
  const [bannerItems, setBannerItems] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [permission, setPermission] = useState('default');
  const notifiedIdsRef = useRef(new Set());
  const intervalRef = useRef(null);
  const notificationsSupported = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      notificationsSupported.current = true;
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = () => {
    if (notificationsSupported.current) {
      Notification.requestPermission().then(perm => {
        setPermission(perm);
      });
    }
  };

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
    if (diffHrs < 24) return `due in ${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`;
    const diffDays = Math.floor(diffHrs / 24);
    return `due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const checkTasks = useCallback(async () => {
    try {
      const tasks = await getTasks();
      const attentionTasks = getTasksNeedingAttention(tasks);

      const items = attentionTasks.map((task) => {
        const deadlineMs = new Date(task.deadline).getTime();
        const timeDiffStr = formatTimeDiff(deadlineMs);
        const escalation = getEscalation(deadlineMs);
        return {
          task,
          escalation,
          message: getEscalationMessage(task, escalation, timeDiffStr),
          timeDiffStr,
        };
      });

      // Sort by urgency: critical first
      items.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, gentle: 3 };
        return (order[a.escalation.level] || 3) - (order[b.escalation.level] || 3);
      });

      setBannerItems(items);

      // Fire browser notifications for escalating tasks
      const now = Date.now();
      attentionTasks.forEach((task) => {
        const deadlineMs = new Date(task.deadline).getTime();
        const diffHours = (deadlineMs - now) / (1000 * 60 * 60);
        const shouldNotify = diffHours <= 6 || deadlineMs < now;
        const alreadyNotified = notifiedIdsRef.current.has(task.id);

        if (shouldNotify && !alreadyNotified) {
          notifiedIdsRef.current.add(task.id);
          const esc = getEscalation(deadlineMs);

          if (notificationsSupported.current && Notification.permission === 'granted') {
            try {
              new Notification(`${esc.emoji} LEO ${esc.tone}`, {
                body: getEscalationMessage(task, esc, formatTimeDiff(deadlineMs)),
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

  useEffect(() => {
    checkTasks();
    intervalRef.current = setInterval(checkTasks, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [checkTasks]);

  const handleDismiss = (taskId) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  };

  const visibleItems = bannerItems.filter((item) => !dismissedIds.has(item.task.id));

  if (visibleItems.length === 0 && permission !== 'default') return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px', width: '100%'
    }}>
      {permission === 'default' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderLeft: '3px solid var(--accent-blue)',
          borderRadius: '4px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            Enable push notifications to never miss an urgent task!
          </span>
          <button 
            onClick={requestNotificationPermission}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'var(--accent-blue)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Enable
          </button>
        </div>
      )}

      {visibleItems.map((item) => {
        const { escalation } = item;
        const EscIcon = escalation.icon;

        return (
          <div
            key={item.task.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px',
              backgroundColor: escalation.bg,
              borderBottom: `1px solid ${escalation.border}`,
              borderLeft: `3px solid ${escalation.color}`,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              animation: escalation.pulse ? 'reminderPulse 2s ease-in-out infinite' : 'none',
              borderRadius: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <EscIcon size={16} style={{ color: escalation.color, flexShrink: 0 }} />
              <span style={{
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: escalation.color, padding: '2px 6px', borderRadius: '4px',
                background: `${escalation.color}22`, flexShrink: 0,
              }}>
                {escalation.tone}
              </span>
              <span style={{
                fontSize: '13px', color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.message}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(item.task.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => handleDismiss(item.task.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
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
