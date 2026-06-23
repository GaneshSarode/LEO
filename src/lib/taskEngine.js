/**
 * Task prioritisation engine for the Last-Minute Life Saver app.
 *
 * Provides scoring, automatic priority assignment, scheduling
 * suggestions, and productivity statistics.
 */

// ---------------------------------------------------------------------------
// Priority scoring
// ---------------------------------------------------------------------------

const PRIORITY_WEIGHT = {
  deadline: 0.4,
  manual: 0.3,
  completion: 0.2,
  subtasks: 0.1,
};

const MANUAL_PRIORITY_SCORES = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

/**
 * Calculate a 0–100 priority score for a task.
 *
 * Components (weighted):
 *   Deadline proximity  40 %  — closer deadline → higher score; overdue = 100
 *   Manual priority     30 %  — critical 100 … low 25
 *   Completion status   20 %  — incomplete = 100, complete = 0
 *   Subtask progress    10 %  — fewer completed subtasks → higher score
 *
 * @param {object} task
 * @returns {number} Score clamped to 0–100.
 */
export function calculatePriorityScore(task) {
  // --- Deadline component ---------------------------------------------------
  let deadlineScore = 50; // default when no deadline
  if (task.deadline) {
    const now = Date.now();
    const dl = new Date(task.deadline).getTime();
    const diffHours = (dl - now) / 3600000;

    if (diffHours < 0) {
      deadlineScore = 100; // overdue
    } else if (diffHours < 2) {
      deadlineScore = 95;
    } else if (diffHours < 12) {
      deadlineScore = 85;
    } else if (diffHours < 24) {
      deadlineScore = 70;
    } else if (diffHours < 72) {
      deadlineScore = 50;
    } else if (diffHours < 168) {
      deadlineScore = 30;
    } else {
      deadlineScore = 15;
    }
  }

  // --- Manual priority component --------------------------------------------
  const manualScore = MANUAL_PRIORITY_SCORES[task.priority] ?? 50;

  // --- Completion component -------------------------------------------------
  const completionScore = task.completed ? 0 : 100;

  // --- Subtask progress component -------------------------------------------
  let subtaskScore = 100;
  if (task.subtasks && task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.completed).length;
    subtaskScore = Math.round(((task.subtasks.length - done) / task.subtasks.length) * 100);
  }

  // --- Weighted total -------------------------------------------------------
  const raw =
    deadlineScore * PRIORITY_WEIGHT.deadline +
    manualScore * PRIORITY_WEIGHT.manual +
    completionScore * PRIORITY_WEIGHT.completion +
    subtaskScore * PRIORITY_WEIGHT.subtasks;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

// ---------------------------------------------------------------------------
// Auto-assign priority label
// ---------------------------------------------------------------------------

/**
 * Derive a priority label from the computed score.
 * @param {object} task
 * @returns {'critical'|'high'|'medium'|'low'}
 */
export function autoAssignPriority(task) {
  const score = calculatePriorityScore(task);
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Sort tasks by priorityScore descending (highest priority first).
 * Returns a new array.
 * @param {Array} tasks
 * @returns {Array}
 */
export function sortByPriority(tasks) {
  if (!tasks) return [];
  return [...tasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}

// ---------------------------------------------------------------------------
// Attention filter
// ---------------------------------------------------------------------------

/**
 * Return tasks that are overdue or due within the next 24 hours.
 * @param {Array} tasks
 * @returns {Array}
 */
export function getTasksNeedingAttention(tasks) {
  if (!tasks) return [];
  const now = Date.now();
  const in24h = now + 24 * 3600000;

  return tasks.filter((t) => {
    if (t.completed) return false;
    if (!t.deadline) return false;
    const dl = new Date(t.deadline).getTime();
    return dl <= in24h; // includes overdue (dl < now)
  });
}

// ---------------------------------------------------------------------------
// Daily schedule suggestion
// ---------------------------------------------------------------------------

/**
 * Generate a simple daily schedule suggestion.
 *
 * Sorts incomplete tasks by priority, estimates 30 minutes per task,
 * and assigns time slots starting from the current hour.
 *
 * @param {Array} tasks
 * @returns {Array<{taskId: string, title: string, suggestedTime: string, durationMinutes: number}>}
 */
export function getDailyScheduleSuggestion(tasks) {
  if (!tasks) return [];

  const incomplete = tasks.filter((t) => !t.completed);
  const sorted = sortByPriority(
    incomplete.map((t) => ({
      ...t,
      priorityScore: t.priorityScore ?? calculatePriorityScore(t),
    })),
  );

  const SLOT_DURATION = 30; // minutes per task
  const startHour = new Date().getHours();
  let currentMinutes = startHour * 60;

  return sorted.map((task) => {
    const hours = Math.floor(currentMinutes / 60) % 24;
    const mins = currentMinutes % 60;
    const suggestedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    currentMinutes += SLOT_DURATION;

    return {
      taskId: task.id,
      title: task.title,
      suggestedTime,
      durationMinutes: SLOT_DURATION,
    };
  });
}

// ---------------------------------------------------------------------------
// Productivity stats
// ---------------------------------------------------------------------------

/**
 * Compute productivity statistics from a task list.
 *
 * @param {Array} tasks
 * @returns {{
 *   total: number,
 *   completed: number,
 *   overdue: number,
 *   completionRate: number,
 *   todayCompleted: number,
 *   streak: number,
 * }}
 */
export function getProductivityStats(tasks) {
  if (!tasks || tasks.length === 0) {
    return { total: 0, completed: 0, overdue: 0, completionRate: 0, todayCompleted: 0, streak: 0 };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => {
    if (t.completed || !t.deadline) return false;
    return new Date(t.deadline).getTime() < now.getTime();
  }).length;

  const todayCompleted = tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false;
    return new Date(t.completedAt).getTime() >= todayStart;
  }).length;

  // Streak: consecutive days (ending today or yesterday) with ≥ 1 completion.
  const streak = computeStreak(tasks);

  return {
    total: tasks.length,
    completed,
    overdue,
    completionRate: Math.round((completed / tasks.length) * 100),
    todayCompleted,
    streak,
  };
}

/**
 * Compute a streak of consecutive days with at least one task completed.
 * @param {Array} tasks
 * @returns {number}
 */
function computeStreak(tasks) {
  const completionDays = new Set();

  tasks.forEach((t) => {
    if (t.completed && t.completedAt) {
      const d = new Date(t.completedAt);
      // Store as YYYY-MM-DD for uniqueness
      completionDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  });

  if (completionDays.size === 0) return 0;

  let streak = 0;
  const day = new Date();
  // Allow starting from today or yesterday
  const todayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  if (!completionDays.has(todayKey)) {
    day.setDate(day.getDate() - 1);
  }

  while (true) {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    if (completionDays.has(key)) {
      streak++;
      day.setDate(day.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
