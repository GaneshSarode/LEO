'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Zap, Calendar, Brain, RotateCcw } from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { getChatHistory, saveChatHistory } from '@/lib/storage';
import { generateId } from '@/lib/utils';

const QUICK_ACTIONS = [
  { label: '📋 Plan my day', message: 'Help me plan my day. Look at my tasks and create an optimal schedule.' },
  { label: '🔥 What\'s urgent?', message: 'What tasks should I focus on right now? What\'s most urgent?' },
  { label: '😰 I\'m overwhelmed', message: 'I\'m feeling overwhelmed with my tasks. Help me simplify and prioritize.' },
  { label: '💡 Productivity tips', message: 'Give me 3 actionable productivity tips based on my current tasks.' },
];

export default function AIChat({ isOpen, onClose, tasks }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { chatWithCoach, loading } = useAI();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    const history = getChatHistory();
    if (history && history.length > 0) {
      setMessages(history);
    } else {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          content: "Hey! I'm LEO, your AI productivity coach. 🚀\n\nI can help you plan your day, prioritize tasks, or just talk through what's on your plate. What would you like to do?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      saveChatHistory(messages.slice(-50)); // Keep last 50 messages
    }
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      id: generateId(),
      sender: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    const response = await chatWithCoach(text.trim(), messages, tasks);

    const aiMessage = {
      id: generateId(),
      sender: 'ai',
      content: response || "I'm having trouble connecting right now. Please check your Gemini API key in `.env.local` and try again.",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiMessage]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (action) => {
    sendMessage(action.message);
  };

  const clearHistory = () => {
    const welcomeMsg = {
      id: 'welcome',
      sender: 'ai',
      content: "Chat cleared! How can I help you today? 🚀",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMsg]);
    saveChatHistory([welcomeMsg]);
  };

  return (
    <div className={`chat-panel ${isOpen ? 'chat-panel-open' : ''}`}>
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <div className="chat-panel-avatar">
            <Zap size={18} />
          </div>
          <div>
            <h3>LEO AI Coach</h3>
            <span className="text-sm text-muted">Powered by Gemini</span>
          </div>
        </div>
        <div className="chat-panel-actions">
          <button className="btn btn-ghost btn-icon" onClick={clearHistory} title="Clear chat">
            <RotateCcw size={16} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.sender === 'user' ? 'chat-message-user' : 'chat-message-ai'}`}
          >
            <div className="chat-message-bubble">
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message chat-message-ai">
            <div className="chat-message-bubble chat-message-typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="chat-quick-actions">
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              className="chat-quick-action"
              onClick={() => handleQuickAction(action)}
              disabled={loading}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Ask LEO anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-primary btn-icon chat-send-btn"
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
