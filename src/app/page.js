'use client';

import { useState } from 'react';
import { LayoutDashboard, ListTodo, Calendar, Bot } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import AIChat from './components/AIChat';
import ScheduleView from './components/ScheduleView';
import ReminderEngine from './components/ReminderEngine';

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'coach', label: 'AI Coach', icon: Bot },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw' }}>
      
      {/* Context-Aware Reminders — always mounted */}
      <ReminderEngine onNavigate={() => setActiveView('tasks')} />

      {/* Sidebar */}
      <aside style={{ 
        width: '240px', 
        backgroundColor: 'var(--bg-surface)', 
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 className="font-heading" style={{ fontSize: '28px', color: 'var(--accent-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            LEO
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Last-minute Execution Officer
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Powered by Gemini AI
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        {activeView === 'dashboard' && <Dashboard onNavigate={setActiveView} />}
        {activeView === 'tasks' && <TaskList />}
        {activeView === 'schedule' && <ScheduleView />}
        {activeView === 'coach' && <AIChat />}
      </main>

    </div>
  );
}
