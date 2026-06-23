'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Bot,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'ai-coach', label: 'AI Coach', icon: Bot },
];

export default function Sidebar({ activeView, onViewChange, stats }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Zap size={22} />
            </div>
            <div>
              <h1 className="sidebar-title">LEO</h1>
              <p className="sidebar-subtitle">Life Saver</p>
            </div>
          </div>
        )}
        <button
          className="btn btn-ghost sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
              onClick={() => onViewChange(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === 'tasks' && stats?.active > 0 && (
                <span className="badge badge-count">{stats.active}</span>
              )}
              {!collapsed && item.id === 'dashboard' && stats?.overdue > 0 && (
                <span className="badge badge-danger">{stats.overdue}</span>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-stats">
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{stats?.completionRate || 0}%</span>
              <span className="sidebar-stat-label">Complete</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{stats?.todayCompleted || 0}</span>
              <span className="sidebar-stat-label">Today</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
