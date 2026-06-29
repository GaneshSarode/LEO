'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, ListTodo, Calendar, Bot, Menu, X, Flame } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import AIChat from './components/AIChat';
import ScheduleView from './components/ScheduleView';
import HabitsView from './components/HabitsView';
import ReminderEngine from './components/ReminderEngine';
import FocusTimer from './components/FocusTimer';

const MOTIVATIONAL_SLOGANS = [
  "I am believing in you,<br/>You Can Do It!",
  "Focus Today,<br/>Crush Tomorrow.",
  "Small Steps Today,<br/>Big Wins Tomorrow.",
  "Discipline Now,<br/>Freedom Later.",
  "Less Distraction,<br/>More Action.",
  "Don't Stop Until<br/>You're Proud.",
  "You Don't Need More Time,<br/>You Need More Focus.",
  "Be Stronger Than<br/>Your Excuses.",
  "Energy Flows Where<br/>Attention Goes.",
  "Track It. Improve It.<br/>Own It.",
  "You vs You,<br/>Every Single Day.",
  "Plan Your Day,<br/>Design Your Future.",
  "Progress, Not<br/>Perfection.",
  "Work in Silence,<br/>Let Success Make Noise.",
  "One Goal.<br/>One LEO Mindset.",
  "Rest Today,<br/>Reset Tomorrow.",
  "Think Smart,<br/>Execute Better.",
  "No More Procrastination,<br/>Only Action."
];

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focusTask, setFocusTask] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [slogan, setSlogan] = useState(MOTIVATIONAL_SLOGANS[0]);

  useEffect(() => {
    setSlogan(MOTIVATIONAL_SLOGANS[Math.floor(Math.random() * MOTIVATIONAL_SLOGANS.length)]);
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
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'coach', label: 'AI Coach', icon: Bot },
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
    setSidebarOpen(false);
  };

  // "I'm Stuck" handler: navigate to AI Coach with a pre-filled unstuck request
  const handleStuck = async (task) => {
    setActiveView('coach');
    // We'll let AIChat handle it via a global event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('leo-unstuck', { detail: task }));
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      
      {/* Context-Aware Reminders */}
      <div style={{ flexShrink: 0, zIndex: 100, position: 'relative' }}>
        <ReminderEngine onNavigate={() => setActiveView('tasks')} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>

      {/* Focus Timer Overlay */}
      {focusTask && (
        <FocusTimer 
          task={focusTask} 
          onClose={() => setFocusTask(null)} 
          onComplete={() => {}} 
        />
      )}

      {/* Mobile Hamburger Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed', top: '16px', left: '16px', zIndex: 200,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '8px', cursor: 'pointer',
          color: 'var(--text-primary)', display: 'none',
        }}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 149, display: 'none',
          }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{ 
          width: '240px', 
          backgroundColor: 'var(--bg-surface)', 
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          flexShrink: 0,
          zIndex: 150,
          transition: 'transform 0.3s ease',
        }}
      >
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
                onClick={() => handleNavClick(item.id)}
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

        {/* Motivation Cat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '16px', padding: '0 8px' }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px',
            position: 'relative',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontStyle: 'italic',
            fontWeight: 500,
            animation: 'pulse 4s infinite'
          }}>
            <div dangerouslySetInnerHTML={{ __html: `"${slogan}"` }} />
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '12px',
              height: '12px',
              background: 'var(--bg-primary)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }} />
          </div>
          
          <svg width="48" height="48" viewBox="0 0 16 16" fill="var(--text-primary)" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', opacity: 0.8 }}>
            {/* Ears */}
            <rect x="4" y="2" width="2" height="3" />
            <rect x="5" y="1" width="1" height="1" />
            <rect x="10" y="2" width="2" height="3" />
            <rect x="10" y="1" width="1" height="1" />
            {/* Head */}
            <rect x="3" y="4" width="10" height="5" />
            {/* Eyes */}
            <rect x="5" y="6" width="2" height="2" fill="var(--bg-surface)" />
            <rect x="9" y="6" width="2" height="2" fill="var(--bg-surface)" />
            {/* Body */}
            <rect x="4" y="9" width="8" height="6" />
            {/* Paws */}
            <rect x="4" y="15" width="2" height="1" />
            <rect x="10" y="15" width="2" height="1" />
            {/* Tail */}
            <rect x="12" y="11" width="1" height="4" />
            <rect x="13" y="10" width="2" height="1" />
          </svg>
        </div>

        {/* Sidebar Footer */}
        <div style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Hi Learners
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'transparent' }}>
        {activeView === 'dashboard' && <Dashboard onNavigate={setActiveView} userProfile={userProfile} />}
        {activeView === 'tasks' && <TaskList onFocus={(task) => setFocusTask(task)} onStuck={handleStuck} userProfile={userProfile} />}
        {activeView === 'schedule' && <ScheduleView />}
        {activeView === 'habits' && <HabitsView userProfile={userProfile} />}
        {activeView === 'coach' && <AIChat userProfile={userProfile} />}
      </main>
      </div>
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
