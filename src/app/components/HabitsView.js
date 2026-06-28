'use client';

import { useState, useEffect } from 'react';
import { getHabits, addHabit, updateHabit } from '@/lib/firebase';
import { subDays, format, isSameDay } from 'date-fns';
import { Flame, Plus, Check, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function HabitsView({ userProfile }) {
  const [habits, setHabits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabit, setNewHabit] = useState({ title: '', frequency: 'daily', category: 'Academic' });
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const fetchHabits = async () => {
    const data = await getHabits();
    setHabits(data);
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.title.trim()) return;

    await addHabit({
      title: newHabit.title,
      frequency: newHabit.frequency,
      category: newHabit.category,
      streak: 0,
      lastCompletedDate: null,
      completionHistory: []
    });

    setNewHabit({ title: '', frequency: 'daily', category: 'Academic' });
    setShowAddModal(false);
    fetchHabits();
  };

  const handleMarkDone = async (habit) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    // Check if already done today
    if (habit.lastCompletedDate === today) return;

    const newStreak = habit.lastCompletedDate === yesterday ? (habit.streak || 0) + 1 : 1;
    const newHistory = [...(habit.completionHistory || []), today];

    await updateHabit(habit.id, {
      streak: newStreak,
      lastCompletedDate: today,
      completionHistory: newHistory
    });

    fetchHabits();
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    setShowSummary(true);
    
    // Generate prompt data
    const totalPossible = habits.length * 7;
    let totalCompleted = 0;
    
    const last7Days = Array.from({length:7}, (_,i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
    
    let bestStreak = 0;
    let bestHabitName = '';
    
    habits.forEach(h => {
      const hist = h.completionHistory || [];
      const thisWeekCompleted = hist.filter(date => last7Days.includes(date)).length;
      totalCompleted += thisWeekCompleted;
      
      if ((h.streak || 0) >= bestStreak) {
        bestStreak = h.streak || 0;
        bestHabitName = h.title;
      }
    });

    const habitList = habits.map(h => h.title).join(', ');
    
    const prompt = `User completed ${totalCompleted} habit check-ins out of ${totalPossible} possible this week.
Best streak: ${bestStreak} days on "${bestHabitName}".
Habits: ${habitList}.
Write 2 sentences: performance review + one specific tip. Under 40 words. Be direct.`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setSummary(data.text);
    } catch (e) {
      setSummary('Failed to generate summary. Please try again later.');
    }
    setLoadingSummary(false);
  };

  const getCategoryColor = (cat) => {
    switch (cat.toLowerCase()) {
      case 'academic': return 'var(--accent-primary)';
      case 'work': return 'var(--accent-warning)';
      case 'health': return 'var(--accent-success)';
      case 'personal': return 'var(--accent-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="font-heading" style={{ fontSize: '28px', margin: 0 }}>My Habits</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <Plus size={16} /> Add Habit
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {habits.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
            <p>No habits tracked yet. Create one to start building your streak!</p>
          </div>
        ) : (
          habits.map(habit => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const isDoneToday = habit.lastCompletedDate === today;
            const history = habit.completionHistory || [];
            
            // Last 7 days circles
            const last7 = Array.from({length:7}, (_,i) => format(subDays(new Date(), 6-i), 'yyyy-MM-dd'));

            return (
              <div key={habit.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{habit.title}</h3>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      border: `1px solid ${getCategoryColor(habit.category)}`,
                      color: getCategoryColor(habit.category),
                      backgroundColor: 'var(--bg-primary)'
                    }}>
                      {habit.category}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-warning)', fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>
                    <Flame size={16} /> {habit.streak || 0} day streak
                  </div>

                  {/* Grid */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {last7.map(date => {
                      const done = history.includes(date);
                      return (
                        <div 
                          key={date}
                          title={date}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: done ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                            border: done ? 'none' : '1px solid var(--border)'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginLeft: '16px' }}>
                  <button 
                    onClick={() => handleMarkDone(habit)}
                    disabled={isDoneToday}
                    className={isDoneToday ? "btn-ghost" : "btn-primary"}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                      opacity: isDoneToday ? 0.5 : 1, cursor: isDoneToday ? 'not-allowed' : 'pointer',
                      border: isDoneToday ? '1px solid var(--border)' : 'none',
                      backgroundColor: isDoneToday ? 'var(--bg-elevated)' : 'var(--accent-primary)'
                    }}
                  >
                    <Check size={16} /> {isDoneToday ? 'Done Today' : 'Mark Done'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Summary Section */}
      {habits.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          {!showSummary ? (
            <button 
              className="btn-ghost"
              onClick={generateSummary}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', padding: '16px' }}
            >
              <BarChart2 size={18} /> Get weekly summary
            </button>
          ) : (
            <div className="card" style={{ borderLeft: '4px solid var(--accent-success)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-success)' }}>
                <BarChart2 size={18} /> Weekly Insights
              </h3>
              {loadingSummary ? (
                <p style={{ animation: 'pulse 1s infinite', color: 'var(--text-secondary)', margin: 0 }}>Analyzing your week...</p>
              ) : (
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>New Habit</h2>
            <form onSubmit={handleAddHabit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Habit Name</label>
                <input 
                  type="text" 
                  required
                  value={newHabit.title}
                  onChange={(e) => setNewHabit({...newHabit, title: e.target.value})}
                  placeholder="e.g. Read 10 pages"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Frequency</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['daily', 'weekly'].map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setNewHabit({...newHabit, frequency: freq})}
                      style={{ 
                        flex: 1, padding: '8px', textTransform: 'capitalize', borderRadius: '4px', cursor: 'pointer',
                        border: '1px solid var(--border)',
                        backgroundColor: newHabit.frequency === freq ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: newHabit.frequency === freq ? 'white' : 'var(--text-primary)'
                      }}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['Academic', 'Work', 'Health', 'Personal'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewHabit({...newHabit, category: cat})}
                      style={{ 
                        padding: '8px', borderRadius: '4px', cursor: 'pointer',
                        border: '1px solid var(--border)',
                        backgroundColor: newHabit.category === cat ? 'var(--bg-elevated)' : 'var(--bg-primary)',
                        color: newHabit.category === cat ? getCategoryColor(cat) : 'var(--text-primary)',
                        borderColor: newHabit.category === cat ? getCategoryColor(cat) : 'var(--border)'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Habit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
