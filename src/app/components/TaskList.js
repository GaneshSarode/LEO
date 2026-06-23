'use client';

import { Plus, SlidersHorizontal, Sparkles, ArrowUpDown } from 'lucide-react';
import TaskCard from './TaskCard';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Done' },
  { id: 'overdue', label: 'Overdue' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'work', label: '💼 Work' },
  { id: 'personal', label: '🏠 Personal' },
  { id: 'health', label: '💪 Health' },
  { id: 'learning', label: '📚 Learning' },
  { id: 'finance', label: '💰 Finance' },
  { id: 'other', label: '📌 Other' },
];

const SORT_OPTIONS = [
  { id: 'priority', label: 'Priority' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'created', label: 'Newest' },
];

export default function TaskList({
  tasks,
  filter,
  onFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortChange,
  onToggle,
  onEdit,
  onDelete,
  onToggleSubtask,
  onAddTask,
  onAIPrioritize,
  aiLoading,
}) {
  return (
    <div className="task-list-container">
      {/* Toolbar */}
      <div className="task-list-toolbar">
        <div className="task-list-toolbar-left">
          <h2 className="task-list-title">Tasks</h2>
          <div className="filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`filter-tab ${filter === tab.id ? 'filter-tab-active' : ''}`}
                onClick={() => onFilterChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="task-list-toolbar-right">
          <button
            className="btn btn-ai btn-sm"
            onClick={onAIPrioritize}
            disabled={aiLoading}
            title="AI Auto-Prioritize"
          >
            <Sparkles size={14} />
            {aiLoading ? 'Prioritizing...' : 'AI Prioritize'}
          </button>
          <div className="sort-dropdown">
            <ArrowUpDown size={14} />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="sort-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`filter-tab filter-tab-sm ${categoryFilter === tab.id ? 'filter-tab-active' : ''}`}
            onClick={() => onCategoryFilterChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No tasks found</h3>
            <p className="text-muted">
              {filter !== 'all'
                ? 'Try changing your filters'
                : 'Click the button below to add your first task'}
            </p>
            {filter === 'all' && (
              <button className="btn btn-primary" onClick={onAddTask}>
                <Plus size={16} /> Add Task
              </button>
            )}
          </div>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id} className="task-card-wrapper" style={{ animationDelay: `${index * 0.05}s` }}>
              <TaskCard
                task={task}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleSubtask={onToggleSubtask}
              />
            </div>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <button className="fab" onClick={onAddTask} title="Add new task">
        <Plus size={24} />
      </button>
    </div>
  );
}
