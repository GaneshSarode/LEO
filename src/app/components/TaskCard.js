'use client';

import { Circle, CheckCircle2, Clock, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelativeTime, getDeadlineUrgency, getPriorityLabel } from '@/lib/utils';
import { useState } from 'react';

export default function TaskCard({ task, onToggle, onEdit, onDelete, onToggleSubtask }) {
  const [expanded, setExpanded] = useState(false);
  const urgency = task.deadline ? getDeadlineUrgency(task.deadline) : null;

  const subtasksDone = task.subtasks?.filter((s) => s.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;
  const subtaskProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  return (
    <div
      className={`task-card ${task.completed ? 'task-card-completed' : ''} priority-${task.priority}`}
    >
      <div className="task-card-main">
        <button
          className="task-card-check"
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed ? (
            <CheckCircle2 size={22} className="text-success" />
          ) : (
            <Circle size={22} />
          )}
        </button>

        <div className="task-card-content">
          <div className="task-card-header">
            <h4 className={`task-card-title ${task.completed ? 'task-card-title-done' : ''}`}>
              {task.title}
            </h4>
            <div className="task-card-actions">
              <button className="btn btn-ghost btn-icon" onClick={() => onEdit(task)} title="Edit">
                <Edit3 size={14} />
              </button>
              <button
                className="btn btn-ghost btn-icon btn-danger-hover"
                onClick={() => onDelete(task.id)}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="task-card-description">{task.description}</p>
          )}

          <div className="task-card-meta">
            <span className={`badge badge-priority badge-${task.priority}`}>
              {getPriorityLabel(task.priority)}
            </span>
            <span className={`tag tag-${task.category}`}>{task.category}</span>

            {task.deadline && !task.completed && (
              <span className={`deadline-badge deadline-badge-${urgency}`}>
                <Clock size={12} />
                {formatRelativeTime(task.deadline)}
              </span>
            )}

            {subtasksTotal > 0 && (
              <button
                className="task-card-subtask-toggle"
                onClick={() => setExpanded(!expanded)}
              >
                <div className="progress-ring-mini">
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="var(--border-subtle)" strokeWidth="2" />
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="none"
                      stroke="var(--accent-cyan)"
                      strokeWidth="2"
                      strokeDasharray={`${subtaskProgress * 0.377} 100`}
                      strokeLinecap="round"
                      transform="rotate(-90 8 8)"
                    />
                  </svg>
                </div>
                <span className="text-sm text-muted">
                  {subtasksDone}/{subtasksTotal}
                </span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            {task.aiGenerated && (
              <span className="badge badge-ai">AI</span>
            )}
          </div>

          {/* Subtasks Expandable */}
          {expanded && subtasksTotal > 0 && (
            <div className="task-card-subtasks">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="subtask-item">
                  <button
                    className="subtask-check"
                    onClick={() => onToggleSubtask(task.id, subtask.id)}
                  >
                    {subtask.completed ? (
                      <CheckCircle2 size={14} className="text-success" />
                    ) : (
                      <Circle size={14} />
                    )}
                  </button>
                  <span className={`subtask-title ${subtask.completed ? 'subtask-done' : ''}`}>
                    {subtask.title}
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
