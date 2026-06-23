/**
 * Utility helpers for the Last-Minute Life Saver productivity app.
 */

/**
 * Generate a unique random ID.
 * Uses crypto.randomUUID when available, otherwise falls back to
 * a Date.now + Math.random composite string.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Format a date as "Mon, Jun 23".
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date's time component as "5:30 PM".
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Return a human-readable relative time string.
 * Examples: "in 2 hours", "3 days ago", "overdue by 1 day".
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target - now;
  const absDiffMs = Math.abs(diffMs);

  const minutes = Math.floor(absDiffMs / 60000);
  const hours = Math.floor(absDiffMs / 3600000);
  const days = Math.floor(absDiffMs / 86400000);

  const formatUnit = (value, unit) =>
    `${value} ${unit}${value === 1 ? '' : 's'}`;

  if (diffMs >= 0) {
    // Future
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `in ${formatUnit(minutes, 'minute')}`;
    if (hours < 24) return `in ${formatUnit(hours, 'hour')}`;
    return `in ${formatUnit(days, 'day')}`;
  }

  // Past / overdue
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `overdue by ${formatUnit(minutes, 'minute')}`;
  if (hours < 24) return `overdue by ${formatUnit(hours, 'hour')}`;
  return `overdue by ${formatUnit(days, 'day')}`;
}

/**
 * Classify a deadline into an urgency tier.
 * @param {Date|string|number|null} deadline
 * @returns {'critical'|'high'|'medium'|'low'|'overdue'|null}
 */
export function getDeadlineUrgency(deadline) {
  if (!deadline) return null;

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl - now;
  const hours = diffMs / 3600000;

  if (diffMs < 0) return 'overdue';
  if (hours < 2) return 'critical';
  if (hours < 24) return 'high';
  if (hours < 72) return 'medium';
  return 'low';
}

/**
 * Return the CSS custom-property name for a given priority level.
 * @param {'critical'|'high'|'medium'|'low'} priority
 * @returns {string}
 */
export function getPriorityColor(priority) {
  const map = {
    critical: 'var(--priority-critical)',
    high: 'var(--priority-high)',
    medium: 'var(--priority-medium)',
    low: 'var(--priority-low)',
  };
  return map[priority] || 'var(--priority-low)';
}

/**
 * Return a human-friendly label for a priority level.
 * @param {'critical'|'high'|'medium'|'low'} priority
 * @returns {string}
 */
export function getPriorityLabel(priority) {
  const map = {
    critical: '🔴 Critical',
    high: '🟠 High',
    medium: '🟡 Medium',
    low: '🟢 Low',
  };
  return map[priority] || 'Low';
}

/**
 * Truncate text to maxLength, appending an ellipsis if needed.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Return a time-of-day greeting.
 * @returns {string}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Calculate the completion percentage of a task array.
 * @param {Array<{completed: boolean}>} tasks
 * @returns {number} 0–100
 */
export function calculateCompletionRate(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Group tasks by their category field.
 * @param {Array<{category: string}>} tasks
 * @returns {Record<string, Array>}
 */
export function groupTasksByCategory(tasks) {
  if (!tasks) return {};
  return tasks.reduce((groups, task) => {
    const key = task.category || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
    return groups;
  }, {});
}

/**
 * Sort tasks by priorityScore descending (highest first).
 * Returns a new sorted array without mutating the original.
 * @param {Array<{priorityScore: number}>} tasks
 * @returns {Array}
 */
export function sortTasksByPriority(tasks) {
  if (!tasks) return [];
  return [...tasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}
