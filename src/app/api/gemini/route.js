export async function POST(req) {
  let action = '';
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
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

      case 'briefing':
        systemPrompt = `You are LEO, a proactive productivity coach. The user is a ${payload.userProfile?.role || 'user'}. Review their tasks and provide a short (2-3 sentences max) daily briefing. Start by saying 'Good morning ${payload.userProfile?.name || 'there'}!' or similar. State exactly what they should focus on first based on deadlines. Keep it highly actionable and direct.`;
        userMessage = `Tasks: ${JSON.stringify(payload.tasks || [])}`;
        break;

      case 'autonomous_plan':
        systemPrompt = `You are an autonomous AI planner. The user needs to accomplish: ${payload.title} by ${payload.deadline || 'None'}. Break this down into exactly 3-5 subtasks. Return ONLY a valid JSON array of objects with format: [{ "title": "subtask name" }]. Do not include markdown formatting or explanation.`;
        userMessage = `Task: ${payload.title}\nDeadline: ${payload.deadline || 'None'}`;
        break;

      case 'weekly_report':
        systemPrompt = `You are LEO, an AI productivity analyst. The user is a ${payload.userProfile?.role || 'user'} named ${payload.userProfile?.name || 'there'}. Given their task completion data for the past week, write a SHORT (3-4 sentences max) weekly insight report. Include: how many tasks completed vs total, their strongest/weakest pattern, and ONE specific actionable suggestion. Be encouraging but honest. Do NOT use markdown formatting.`;
        userMessage = `Weekly stats: ${JSON.stringify(payload.stats)}\nTasks: ${JSON.stringify(payload.tasks || [])}`;
        break;

      case 'unstuck':
        systemPrompt = `You are LEO, a supportive AI coach. The user is stuck on a specific task. Give them exactly 3 concrete, actionable next steps to get unstuck and make progress RIGHT NOW. Be specific to the task. Keep each step to one sentence. Start with something encouraging.`;
        userMessage = `I'm stuck on this task: "${payload.title}"\nCategory: ${payload.category || 'general'}\nDeadline: ${payload.deadline ? new Date(payload.deadline).toLocaleDateString() : 'No deadline'}\nSubtasks completed: ${payload.subtaskProgress || 'none'}`;
        break;

      case 'refine_topic':
        systemPrompt = `You are LEO. The user entered a broad task title. Suggest 6-8 short (2-4 word) specific subtopics for the task, and deduce the best category ("work", "study", or "personal").\nReturn ONLY JSON with this format: { "suggestions": ["subtopic1", "subtopic2", ...], "category": "work" }\nExamples:\n- "LeetCode" -> { "suggestions": ["Binary Search", "Dynamic Programming", "Two Pointers", "Graphs", "Trees", "Sliding Window"], "category": "study" }\n- "Study" -> { "suggestions": ["Chapter Review", "Mock Test", "Past Papers", "Formula Sheet", "Flashcards", "Practice Quiz"], "category": "study" }\n- "Workout" -> { "suggestions": ["Chest Day", "Cardio", "Leg Day", "HIIT", "Core", "Pull Day"], "category": "personal" }`;
        userMessage = `Task Title: "${payload.title}"`;
        break;

      case 'raw':
        systemPrompt = 'You are a helpful AI.';
        userMessage = payload.prompt;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    const prompt = userMessage;

    const cleanMarkdown = (text) => {
      if (text.startsWith('```json')) text = text.replace(/^```json\n/, '');
      if (text.startsWith('```')) text = text.replace(/^```\n/, '');
      if (text.endsWith('```')) text = text.replace(/\n```$/, '');
      return text;
    };

    const makeResponse = (text) => {
      text = cleanMarkdown(text);
      if (action !== 'coach' && action !== 'briefing') {
        try {
          const parsed = JSON.parse(text);
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          // Not valid JSON, return as text result
        }
      }
      return new Response(JSON.stringify({ result: text }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // Helper: fetch with a timeout (8 seconds max)
    const fetchWithTimeout = (url, options, timeoutMs = 8000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
    };

    // --- TRY GROQ FIRST (fast, reliable) ---
    const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const groqResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const groqText = groqData.choices?.[0]?.message?.content || '';
          if (groqText) {
            return makeResponse(groqText);
          }
        } else {
          console.error(`Groq API error (${groqResponse.status})`);
        }
      } catch (groqFetchErr) {
        console.error('Groq error:', groqFetchErr.message);
      }
    }

    // --- FALLBACK: TRY GEMINI (1 attempt only, no retries) ---
    try {
      const geminiResponse = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent`,
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

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (geminiText) {
          return makeResponse(geminiText);
        }
      }
    } catch (geminiFetchErr) {
      console.error('Gemini error:', geminiFetchErr.message);
    }

    // --- BOTH FAILED: canned fallback ---
    console.log('Both Groq and Gemini failed. Using canned fallback.');

    if (action === 'breakdown' || action === 'autonomous_plan') {
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

    return new Response(JSON.stringify({ result: "LEO is experiencing high demand right now. Please try again in a moment." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unhandled API Error:', error);

    if (action === 'breakdown' || action === 'autonomous_plan') {
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

    return new Response(JSON.stringify({ result: "LEO is experiencing high demand right now. Please try again in a moment." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
