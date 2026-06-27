'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, SkipForward, Square } from 'lucide-react';

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const TOTAL_SESSIONS = 4;
const CIRCLE_RADIUS = 90;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function FocusTimer({ task, onClose, onComplete }) {
  const [phase, setPhase] = useState('idle');
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [flashVisible, setFlashVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to focus?');
  const intervalRef = useRef(null);

  const totalDuration = phase === 'break' ? BREAK_DURATION : WORK_DURATION;
  const progress = 1 - secondsLeft / totalDuration;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  const ringColor = phase === 'break' ? 'var(--accent-success)' : 'var(--accent-primary)';

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const triggerFlash = useCallback(() => {
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 600);
  }, []);

  const startWorkSession = useCallback(() => {
    clearTimer();
    setPhase('working');
    setSecondsLeft(WORK_DURATION);
    setIsPaused(false);
    setStatusMessage('Stay focused!');
  }, [clearTimer]);

  const startBreakSession = useCallback(() => {
    clearTimer();
    setPhase('break');
    setSecondsLeft(BREAK_DURATION);
    setIsPaused(false);
    setStatusMessage('Time for a break!');
  }, [clearTimer]);

  const handleWorkComplete = useCallback(() => {
    clearTimer();
    const newCount = completedPomodoros + 1;
    setCompletedPomodoros(newCount);
    triggerFlash();
    if (onComplete) onComplete();

    if (newCount >= TOTAL_SESSIONS) {
      setPhase('idle');
      setSecondsLeft(WORK_DURATION);
      setStatusMessage('All sessions complete! Great work! 🎉');
    } else {
      startBreakSession();
    }
  }, [clearTimer, completedPomodoros, onComplete, triggerFlash, startBreakSession]);

  const handleBreakComplete = useCallback(() => {
    clearTimer();
    setStatusMessage('Ready for another round?');
    setPhase('idle');
    setSecondsLeft(WORK_DURATION);
  }, [clearTimer]);

  // Tick effect
  useEffect(() => {
    if ((phase === 'working' || phase === 'break') && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [phase, isPaused, clearTimer]);

  // Handle timer reaching zero
  useEffect(() => {
    if (secondsLeft === 0 && phase === 'working') {
      handleWorkComplete();
    } else if (secondsLeft === 0 && phase === 'break') {
      handleBreakComplete();
    }
  }, [secondsLeft, phase, handleWorkComplete, handleBreakComplete]);

  const handleStart = () => {
    startWorkSession();
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
    setStatusMessage(isPaused ? (phase === 'break' ? 'Enjoy your break!' : 'Stay focused!') : 'Paused');
  };

  const handleSkipBreak = () => {
    startWorkSession();
  };

  const handleEndSession = () => {
    clearTimer();
    setPhase('idle');
    setSecondsLeft(WORK_DURATION);
    setIsPaused(false);
    setStatusMessage('Session ended. Ready when you are.');
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentSession = Math.min(completedPomodoros + 1, TOTAL_SESSIONS);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Flash animation overlay */}
      {flashVisible && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            animation: 'focusTimerFlash 600ms ease-out forwards',
          }}
        />
      )}

      <style>{`
        @keyframes focusTimerFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes focusTimerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes focusTimerFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes focusTimerRingSpin {
          from { transform: rotate(-90deg); }
          to { transform: rotate(-90deg); }
        }
      `}</style>

      <div
        className="card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          margin: '16px',
          padding: '40px 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'focusTimerFadeIn 300ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '6px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close timer"
        >
          <X size={20} />
        </button>

        {/* Task title */}
        <div style={{ textAlign: 'center', maxWidth: '100%' }}>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '6px',
            }}
          >
            Focusing on
          </p>
          <h2
            className="font-heading"
            style={{
              margin: 0,
              fontSize: '18px',
              color: 'var(--text-primary)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '340px',
            }}
          >
            {task?.title || 'Untitled Task'}
          </h2>
        </div>

        {/* Session count */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          Session {currentSession} of {TOTAL_SESSIONS}
        </div>

        {/* SVG Ring Timer */}
        <div
          style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="var(--bg-elevated)"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="100"
              cy="100"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
                filter: `drop-shadow(0 0 6px ${ringColor})`,
              }}
            />
          </svg>

          {/* Timer text centered inside the ring */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '48px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1,
                letterSpacing: '2px',
              }}
            >
              {formatTime(secondsLeft)}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {phase === 'idle' ? 'ready' : phase === 'working' ? 'work' : 'break'}
            </span>
          </div>
        </div>

        {/* Status message */}
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            color: phase === 'break' ? 'var(--accent-success)' : 'var(--text-secondary)',
            fontWeight: 500,
            textAlign: 'center',
            minHeight: '22px',
          }}
        >
          {statusMessage}
        </p>

        {/* Completed pomodoros */}
        {completedPomodoros > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {Array.from({ length: completedPomodoros }).map((_, i) => (
              <span
                key={i}
                style={{ fontSize: '22px', lineHeight: 1 }}
                role="img"
                aria-label="Completed pomodoro"
              >
                🍅
              </span>
            ))}
            {Array.from({ length: Math.max(0, TOTAL_SESSIONS - completedPomodoros) }).map((_, i) => (
              <span
                key={`empty-${i}`}
                style={{ fontSize: '22px', lineHeight: 1, opacity: 0.2 }}
                role="img"
                aria-label="Remaining pomodoro"
              >
                🍅
              </span>
            ))}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {phase === 'idle' && (
            <button
              className="btn-primary"
              onClick={handleStart}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 28px',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              <Play size={18} />
              {completedPomodoros > 0 && completedPomodoros < TOTAL_SESSIONS
                ? 'Next Session'
                : completedPomodoros >= TOTAL_SESSIONS
                ? 'Restart'
                : 'Start'}
            </button>
          )}

          {(phase === 'working' || phase === 'break') && (
            <>
              <button
                className="btn-ghost"
                onClick={handlePauseResume}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                }}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>

              {phase === 'break' && (
                <button
                  className="btn-ghost"
                  onClick={handleSkipBreak}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                  }}
                >
                  <SkipForward size={16} />
                  Skip Break
                </button>
              )}

              <button
                className="btn-ghost"
                onClick={handleEndSession}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: 'var(--accent-danger)',
                }}
              >
                <Square size={16} />
                End
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
