'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Plus,
  Zap,
  Target,
  CalendarClock,
} from 'lucide-react';
import { formatRelativeTime, getDeadlineUrgency } from '@/lib/utils';

export default function Dashboard({ tasks, stats, onAddTask, onViewChange, onAICoachOpen }) {
  const [dailyInsight, setDailyInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const urgentTasks = tasks
    .filter((t) => !t.completed && t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  const recentlyCompleted = tasks
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 3);

  const fetchInsight = async () => {
    if (loadingInsight || tasks.length === 0) return;
    setLoadingInsight(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dailySummary',
          message: `Today's stats: ${stats.total} total tasks, ${stats.completed} completed, ${stats.active} active, ${stats.overdue} overdue, ${stats.todayCompleted} completed today, ${stats.completionRate}% overall completion rate, ${stats.dueSoon} due within 24 hours.`,
        }),
      });
      const data = await response.json();
      if (data.result) setDailyInsight(data.result);
    } catch (err) {
      console.error('Failed to get daily insight:', err);
    }
    setLoadingInsight(false);
  };

  useEffect(() => {
    if (tasks.length > 0 && !dailyInsight) {
      const timer = setTimeout(fetchInsight, 1000);
      return () => clearTimeout(timer);
    }
  }, [tasks.length]);

  return (
    <div className="dashboard">
      {/* AI Daily Insight */}
      <div className="dashboard-insight">
        <div className="dashboard-insight-header">
          <Sparkles size={18} className="text-gradient-icon" />
          <span className="text-gradient">LEO&apos;s Daily Insight</span>
        </div>
        <p className="dashboard-insight-text">
          {loadingInsight ? (
            <span className="skeleton skeleton-text">&nbsp;</span>
          ) : dailyInsight ? (
            dailyInsight
          ) : tasks.length === 0 ? (
            'Welcome to LEO! Add your first task to get started. I\'ll help you prioritize and plan your day. 🚀'
          ) : (
            'Analyzing your tasks...'
          )}
        </p>
        {!loadingInsight && tasks.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={fetchInsight}>
            <Sparkles size={14} /> Refresh Insight
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-blue">
            <Target size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{stats.active}</span>
            <span className="stat-card-label">Active Tasks</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{stats.todayCompleted}</span>
            <span className="stat-card-label">Done Today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-amber">
            <Clock size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{stats.dueSoon}</span>
            <span className="stat-card-label">Due Soon</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-violet">
            <TrendingUp size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{stats.completionRate}%</span>
            <span className="stat-card-label">Completion</span>
          </div>
        </div>

        {stats.overdue > 0 && (
          <div className="stat-card stat-card-danger">
            <div className="stat-card-icon stat-card-icon-red">
              <AlertTriangle size={20} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats.overdue}</span>
              <span className="stat-card-label">Overdue</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add */}
      <div className="dashboard-quick-add">
        <button className="quick-add-btn" onClick={onAddTask}>
          <Plus size={20} />
          <span>Add a new task...</span>
        </button>
        <button className="btn btn-ai btn-sm" onClick={onAICoachOpen}>
          <Zap size={14} /> Plan My Day
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-columns">
        {/* Upcoming Deadlines */}
        <div className="dashboard-section">
          <h3 className="dashboard-section-title">
            <CalendarClock size={18} /> Upcoming Deadlines
          </h3>
          {urgentTasks.length === 0 ? (
            <div className="empty-state empty-state-sm">
              <p>No upcoming deadlines 🎉</p>
            </div>
          ) : (
            <div className="deadline-list">
              {urgentTasks.map((task) => {
                const urgency = getDeadlineUrgency(task.deadline);
                return (
                  <div
                    key={task.id}
                    className={`deadline-item deadline-${urgency}`}
                    onClick={() => onViewChange('tasks')}
                  >
                    <div className="deadline-item-content">
                      <span className="deadline-item-title">{task.title}</span>
                      <span className={`deadline-badge deadline-badge-${urgency}`}>
                        {formatRelativeTime(task.deadline)}
                      </span>
                    </div>
                    <span className={`tag tag-${task.category}`}>{task.category}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Completed */}
        <div className="dashboard-section">
          <h3 className="dashboard-section-title">
            <CheckCircle2 size={18} /> Recently Completed
          </h3>
          {recentlyCompleted.length === 0 ? (
            <div className="empty-state empty-state-sm">
              <p>Complete your first task! 💪</p>
            </div>
          ) : (
            <div className="completed-list">
              {recentlyCompleted.map((task) => (
                <div key={task.id} className="completed-item">
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="completed-item-title">{task.title}</span>
                  <span className="text-muted text-sm">
                    {formatRelativeTime(task.completedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
