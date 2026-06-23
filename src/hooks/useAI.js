'use client';

import { useState, useCallback } from 'react';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callAI = useCallback(async (action, message, taskContext = null, chatHistory = null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message, taskContext, chatHistory }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed');
      }

      setLoading(false);
      return data.result;
    } catch (err) {
      console.error('AI call failed:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  const breakdownTask = useCallback(async (title, description = '') => {
    const message = description
      ? `Task: "${title}"\nDescription: ${description}`
      : `Task: "${title}"`;

    const result = await callAI('breakdown', message);
    if (!result) return null;

    try {
      return parseJSON(result);
    } catch {
      return null;
    }
  }, [callAI]);

  const prioritizeTasks = useCallback(async (tasks) => {
    const taskSummaries = tasks
      .filter((t) => !t.completed)
      .map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        category: t.category,
        description: t.description,
      }));

    const message = JSON.stringify(taskSummaries);
    const result = await callAI('prioritize', message);
    if (!result) return null;

    try {
      return parseJSON(result);
    } catch {
      return null;
    }
  }, [callAI]);

  const suggestSchedule = useCallback(async (tasks) => {
    const activeTasks = tasks
      .filter((t) => !t.completed)
      .map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
        category: t.category,
      }));

    const message = `Current time: ${new Date().toLocaleString()}\nTasks: ${JSON.stringify(activeTasks)}`;
    const result = await callAI('schedule', message);
    if (!result) return null;

    try {
      return parseJSON(result);
    } catch {
      return null;
    }
  }, [callAI]);

  const chatWithCoach = useCallback(async (message, chatHistory = [], tasks = []) => {
    const taskContext = tasks.length > 0
      ? tasks
          .filter((t) => !t.completed)
          .slice(0, 10)
          .map((t) => `- "${t.title}" (${t.priority}, ${t.deadline ? `due ${new Date(t.deadline).toLocaleDateString()}` : 'no deadline'})`)
          .join('\n')
      : null;

    // Convert chat history to format expected by API
    const history = chatHistory.slice(-10).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.content,
    }));

    const result = await callAI('coach', message, taskContext, history);
    return result;
  }, [callAI]);

  const getDailyInsight = useCallback(async (stats) => {
    const message = `Today's stats: ${stats.total} total tasks, ${stats.completed} completed, ${stats.active} active, ${stats.overdue} overdue, ${stats.todayCompleted} completed today, ${stats.completionRate}% overall completion rate, ${stats.dueSoon} due within 24 hours.`;
    const result = await callAI('dailySummary', message);
    return result;
  }, [callAI]);

  const getNudge = useCallback(async () => {
    const result = await callAI('nudge', 'Generate a productivity nudge for right now.');
    return result;
  }, [callAI]);

  return {
    loading,
    error,
    breakdownTask,
    prioritizeTasks,
    suggestSchedule,
    chatWithCoach,
    getDailyInsight,
    getNudge,
  };
}

function parseJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to find array or object in text
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    throw new Error('Could not parse JSON from response');
  }
}
