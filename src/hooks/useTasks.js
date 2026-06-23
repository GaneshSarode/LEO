'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTasks, addTask, updateTask, deleteTask, onTasksChange } from '@/lib/storage';
import { calculatePriorityScore, autoAssignPriority } from '@/lib/taskEngine';
import { generateId } from '@/lib/utils';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed, overdue
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // priority, deadline, created
  const unsubRef = useRef(null);

  // Load tasks and subscribe to changes
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const unsub = onTasksChange((updatedTasks) => {
          setTasks(updatedTasks || []);
          setLoading(false);
        });
        unsubRef.current = unsub;

        // If onTasksChange returned a function, it's a Firestore unsub
        // If it returned undefined, we need to load manually
        if (!unsub) {
          const initialTasks = await getTasks();
          setTasks(initialTasks || []);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
        setLoading(false);
      }
    };

    loadTasks();

    return () => {
      if (unsubRef.current && typeof unsubRef.current === 'function') {
        unsubRef.current();
      }
    };
  }, []);

  const createTask = useCallback(async (taskData) => {
    const now = new Date().toISOString();
    const newTask = {
      id: generateId(),
      title: taskData.title || '',
      description: taskData.description || '',
      category: taskData.category || 'other',
      priority: taskData.priority || 'medium',
      priorityScore: 0,
      deadline: taskData.deadline || null,
      subtasks: taskData.subtasks || [],
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      aiGenerated: taskData.aiGenerated || false,
      notes: taskData.notes || '',
    };

    // Calculate priority score
    newTask.priorityScore = calculatePriorityScore(newTask);
    if (!taskData.priority || taskData.priority === 'medium') {
      newTask.priority = autoAssignPriority(newTask);
    }

    try {
      await addTask(newTask);
      // For localStorage fallback, update state manually
      setTasks((prev) => {
        const exists = prev.find((t) => t.id === newTask.id);
        if (exists) return prev;
        return [...prev, newTask];
      });
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      return null;
    }
  }, []);

  const editTask = useCallback(async (id, updates) => {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate priority if relevant fields changed
    if (updates.deadline || updates.priority || updates.completed !== undefined || updates.subtasks) {
      const currentTask = tasks.find((t) => t.id === id);
      if (currentTask) {
        const merged = { ...currentTask, ...updatedData };
        updatedData.priorityScore = calculatePriorityScore(merged);
      }
    }

    if (updates.completed === true && !updates.completedAt) {
      updatedData.completedAt = new Date().toISOString();
    }

    try {
      await updateTask(id, updatedData);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updatedData } : t))
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [tasks]);

  const removeTask = useCallback(async (id) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, []);

  const toggleComplete = useCallback(async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      await editTask(id, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : null,
      });
    }
  }, [tasks, editTask]);

  const toggleSubtask = useCallback(async (taskId, subtaskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedSubtasks = task.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      await editTask(taskId, { subtasks: updatedSubtasks });
    }
  }, [tasks, editTask]);

  // Filtered and sorted tasks
  const filteredTasks = tasks
    .filter((task) => {
      // Status filter
      if (filter === 'active' && task.completed) return false;
      if (filter === 'completed' && !task.completed) return false;
      if (filter === 'overdue') {
        if (task.completed) return false;
        if (!task.deadline) return false;
        if (new Date(task.deadline) > new Date()) return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return (b.priorityScore || 0) - (a.priorityScore || 0);
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  // Stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    active: tasks.filter((t) => !t.completed).length,
    overdue: tasks.filter(
      (t) => !t.completed && t.deadline && new Date(t.deadline) < new Date()
    ).length,
    completionRate:
      tasks.length > 0
        ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
        : 0,
    todayCompleted: tasks.filter((t) => {
      if (!t.completedAt) return false;
      const today = new Date();
      const completed = new Date(t.completedAt);
      return (
        completed.getDate() === today.getDate() &&
        completed.getMonth() === today.getMonth() &&
        completed.getFullYear() === today.getFullYear()
      );
    }).length,
    dueSoon: tasks.filter((t) => {
      if (t.completed || !t.deadline) return false;
      const hoursLeft = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 24;
    }).length,
  };

  return {
    tasks,
    filteredTasks,
    loading,
    stats,
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    createTask,
    editTask,
    removeTask,
    toggleComplete,
    toggleSubtask,
  };
}
