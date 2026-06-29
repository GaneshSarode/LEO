'use client';

import { useState, useEffect } from 'react';
import { addTask, updateTask } from '@/lib/firebase';
import { askGemini, askGeminiRaw } from '@/lib/gemini';
import { Mic, MicOff } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskModal({ show, onClose, onSave, editTask, initialTitle = '' }) {
  const [formData, setFormData] = useState({
    title: initialTitle,
    category: 'work',
    priority: 'medium'
  });
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [listening, setListening] = useState(false);
  const [planChecklist, setPlanChecklist] = useState(null);

  const todayString = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title || '',
        category: editTask.category || 'work',
        priority: editTask.priority || 'medium'
      });
      if (editTask.deadline) {
        const d = new Date(editTask.deadline);
        const pad = (n) => n.toString().padStart(2, '0');
        setDeadlineDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setDeadlineTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setDeadlineDate('');
        setDeadlineTime('');
      }
      setSubtasks(editTask.subtasks || []);
    } else {
      setFormData({
        title: initialTitle || '',
        category: 'work',
        priority: 'medium'
      });
      setDeadlineDate('');
      setDeadlineTime('');
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
    setSuggestions([]);
    setPlanChecklist(null);
  }, [editTask, show, initialTitle]);

  if (!show) return null;

  const handleSuggest = async () => {
    if (!formData.title || formData.title.length < 3) return;
    setIsSuggesting(true);
    try {
      const data = await askGemini('refine_topic', { title: formData.title });
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        if (data.category && ['work', 'study', 'personal'].includes(data.category)) {
          setFormData(prev => ({ ...prev, category: data.category }));
        }
      } else if (Array.isArray(data) && data.length > 0) {
        setSuggestions(data); // Fallback for old cache
      }
    } catch (error) {
      console.error("Suggestion error:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const startVoice = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    setListening(true);
    r.start();
    r.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      setFormData(prev => ({...prev, title: transcript}));
      
      try {
        const data = await askGeminiRaw(
          `Voice input: "${transcript}"\nToday: ${format(new Date(), 'yyyy-MM-dd')}\nExtract task title and deadline if mentioned.\nRespond ONLY with JSON: {"title":"...","deadline":"YYYY-MM-DD","hasDeadline":true}\nIf no deadline: {"title":"...","deadline":null,"hasDeadline":false}`
        );
        const p = JSON.parse(data.text.replace(/```json|```/g,'').trim());
        if (p.title) setFormData(prev => ({...prev, title: p.title}));
        if (p.hasDeadline && p.deadline) {
          setDeadlineDate(p.deadline);
          // Set to end of day by default for date-only
          setDeadlineTime('23:59');
        }
      } catch (e) {
        console.error('Voice parsing failed', e);
      }
    };
    r.onerror = () => setListening(false);
  };

  const handleAutoPlan = async () => {
    if (!formData.title) {
      alert('Please enter a title first.');
      return;
    }
    setIsPlanning(true);
    try {
      const promptStr = `Break this task into sub-tasks:
Task: "${formData.title}"
Deadline: ${deadlineDate ? deadlineDate : 'None'}
Today: ${format(new Date(), 'yyyy-MM-dd')}

Respond ONLY with a JSON array:
[
  {"title":"Research and gather materials","estimatedMinutes":30,"daysBeforeDeadline":3},
  {"title":"Create outline","estimatedMinutes":20,"daysBeforeDeadline":2}
]
4-6 sub-tasks. Titles under 8 words. Specific to this actual task.`;

      const data = await askGeminiRaw(promptStr);
      
      let generatedSubtasks = [];
      try {
        generatedSubtasks = JSON.parse(data.text.replace(/```json|```/g,'').trim());
      } catch (e) {
        console.error("Failed to parse plan", e);
      }
      
      if (Array.isArray(generatedSubtasks) && generatedSubtasks.length > 0) {
        setPlanChecklist(generatedSubtasks.map(s => ({...s, selected: true})));
      } else {
        alert("Could not generate a plan right now.");
      }
    } catch (e) {
      console.error("Auto plan error:", e);
      alert("Failed to plan task. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  };

  const applyPlanChecklist = async () => {
    const selectedPlanTasks = planChecklist.filter(t => t.selected);
    if (selectedPlanTasks.length === 0) return;
    
    // Instead of making them subtasks of the same task, the prompt says:
    // "save parent task + all checked sub-tasks as individual Firestore docs"
    // Wait, let's verify prompt: "On confirm: save parent task + all checked sub-tasks as individual Firestore docs, each with computed deadline (deadline - daysBeforeDeadline days)"
    
    let finalDeadline = null;
    if (deadlineDate) {
      const t = deadlineTime || '23:59';
      finalDeadline = new Date(`${deadlineDate}T${t}`).getTime();
    }

    // Save parent task
    let parentId = null;
    if (editTask) {
      await updateTask(editTask.id, {
        ...formData,
        deadline: finalDeadline,
      });
      parentId = editTask.id;
    } else {
      parentId = await addTask({
        ...formData,
        deadline: finalDeadline,
        completed: false,
        subtasks: []
      });
    }

    // Save checked sub-tasks as INDIVIDUAL tasks in Firestore
    for (const sub of selectedPlanTasks) {
      let subDeadline = finalDeadline;
      if (finalDeadline && sub.daysBeforeDeadline) {
        subDeadline = new Date(finalDeadline - (sub.daysBeforeDeadline * 24 * 60 * 60 * 1000)).getTime();
      }
      
      await addTask({
        title: sub.title,
        category: formData.category,
        priority: formData.priority,
        deadline: subDeadline,
        completed: false,
        subtasks: [],
        parentTaskId: parentId // Link them just in case
      });
    }

    onSave();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalDeadline = null;
      if (deadlineDate) {
        const t = deadlineTime || '23:59';
        finalDeadline = new Date(`${deadlineDate}T${t}`).getTime();
      }

      if (editTask) {
        await updateTask(editTask.id, {
          ...formData,
          deadline: finalDeadline,
          subtasks: subtasks
        });
      } else {
        await addTask({
          ...formData,
          deadline: finalDeadline,
          completed: false,
          subtasks: subtasks,
        });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 className="font-heading" style={{ marginBottom: '16px' }}>
          {editTask ? 'Edit Task' : 'New Task'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)' }}>Title</label>
              {formData.title.length >= 3 && !editTask && (
                <button 
                  type="button" 
                  onClick={handleSuggest} 
                  disabled={isSuggesting}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                >
                  {isSuggesting ? 'Thinking...' : '💡 Refine Topic'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => {
                  setFormData({...formData, title: e.target.value});
                  if (suggestions.length > 0) setSuggestions([]); // clear on type
                }}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
              />
              {typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && (
                <button
                  type="button"
                  onClick={startVoice}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '8px', borderRadius: '50%', border: 'none',
                    background: listening ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-elevated)',
                    color: listening ? '#ef4444' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: listening ? '0 0 0 4px rgba(239, 68, 68, 0.1)' : 'none',
                    animation: listening ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                  }}
                  title="Voice Input"
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => {
                      setSubtasks([...subtasks, { id: Date.now().toString() + i, title: s, completed: false }]);
                      setSuggestions(suggestions.filter(sg => sg !== s));
                    }}
                    style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Subtasks</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
              {subtasks.map((st, index) => (
                <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '14px' }}>{st.title}</span>
                  <button type="button" onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Add manual subtask..." 
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubtaskTitle.trim()) {
                      setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]);
                      setNewSubtaskTitle('');
                    }
                  }
                }}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
              />
              <button 
                type="button" 
                onClick={() => {
                  if (newSubtaskTitle.trim()) {
                    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]);
                    setNewSubtaskTitle('');
                  }
                }}
                className="btn-ghost" 
                style={{ padding: '8px 12px' }}
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
            >
              <option value="work">Work</option>
              <option value="study">Study</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Priority</label>
            <select 
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Deadline</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="date" 
                  min={todayString}
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Date</span>
              </div>
              <div style={{ flex: 1 }}>
                <input 
                  type="time" 
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'white' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Time</span>
              </div>
            </div>
          </div>
          {planChecklist ? (
            <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-glow)' }}>
                ✨ LEO's Proposed Plan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {planChecklist.map((sub, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={sub.selected} 
                      onChange={(e) => {
                        const next = [...planChecklist];
                        next[i].selected = e.target.checked;
                        setPlanChecklist(next);
                      }}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{sub.title}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>~{sub.estimatedMinutes} mins • {sub.daysBeforeDeadline ? `${sub.daysBeforeDeadline} days before deadline` : 'No specific date'}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '8px' }}>
                <button type="button" className="btn-ghost" onClick={() => setPlanChecklist(null)}>Discard</button>
                <button type="button" className="btn-primary" onClick={applyPlanChecklist}>✅ Add all ({planChecklist.filter(t=>t.selected).length} tasks)</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={handleAutoPlan} 
                disabled={isPlanning || !formData.title}
                style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
              >
                {isPlanning ? '⏳ Planning...' : '🤖 Let LEO plan this'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-ghost" onClick={onClose} disabled={isPlanning}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isPlanning}>Save Task</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
