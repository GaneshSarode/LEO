export async function POST(req) {
  let action = '';
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    action = body.action;
    const payload = body.payload;

    let systemPrompt = '';
    let userMessage = '';

    switch (action) {
      case 'breakdown':
        systemPrompt = 'You are a task breakdown expert. Given a task title and deadline, return a JSON array of 3-6 actionable subtasks. Each subtask object must have a "title" (string) and "estimatedMinutes" (number). Return ONLY JSON, no markdown formatting or backticks.';
        userMessage = `Task: ${payload.title}\nDeadline: ${payload.deadline || 'None'}`;
        break;

      case 'schedule':
        systemPrompt = 'You are an intelligent scheduler. Given an array of tasks with deadlines, return a JSON array representing an hour-by-hour plan for today. Each item must have "time" (e.g., "09:00 AM"), "taskId" (string, if it matches a task), and "activity" (string description). Return ONLY JSON, no markdown formatting.';
        userMessage = `Tasks: ${JSON.stringify(payload.tasks)}`;
        break;

      case 'prioritize':
        systemPrompt = 'You are a prioritization engine. Given an array of tasks, evaluate their urgency and importance based on deadlines and titles. Return a JSON array of the task IDs ordered from most urgent to least urgent. Return ONLY JSON, no markdown formatting.';
        userMessage = `Tasks: ${JSON.stringify(payload.tasks)}`;
        break;

      case 'coach':
        systemPrompt = 'You are LEO, a friendly, agentic AI productivity companion. Your goal is to help the user execute tasks before deadlines. Given the user message and their current tasks context, provide concise, actionable, and conversational advice.';
        userMessage = `User Message: ${payload.message}\nContext Tasks: ${JSON.stringify(payload.tasks)}`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    const prompt = userMessage;

    const maxRetries = 3;
    let response;
    let errData;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
            }),
          }
        );

        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        errData = await response.json().catch(() => ({}));
        
        // Check if we should retry
        const isHighDemand = response.status === 503 || response.status === 429 || 
                             (errData.error?.message && errData.error.message.toLowerCase().includes('high demand'));
                             
        if (!isHighDemand) {
           break; // Don't retry on other errors like 400 Bad Request
        }
        
        if (attempt < maxRetries) {
          console.log(`Gemini API high demand. Retrying... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (fetchErr) {
        if (attempt < maxRetries) {
          console.log(`Gemini API fetch error. Retrying... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!response || !response.ok) {
      throw new Error(errData?.error?.message || `HTTP error! status: ${response?.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Strip markdown formatting if AI still includes it
    if (text.startsWith('```json')) text = text.replace(/^```json\n/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '');
    if (text.endsWith('```')) text = text.replace(/\n```$/, '');

    if (action !== 'coach') {
      try {
        const parsed = JSON.parse(text);
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ result: text }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ result: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Fallback logic
    if (action === 'breakdown') {
      const fallbackSubtasks = [
        { id: "1", title: "Research and plan the task", completed: false },
        { id: "2", title: "Work on the first draft or implementation", completed: false },
        { id: "3", title: "Review and refine your work", completed: false },
        { id: "4", title: "Final check and submit", completed: false }
      ];
      return new Response(JSON.stringify(fallbackSubtasks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default fallback for coach, schedule, prioritize, etc.
    return new Response(JSON.stringify({ result: "LEO is experiencing high demand right now. Please try again in a moment." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
