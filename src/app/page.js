'use client';

import { useState } from 'react';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import AIChat from './components/AIChat';

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'coach', label: 'AI Coach' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw' }}>
      
      {/* Sidebar */}
      <aside style={{ 
        width: '240px', 
        backgroundColor: 'var(--bg-surface)', 
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 className="font-heading" style={{ fontSize: '24px', color: 'var(--accent-primary)', marginBottom: '4px' }}>LEO</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Last-minute Execution Officer</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              style={{
                textAlign: 'left',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeView === item.id ? 'var(--accent-primary)' : 'transparent',
                color: activeView === item.id ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'tasks' && <TaskList />}
        {activeView === 'coach' && <AIChat />}
      </main>

    </div>
  );
}
