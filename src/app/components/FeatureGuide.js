export default function FeatureGuide({ type }) {
  const guides = {
    dashboard: {
      title: "💡 Dashboard Features",
      items: [
        "Plan My Day: Uses AI to build a custom schedule strictly from your wake time to your sleep time.",
        "Syllabus Upload: Upload a PDF and LEO will automatically extract all deadlines and subtasks.",
        "Daily Briefing: Get an AI summary of your workload and weekly progress."
      ]
    },
    tasks: {
      title: "💡 Task Features (Deep Focus)",
      items: [
        "Start Session: Click the 'Play' (▶) button on any task to enter Deep Focus Mode.",
        "Spotify Integration: While in a focus session, you can embed your favorite Spotify playlist to study to!",
        "Subtasks: Break down large tasks into smaller, manageable chunks."
      ]
    },
    habits: {
      title: "💡 Habit Features",
      items: [
        "Streaks: Build momentum by completing habits consistently every day.",
        "Habit Tracking: Visualize your progress and stay accountable.",
        "Penalty System: Missed habits can affect your priority score to keep you on track."
      ]
    },
    chat: {
      title: "💡 AI Coach Features",
      items: [
        "Overwhelmed?: Tell LEO if you're stressed, and it will help re-prioritize your entire workload.",
        "Voice Input: Use the microphone to brainstorm ideas directly with LEO hands-free.",
        "Context Aware: LEO knows your entire to-do list and deadlines, so ask for specific task advice!"
      ]
    }
  };

  const guide = guides[type];
  if (!guide) return null;

  return (
    <div style={{ marginTop: '40px', padding: '24px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {guide.title}
      </h3>
      <ul style={{ margin: 0, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {guide.items.map((item, idx) => {
          const splitIndex = item.indexOf(': ');
          if (splitIndex === -1) {
            return <li key={idx} style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>{item}</li>;
          }
          const boldPart = item.substring(0, splitIndex);
          const restPart = item.substring(splitIndex + 2);
          return (
            <li key={idx} style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{boldPart}:</strong> {restPart}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
