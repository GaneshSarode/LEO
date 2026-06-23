'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { useAI } from '@/hooks/useAI';

const CATEGORIES = [
  { id: 'work', label: '💼 Work' },
  { id: 'personal', label: '🏠 Personal' },
  { id: 'health', label: '💪 Health' },
  { id: 'learning', label: '📚 Learning' },
  { id: 'finance', label: '💰 Finance' },
  { id: 'other', label: '📌 Other' },
];

const PRIORITIES = [
  { id: 'critical', label: 'Critical', color: 'var(--priority-critical)' },
  { id: 'high', label: 'High', color: 'var(--priority-high)' },
  { id: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { id: 'low', label: 'Low', color: 'var(--priority-low)' },
];

export default function TaskModal({ task, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    deadline: '',
    subtasks: [],
    notes: '',
  });
  const [newSubtask, setNewSubtask] = useState('');
  const { breakdownTask, loading: aiLoading } = useAI();

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'other',
        priority: task.priority || 'medium',
        deadline: task.deadline ? task.deadline.slice(0, 16) : '',
        subtasks: task.subtasks || [],
        notes: task.notes || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        deadline: '',
        subtasks: [],
        notes: '',
      });
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave({
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
    });
    onClose();
  };

  const handleAIBreakdown = async () => {
    if (!formData.title.trim()) return;
    const subtasks = await breakdownTask(formData.title, formData.description);
    if (subtasks && Array.isArray(subtasks)) {
      const newSubtasks = subtasks.map((st) => ({
        id: generateId(),
        title: st.title,
        completed: false,
        estimatedMinutes: st.estimatedMinutes || 30,
      }));
      setFormData((prev) => ({
        ...prev,
        subtasks: [...prev.subtasks, ...newSubtasks],
      }));
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setFormData((prev) => ({
      ...prev,
      subtasks: [
        ...prev.subtasks,
        { id: generateId(), title: newSubtask.trim(), completed: false },
      ],
    }));
    setNewSubtask('');
  };

  const removeSubtask = (id) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== id),
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="input"
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="textarea"
                placeholder="Add more details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Category & Priority Row */}
            <div className="form-row">
              <div className="form-group form-group-half">
                <label className="form-label">Category</label>
                <select
                  className="select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group form-group-half">
                <label className="form-label">Priority</label>
                <div className="priority-selector">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`priority-option ${formData.priority === p.id ? 'priority-option-active' : ''}`}
                      style={{ '--priority-color': p.color }}
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            {/* Subtasks */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">Subtasks</label>
                <button
                  type="button"
                  className="btn btn-ai btn-sm"
                  onClick={handleAIBreakdown}
                  disabled={aiLoading || !formData.title.trim()}
                >
                  {aiLoading ? (
                    <>
                      <Loader2 size={14} className="spin" /> Breaking down...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> AI Break Down
                    </>
                  )}
                </button>
              </div>

              {formData.subtasks.length > 0 && (
                <div className="subtask-list">
                  {formData.subtasks.map((st) => (
                    <div key={st.id} className="subtask-item subtask-item-editable">
                      <span className="subtask-title">{st.title}</span>
                      {st.estimatedMinutes && (
                        <span className="text-muted text-sm">{st.estimatedMinutes}m</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-danger-hover"
                        onClick={() => removeSubtask(st.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="subtask-add">
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Add a subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!formData.title.trim()}>
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
