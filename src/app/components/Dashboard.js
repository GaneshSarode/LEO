'use client';

import { useState, useEffect, useRef } from 'react';
import { getTasks } from '@/lib/firebase';
import { getProductivityStats, calculatePriorityScore } from '@/lib/taskEngine';
import { askGemini, askGeminiRaw } from '@/lib/gemini';
import { format } from 'date-fns';
import TaskModal from './TaskModal';
import VoiceButton from './VoiceButton';
import ProgressChart from './ProgressChart';

export default function Dashboard({ onNavigate, userProfile }) {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [dailyBriefing, setDailyBriefing] = useState('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState('');
  const [planning, setPlanning] = useState(false);
  const [dayPlan, setDayPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const briefingFetched = useRef(false);
  const weeklyFetched = useRef(false);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const data = await getTasks();
    setTasks(data);
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && userProfile && !briefingFetched.current) {
      briefingFetched.current = true;
      setLoadingBriefing(true);
      askGemini('briefing', { tasks, userProfile })
      .then(data => {
        if (data.result) setDailyBriefing(data.result);
      })
      .catch(e => console.error("Error fetching briefing", e))
      .finally(() => setLoadingBriefing(false));
    }
  }, [tasks, userProfile]);

  const todayDate = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const now = Date.now();

  // Use taskEngine stats
  const stats = getProductivityStats(tasks);

  const dueTodayCount = tasks.filter(t => !t.completed && t.deadline && t.deadline <= todayEnd.getTime() && t.deadline > now).length;
  const overdueCount = stats.overdue;
  const completedCount = stats.completed;

  const upcomingTasks = tasks
    .filter(t => !t.completed && t.deadline)
    .sort((a, b) => a.deadline - b.deadline)
    .slice(0, 5);

  const getCountdown = (deadlineTime) => {
    const diff = deadlineTime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (diff < 0) return <span style={{ color: 'var(--accent-danger)' }}>OVERDUE</span>;
    if (days > 2) return <span style={{ color: 'var(--text-secondary)' }}>{days} days left</span>;
    return <span style={{ color: 'var(--accent-warning)' }}>{hours} hours left</span>;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const planMyDay = async () => {
    setPlanning(true);
    setShowPlanModal(true);
    const taskList = tasks.filter(t => !t.completed).map(t =>
      `- "${t.title}" due ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'none'}, priority: ${t.priority || 'normal'}`
    ).join('\n');

    const data = await askGeminiRaw(`Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')}.
Tasks:
${taskList}

Build a realistic time-blocked plan for TODAY only.
Respond ONLY with JSON array:
[
  {"time":"9:00 AM","duration":"45 min","task":"Leetcode 20 questions","tip":"Start with easy problems"},
  ...
]
Max 5 blocks. Only include tasks due today or urgent. Be specific.`);

    let parsed = [];
    try {
      parsed = JSON.parse(data.text.replace(/```json|```/g,'').trim());
      setDayPlan(parsed);
    } catch {
      setDayPlan(null);
    }
    setPlanning(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Pdf = reader.result.split(',')[1];
        
        const response = await fetch('/api/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Pdf,
            prompt: "Extract all assignments, exams, and deliverables from this syllabus. Return a JSON array of tasks containing exactly 'title' (string) and 'deadline' (timestamp in milliseconds, assuming current academic year if no year is provided). Do not include any other markdown."
          })
        });
        
        const data = await response.json();
        if (data.tasks && Array.isArray(data.tasks)) {
          const { addTask } = await import('@/lib/firebase');
          for (const task of data.tasks) {
            await addTask({
              title: task.title,
              category: 'study',
              priority: 'high',
              deadline: task.deadline,
              completed: false,
              subtasks: []
            });
          }
          await fetchTasks();
          alert(`Successfully extracted and added ${data.tasks.length} tasks from syllabus!`);
        } else {
          throw new Error('Failed to parse tasks from PDF.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert('Error parsing syllabus. Please try again.');
    } finally {
      setUploadingPdf(false);
      e.target.value = '';
    }
  };

  // Greeting based on time of day
  const hour = todayDate.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', minHeight: '100%' }}>
      <header>
        <h1 className="font-heading" style={{ fontSize: '32px', marginBottom: '8px' }}>{greeting}, {userProfile?.name || 'User'}</h1>
        <p className="font-heading" style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
          {todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      {/* LEO's Daily Briefing Card */}
      <div className="card" style={{ background: 'var(--bg-elevated)', borderLeft: '4px solid var(--accent-primary)', padding: '24px' }}>
        <h2 className="font-heading" style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
          <span style={{ fontSize: '20px' }}>🤖</span> LEO's Daily Briefing
        </h2>
        {loadingBriefing ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ animation: 'pulse 1s infinite' }}>Analyzing workload...</span>
          </div>
        ) : (
          <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '15px', margin: 0 }}>
            {dailyBriefing || "No briefing available right now. Add some tasks to get started!"}
          </p>
        )}
      </div>

      {/* Stats Row — 4 cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-primary)', marginBottom: '4px' }}>{dueTodayCount}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Due Today</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-danger)', marginBottom: '4px' }}>{overdueCount}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overdue</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-success)', marginBottom: '4px' }}>{completedCount}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Completed</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 className="font-heading" style={{ fontSize: '36px', color: 'var(--accent-warning)', marginBottom: '4px' }}>🔥 {stats.streak}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Day Streak</p>
        </div>
      </div>

      {/* Completion Rate Bar */}
      {stats.total > 0 && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Completion Rate</span>
            <span className="font-mono" style={{ fontSize: '14px', color: 'var(--accent-success)' }}>{stats.completionRate}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.completionRate}%`, backgroundColor: 'var(--accent-success)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      )}

      {/* Plan My Day Button */}
      <div className="action-buttons-row" style={{ display: 'flex', gap: '12px' }}>
        <button 
          className="btn-primary" 
          style={{ flex: 1, padding: '14px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={planMyDay}
        >
          📋 Plan My Day
        </button>
        <button 
          className="btn-ghost" 
          style={{ flex: 1, padding: '14px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => onNavigate && onNavigate('coach')}
        >
          🤖 Ask LEO
        </button>
      </div>

      {/* Progress Visualization */}
      <ProgressChart tasks={tasks} />

      {/* Weekly AI Productivity Report */}
      <div className="card" style={{ background: 'var(--bg-elevated)', borderLeft: '4px solid var(--accent-success)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="font-heading" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-success)', margin: 0 }}>
            <span style={{ fontSize: '20px' }}>📊</span> Weekly Insights
          </h2>
          {!loadingWeekly && (
            <button 
              className="btn-ghost" 
              style={{ fontSize: '12px', padding: '4px 8px' }}
              onClick={() => {
                weeklyFetched.current = false;
                setWeeklyReport('');
                setLoadingWeekly(true);
                askGemini('weekly_report', { tasks, stats, userProfile })
                .then(data => { if (data.result) setWeeklyReport(data.result); })
                .catch(e => console.error(e))
                .finally(() => setLoadingWeekly(false));
              }}
            >
              🔄 Refresh
            </button>
          )}
        </div>
        {loadingWeekly ? (
          <span style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>Generating weekly insights...</span>
        ) : (
          <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '15px', margin: 0 }}>
            {weeklyReport || 'Click Refresh to generate your weekly productivity insights.'}
          </p>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <section>
        <h2 className="font-heading" style={{ fontSize: '20px', marginBottom: '16px' }}>Upcoming Deadlines</h2>
        <div className="card" style={{ padding: '0' }}>
          {upcomingTasks.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming deadlines. You're all caught up! 🎉</p>
          ) : (
            upcomingTasks.map((task, i) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: i < upcomingTasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <h4 style={{ marginBottom: '4px' }}>{task.title}</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{task.category}</span>
                    <span className={`badge badge-${task.priority}`} style={{ fontSize: '10px' }}>{task.priority}</span>
                    <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Score: {calculatePriorityScore(task)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px' }}>{formatDate(task.deadline)}</div>
                  <div className="font-mono" style={{ fontSize: '12px', marginTop: '4px' }}>{getCountdown(task.deadline)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick Add Bar with Voice */}
      <div className="quick-add-bar" style={{ marginTop: 'auto', display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
        {/* Empty State Popup (First Task Prompt) */}
        {!loadingTasks && tasks.length === 0 && (
          <div 
            onClick={() => setShowModal(true)}
            style={{
              position: 'fixed',
              bottom: '40px',
              right: '40px',
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              maxWidth: '280px',
              zIndex: 100,
              cursor: 'pointer',
              animation: 'slideUp 0.3s ease-out, float 3s ease-in-out infinite'
            }}
          >
            <h4 style={{ marginBottom: '4px', fontSize: '15px' }}>👋 Hey {userProfile?.name}!</h4>
            <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
              You don't have any tasks yet. Click here to add your first task and let LEO help you crush it!
            </p>
          </div>
        )}
        <input 
          type="text" 
          placeholder="Add a task..." 
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          style={{ flex: 1, padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quickAddTitle.trim() !== '') setShowModal(true);
          }}
        />
        <VoiceButton onTranscript={(text) => setQuickAddTitle(text)} />
        <button className="btn-primary" onClick={() => quickAddTitle.trim() !== '' ? setShowModal(true) : setShowModal(true)}>Add Task</button>
        <div style={{ position: 'relative' }}>
          <input 
            type="file" 
            accept="application/pdf" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleFileUpload}
          />
          <button 
            className="btn-ghost" 
            style={{ padding: '16px', borderRadius: '8px', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
          >
            {uploadingPdf ? (
              <span style={{ animation: 'pulse 1s infinite' }}>Extracting...</span>
            ) : (
              '📄 Upload Syllabus'
            )}
          </button>
        </div>
      </div>

      <TaskModal 
        show={showModal} 
        onClose={() => { setShowModal(false); setQuickAddTitle(''); }} 
        onSave={() => { fetchTasks(); setQuickAddTitle(''); }} 
        editTask={null}
        initialTitle={quickAddTitle}
      />

      {/* Plan My Day Modal */}
      {showPlanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 className="font-heading" style={{ margin: '0 0 16px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📅 Your Plan for Today
            </h2>
            {planning ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', animation: 'pulse 1.5s infinite' }}>
                Analyzing your tasks and building an optimal schedule...
              </div>
            ) : dayPlan && Array.isArray(dayPlan) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dayPlan.map((block, i) => (
                  <div key={i} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                      {block.time} · {block.duration}
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {block.task}
                    </div>
                    {block.tip && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        💡 {block.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-warning)' }}>
                Could not generate a plan. Please try again.
              </div>
            )}
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setShowPlanModal(false)} disabled={planning}>
                Looks good, let's go!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
