'use client';

import { useState, useEffect, useRef } from 'react';
import { getTasks } from '@/lib/firebase';

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm LEO, your AI deadline companion. I know all your tasks and deadlines. Ask me anything — or try: 'Plan my day', 'What should I work on now?', or 'I'm feeling overwhelmed'." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const chatEndRef = useRef(null);

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks();
      setTasks(data);
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText) => {
    if (!messageText.trim() || loading) return;
    
    const newMessages = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coach',
          payload: {
            message: messageText,
            tasks: tasks
          }
        })
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.result || "Sorry, I couldn't process that." }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'assistant', content: "Network error occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto', background: 'var(--bg-primary)' }}>
      <header style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }}></div>
        <h2 className="font-heading" style={{ fontSize: '20px', margin: 0 }}>LEO AI Coach</h2>
      </header>

      <div style={{ padding: '16px 24px', display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {["Plan my day", "Prioritize my tasks", "I'm overwhelmed"].map(btn => (
          <button 
            key={btn}
            className="btn-ghost" 
            style={{ fontSize: '12px', whiteSpace: 'nowrap', borderRadius: '16px' }}
            onClick={() => handleSend(btn)}
          >
            {btn}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ 
              maxWidth: '80%', 
              padding: '12px 16px', 
              borderRadius: '12px',
              backgroundColor: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              lineHeight: '1.5',
              whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal'
            }}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div 
                  className="markdown-body" 
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} 
                />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-elevated)', display: 'flex', gap: '4px' }}>
              <span style={{ animation: 'pulse 1s infinite' }}>.</span>
              <span style={{ animation: 'pulse 1s infinite 0.2s' }}>.</span>
              <span style={{ animation: 'pulse 1s infinite 0.4s' }}>.</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Ask LEO..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'white' }}
          />
          <button className="btn-primary" onClick={() => handleSend(input)} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}
