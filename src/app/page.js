'use client';

import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import AIChat from './components/AIChat';
import { useTasks } from '@/hooks/useTasks';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const {
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
  } = useTasks();

  const { prioritizeTasks, loading: aiLoading } = useAI();

  const handleAddTask = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(
    async (taskData) => {
      if (editingTask) {
        await editTask(editingTask.id, taskData);
      } else {
        await createTask(taskData);
      }
      setEditingTask(null);
      setModalOpen(false);
    },
    [editingTask, editTask, createTask]
  );

  const handleAIPrioritize = useCallback(async () => {
    const activeTasks = tasks.filter((t) => !t.completed);
    if (activeTasks.length === 0) return;

    const result = await prioritizeTasks(activeTasks);
    if (result && Array.isArray(result)) {
      // Update task priorities based on AI ranking
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        const priority =
          i < result.length * 0.2
            ? 'critical'
            : i < result.length * 0.4
              ? 'high'
              : i < result.length * 0.7
                ? 'medium'
                : 'low';
        await editTask(item.id, {
          priority,
          priorityScore: 100 - (i / result.length) * 100,
        });
      }
    }
  }, [tasks, prioritizeTasks, editTask]);

  const handleOpenAICoach = useCallback(() => {
    if (activeView === 'ai-coach') {
      setChatOpen(true);
    } else {
      setChatOpen(true);
    }
  }, [activeView]);

  const handleViewChange = useCallback((view) => {
    if (view === 'ai-coach') {
      setChatOpen(true);
    } else {
      setActiveView(view);
    }
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-content">
          <div className="app-loading-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h2 className="text-gradient">Loading LEO...</h2>
          <div className="skeleton skeleton-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        stats={stats}
      />

      <div className="app-main">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stats={stats}
          onAICoachOpen={handleOpenAICoach}
        />

        <main className="main-content">
          {activeView === 'dashboard' && (
            <Dashboard
              tasks={tasks}
              stats={stats}
              onAddTask={handleAddTask}
              onViewChange={setActiveView}
              onAICoachOpen={handleOpenAICoach}
            />
          )}

          {activeView === 'tasks' && (
            <TaskList
              tasks={filteredTasks}
              filter={filter}
              onFilterChange={setFilter}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onToggle={toggleComplete}
              onEdit={handleEditTask}
              onDelete={removeTask}
              onToggleSubtask={toggleSubtask}
              onAddTask={handleAddTask}
              onAIPrioritize={handleAIPrioritize}
              aiLoading={aiLoading}
            />
          )}
        </main>
      </div>

      <TaskModal
        task={editingTask}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      <AIChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        tasks={tasks}
      />
    </div>
  );
}
