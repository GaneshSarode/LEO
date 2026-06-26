'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, ListTodo, Calendar, Bot } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import AIChat from './components/AIChat';
import ScheduleView from './components/ScheduleView';
import ReminderEngine from './components/ReminderEngine';

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profile = localStorage.getItem('leo_user_profile');
    if (profile) {
      try {
        setUserProfile(JSON.parse(profile));
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
    setLoading(false);
  }, []);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>Loading...</div>;

  if (!userProfile) {
    return <OnboardingScreen onComplete={(profile) => {
      localStorage.setItem('leo_user_profile', JSON.stringify(profile));
      setUserProfile(profile);
    }} />;
  }

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
            Hi Learners
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        {activeView === 'dashboard' && <Dashboard onNavigate={setActiveView} userProfile={userProfile} />}
        {activeView === 'tasks' && <TaskList />}
        {activeView === 'schedule' && <ScheduleView />}
        {activeView === 'coach' && <AIChat userProfile={userProfile} />}
      </main>

    </div>
  );
}

function OnboardingScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ name: name.trim(), role });
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1 className="font-heading" style={{ fontSize: '32px', color: 'var(--accent-primary)', marginBottom: '8px' }}>Welcome to LEO</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Your Last-minute Execution Officer.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>What should I call you?</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>What best describes you?</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
            >
              <option value="student">Student</option>
              <option value="professional">Professional</option>
              <option value="entrepreneur">Entrepreneur</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '12px', fontSize: '16px' }}>
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
