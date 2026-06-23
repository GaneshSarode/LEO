/**
 * Gemini AI client for the Last-Minute Life Saver app.
 *
 * Each helper builds a request payload with the appropriate system prompt
 * and forwards it to the Next.js API route `/api/gemini`.
 *
 * All public functions are async and return `null` on failure so the UI
 * can degrade gracefully when AI is unavailable.
 */

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPTS = {
  breakdown:
    'You are a task breakdown specialist. Given a task title and optional description, break it into 3-7 actionable subtasks. Return JSON array: [{"title": "subtask", "estimatedMinutes": number}]. Only return the JSON, no markdown.',

  prioritize:
    'You are a productivity expert. Given a list of tasks with their deadlines and descriptions, rank them by urgency and importance. Return JSON array of task IDs in order of priority with brief reasoning: [{"id": "...", "reason": "..."}]. Only return JSON.',

  schedule:
    'You are a daily planner. Given tasks and the current time, create an optimal schedule. Consider task priority, deadlines, and energy levels (morning=high focus, afternoon=moderate, evening=low). Return JSON: [{"taskId": "...", "suggestedTime": "HH:MM", "duration": minutes, "reason": "..."}]. Only return JSON.',

  coach:
    'You are LEO, an AI productivity coach inside "The Last-Minute Life Saver" app. You help users manage tasks, overcome procrastination, and boost productivity. You have access to their task list. Be encouraging, practical, and concise. Use emojis sparingly. If they share their tasks context, reference specific tasks by name.',

  nudge:
    'Generate a brief, motivational productivity nudge (1-2 sentences). Be specific and actionable, not generic. Return only the text.',

  dailySummary:
    'Given the user task stats, generate a brief personalized daily insight (2-3 sentences). Mention specific numbers. Be encouraging but honest. Return only the text.',
};

// ---------------------------------------------------------------------------
// Core API call
// ---------------------------------------------------------------------------

/**
 * Call the internal Gemini API route.
 *
 * @param {keyof SYSTEM_PROMPTS} action - Which system prompt to use.
 * @param {string} userMessage - The user-facing message / payload.
 * @param {object|null} taskContext - Optional task context to include.
 * @returns {Promise<string|null>} Raw response text or null on failure.
 */
export async function callGemini(action, userMessage, taskContext = null) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        message: userMessage,
        taskContext,
      }),
    });

    if (!res.ok) {
      console.error(`Gemini API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data?.reply ?? data?.text ?? null;
  } catch (err) {
    console.error('Gemini API call failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// JSON response parser
// ---------------------------------------------------------------------------

/**
 * Safely parse a JSON response from the AI.
 * Handles responses wrapped in markdown code blocks (```json … ```).
 *
 * @param {string} text
 * @returns {any|null} Parsed value or null on failure.
 */
export function parseJSONResponse(text) {
  if (!text) return null;

  try {
    // Strip optional markdown fences
    let cleaned = text.trim();

    // Remove ```json … ``` or ``` … ```
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    return JSON.parse(cleaned);
  } catch {
    console.warn('Failed to parse JSON response from AI:', text);
    return null;
  }
}

// ---------------------------------------------------------------------------
// High-level helpers
// ---------------------------------------------------------------------------

/**
 * Break a task into subtasks.
 * @param {string} title
 * @param {string} [description='']
 * @returns {Promise<Array<{title: string, estimatedMinutes: number}>|null>}
 */
export async function breakdownTask(title, description = '') {
  const message = description
    ? `Task: ${title}\nDescription: ${description}`
    : `Task: ${title}`;

  const raw = await callGemini('breakdown', message);
  return parseJSONResponse(raw);
}

/**
 * Ask the AI to prioritise a set of tasks.
 * @param {Array} tasks
 * @returns {Promise<Array<{id: string, reason: string}>|null>}
 */
export async function prioritizeTasks(tasks) {
  const summaries = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline,
    priority: t.priority,
    description: t.description,
  }));

  const raw = await callGemini('prioritize', JSON.stringify(summaries));
  return parseJSONResponse(raw);
}

/**
 * Ask the AI to suggest a daily schedule.
 * @param {Array} tasks
 * @returns {Promise<Array<{taskId: string, suggestedTime: string, duration: number, reason: string}>|null>}
 */
export async function suggestSchedule(tasks) {
  const summaries = tasks
    .filter((t) => !t.completed)
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      priority: t.priority,
      priorityScore: t.priorityScore,
    }));

  const message = `Current time: ${new Date().toLocaleTimeString()}\nTasks:\n${JSON.stringify(summaries)}`;

  const raw = await callGemini('schedule', message);
  return parseJSONResponse(raw);
}

/**
 * Chat with the AI productivity coach.
 * @param {string} message - User message.
 * @param {Array} chatHistory - Previous chat messages for context.
 * @param {Array} tasks - Current task list for context.
 * @returns {Promise<string|null>}
 */
export async function chatWithCoach(message, chatHistory = [], tasks = []) {
  const taskSummary = tasks.slice(0, 10).map((t) => ({
    title: t.title,
    priority: t.priority,
    deadline: t.deadline,
    completed: t.completed,
  }));

  const contextParts = [];
  if (chatHistory.length > 0) {
    const recent = chatHistory.slice(-6);
    contextParts.push(
      'Recent conversation:\n' +
        recent.map((m) => `${m.role}: ${m.content}`).join('\n'),
    );
  }
  if (taskSummary.length > 0) {
    contextParts.push(`User's tasks:\n${JSON.stringify(taskSummary)}`);
  }

  const fullMessage = contextParts.length
    ? `${contextParts.join('\n\n')}\n\nUser: ${message}`
    : message;

  return callGemini('coach', fullMessage);
}

/**
 * Get a daily productivity insight based on stats.
 * @param {{total: number, completed: number, overdue: number, completionRate: number, todayCompleted: number, streak: number}} stats
 * @returns {Promise<string|null>}
 */
export async function getDailyInsight(stats) {
  const message = `Here are the user's task stats:\n${JSON.stringify(stats)}`;
  return callGemini('dailySummary', message);
}
