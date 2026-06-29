// Helper: fetch with a timeout so we never hang
const fetchWithTimeout = (url, options, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

const cleanMarkdown = (text) => {
  if (text.startsWith('```json')) text = text.replace(/^```json\n/, '');
  if (text.startsWith('```')) text = text.replace(/^```\n/, '');
  if (text.endsWith('```')) text = text.replace(/\n```$/, '');
  return text;
};

export async function askGemini(action, payload) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    // If no public key, use the server route
    if (!apiKey) {
      const res = await fetchWithTimeout('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      }, 12000);
      if (!res.ok) throw new Error('API route failed');
      return await res.json();
    }

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
        systemPrompt = `You are LEO. The user entered a broad task title. Suggest 6-8 short (2-4 word) specific subtopics for the task, and deduce the best category ("work", "study", or "personal").
Return ONLY JSON with this format: { "suggestions": ["subtopic1", "subtopic2", ...], "category": "work" }
Examples:
- "LeetCode" -> { "suggestions": ["Binary Search", "Dynamic Programming", "Two Pointers", "Graphs", "Trees", "Sliding Window"], "category": "study" }
- "Study" -> { "suggestions": ["Chapter Review", "Mock Test", "Past Papers", "Formula Sheet", "Flashcards", "Practice Quiz"], "category": "study" }
- "Workout" -> { "suggestions": ["Chest Day", "Cardio", "Leg Day", "HIIT", "Core", "Pull Day"], "category": "personal" }`;
        userMessage = `Task Title: "${payload.title}"`;
        break;

      default:
        console.error('Invalid action');
        return { error: 'Invalid action' };
    }

    const prompt = userMessage;

    const parseResponse = (text) => {
      text = cleanMarkdown(text);
      if (action !== 'coach' && action !== 'briefing') {
        try {
          return JSON.parse(text);
        } catch (e) {
          return { result: text };
        }
      }
      return { result: text };
    };

    // --- TRY GROQ FIRST (fast) ---
    const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const groqResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
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
            return parseResponse(groqText);
          }
        }
      } catch (e) {
        console.error('Groq error:', e.message);
      }
    }

    // --- FALLBACK: GEMINI (1 attempt, 8s timeout) ---
    try {
      const response = await fetchWithTimeout(
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
        const data = await response.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (geminiText) {
          return parseResponse(geminiText);
        }
      }
    } catch (e) {
      console.error('Gemini error:', e.message);
    }

    // --- BOTH FAILED ---
    if (action === 'breakdown' || action === 'autonomous_plan') {
      return [
        { id: "1", title: "Research and plan the task", completed: false },
        { id: "2", title: "Work on the first draft or implementation", completed: false },
        { id: "3", title: "Review and refine your work", completed: false },
        { id: "4", title: "Final check and submit", completed: false }
      ];
    }

    return { result: "LEO is experiencing high demand right now. Please try again in a moment." };

  } catch (error) {
    console.error('Unhandled API Error:', error);
    if (action === 'breakdown' || action === 'autonomous_plan') {
      return [
        { id: "1", title: "Research and plan the task", completed: false },
        { id: "2", title: "Work on the first draft or implementation", completed: false },
        { id: "3", title: "Review and refine your work", completed: false },
        { id: "4", title: "Final check and submit", completed: false }
      ];
    }
    return { result: "LEO is experiencing high demand right now. Please try again in a moment." };
  }
}

export async function askGeminiRaw(prompt) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    try {
      const res = await fetchWithTimeout('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      }, 12000);
      return await res.json();
    } catch (e) {
      console.error('Server AI fallback failed', e);
      return { error: 'Failed', text: '{"title":"Fallback Task","deadline":null,"hasDeadline":false}' };
    }
  }

  // --- TRY GROQ FIRST ---
  const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (groqApiKey) {
    try {
      const groqResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });
      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const groqText = groqData.choices?.[0]?.message?.content || '';
        if (groqText) return { text: groqText };
      }
    } catch (e) {
      console.error("Groq raw error:", e.message);
    }
  }

  // --- FALLBACK: GEMINI ---
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text: geminiText };
    }
  } catch (e) {
    console.error("Gemini raw error:", e.message);
  }

  return { error: 'Failed', text: '{"title":"Fallback Task","deadline":null,"hasDeadline":false}' };
}

export async function extractPdfTasks(base64Pdf) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found for PDF extraction");
    return { error: "No API key found" };
  }
  const prompt = "Extract all assignments, exams, and deliverables from this syllabus. Return a JSON object with exactly two keys: 'mainTitle' (a short, descriptive string representing the course name or syllabus title) and 'tasks' (a JSON array of tasks containing exactly 'title' (string) and 'deadline' (timestamp in milliseconds, assuming current academic year if no year is provided)). Do not include any other markdown.";
  
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ 
            role: 'user', 
            parts: [
              { text: prompt },
              { inlineData: { data: base64Pdf, mimeType: "application/pdf" } }
            ] 
          }]
        }),
      },
      15000 // PDFs need more time
    );

    if (response.ok) {
      const data = await response.json();
      let geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      geminiText = cleanMarkdown(geminiText);

      try {
        return JSON.parse(geminiText.trim());
      } catch (parseErr) {
        console.error("JSON Parse Error on Gemini Response:", geminiText);
        return { error: "Failed to parse JSON" };
      }
    } else {
      const err = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", err);
      return { error: "API returned an error" };
    }
  } catch (e) {
    console.error("PDF extraction error:", e.message);
    return { error: e.message };
  }
}
