'use client';

import { Search, Bell, Sparkles } from 'lucide-react';
import { getGreeting } from '@/lib/utils';

export default function Header({ searchQuery, onSearchChange, stats, onAICoachOpen }) {
  const greeting = getGreeting();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-greeting">
          <h2 className="header-greeting-text">{greeting} 👋</h2>
          <p className="header-greeting-sub">
            {stats?.active > 0
              ? `You have ${stats.active} active task${stats.active !== 1 ? 's' : ''}`
              : 'No active tasks — time to plan!'}
            {stats?.overdue > 0 && (
              <span className="text-danger"> · {stats.overdue} overdue</span>
            )}
          </p>
        </div>
      </div>

      <div className="header-center">
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input
            type="text"
            className="search-bar-input"
            placeholder="Search tasks... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-ai btn-sm" onClick={onAICoachOpen} title="AI Coach">
          <Sparkles size={16} />
          <span className="hidden-mobile">Ask LEO</span>
        </button>
        {stats?.dueSoon > 0 && (
          <div className="header-notification">
            <Bell size={18} />
            <span className="notification-dot" />
          </div>
        )}
      </div>
    </header>
  );
}
