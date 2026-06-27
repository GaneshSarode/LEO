'use client';

import { useState, useEffect } from 'react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_BAR_HEIGHT = 120;
const RING_SIZE = 100;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getDayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildLast7Days() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      key: getDayKey(d),
      label: DAY_LABELS[d.getDay()],
    });
  }
  return days;
}

function computeDaily(tasks, days) {
  const counts = {};
  days.forEach((d) => (counts[d.key] = 0));

  if (Array.isArray(tasks)) {
    tasks.forEach((t) => {
      if (!t.completed || !t.completedAt) return;
      let date;
      if (t.completedAt?.toDate) {
        date = t.completedAt.toDate();
      } else if (t.completedAt?.seconds) {
        date = new Date(t.completedAt.seconds * 1000);
      } else {
        date = new Date(t.completedAt);
      }
      if (isNaN(date.getTime())) return;
      const key = getDayKey(date);
      if (key in counts) counts[key]++;
    });
  }

  return days.map((d) => ({ ...d, count: counts[d.key] }));
}

export default function ProgressChart({ tasks = [] }) {
  const [mounted, setMounted] = useState(false);
  const [dailyData, setDailyData] = useState([]);
  const [completionPct, setCompletionPct] = useState(0);

  useEffect(() => {
    const days = buildLast7Days();
    const data = computeDaily(tasks, days);
    setDailyData(data);

    const total = Array.isArray(tasks) ? tasks.length : 0;
    const completed = Array.isArray(tasks)
      ? tasks.filter((t) => t.completed).length
      : 0;
    setCompletionPct(total > 0 ? Math.round((completed / total) * 100) : 0);

    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [tasks]);

  const maxCount = Math.max(...dailyData.map((d) => d.count), 1);

  const strokeDashoffset = RING_CIRCUMFERENCE - (completionPct / 100) * RING_CIRCUMFERENCE;

  return (
    <div
      className="card"
      style={{
        padding: 24,
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
      }}
    >
      {/* Title */}
      <h3
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 24,
        }}
      >
        This Week&apos;s Progress
      </h3>

      {/* Content row */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 32,
        }}
      >
        {/* Bar chart */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: MAX_BAR_HEIGHT + 40,
            }}
          >
            {dailyData.map((day) => {
              const barH =
                day.count > 0
                  ? Math.max((day.count / maxCount) * MAX_BAR_HEIGHT, 8)
                  : 2;

              return (
                <div
                  key={day.key}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                  }}
                >
                  {/* Count label */}
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 500,
                      color:
                        day.count > 0
                          ? 'var(--text-secondary)'
                          : 'var(--text-muted)',
                      marginBottom: 4,
                      opacity: mounted ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    {day.count}
                  </span>

                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 36,
                      height: mounted ? barH : 0,
                      minHeight: mounted ? (day.count > 0 ? 8 : 2) : 0,
                      borderRadius: 6,
                      background:
                        day.count > 0
                          ? 'linear-gradient(180deg, var(--accent-glow) 0%, var(--accent-primary) 100%)'
                          : 'var(--text-muted)',
                      transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: '0.05s',
                    }}
                  />

                  {/* Day label */}
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 8,
                      userSelect: 'none',
                    }}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion ring */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: RING_SIZE,
              height: RING_SIZE,
            }}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              style={{ transform: 'rotate(-90deg)' }}
            >
              {/* Background track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--bg-elevated)"
                strokeWidth={RING_STROKE}
              />
              {/* Filled arc */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--accent-success)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={
                  mounted ? strokeDashoffset : RING_CIRCUMFERENCE
                }
                style={{
                  transition:
                    'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </svg>

            {/* Center percentage */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {completionPct}%
              </span>
            </div>
          </div>

          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 8,
              userSelect: 'none',
            }}
          >
            Completed
          </span>
        </div>
      </div>
    </div>
  );
}
