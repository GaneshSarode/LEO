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

      case 'briefing':
        systemPrompt = `You are LEO, a proactive productivity coach. The user is a ${payload.userProfile?.role || 'user'}. Review their tasks and provide a short (2-3 sentences max) daily briefing. Start by saying 'Good morning ${payload.userProfile?.name || 'there'}!' or similar. State exactly what they should focus on first based on deadlines. Keep it highly actionable and direct.`;
        userMessage = `Tasks: ${JSON.stringify(payload.tasks || [])}`;
        break;

      case 'autonomous_plan':
        systemPrompt = `You are an autonomous AI planner. The user needs to accomplish: ${payload.title} by ${payload.deadline || 'None'}. Break this down into exactly 3-5 subtasks. Return ONLY a valid JSON array of objects with format: [{ "title": "subtask name" }]. Do not include markdown formatting or explanation.`;
        userMessage = `Task: ${payload.title}\nDeadline: ${payload.deadline || 'None'}`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    const prompt = userMessage;

    // --- Helper: parse AI text into a Response ---
    const parseAndRespond = (text) => {
      // Strip markdown formatting if AI still includes it
      if (text.startsWith('```json')) text = text.replace(/^```json\n/, '');
      if (text.startsWith('```')) text = text.replace(/^```\n/, '');
      if (text.endsWith('```')) text = text.replace(/\n```$/, '');

      if (action !== 'coach' && action !== 'briefing') {
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
    };

    // ========== STEP 1: Try Gemini (1 retry, 700ms wait) ==========
    let geminiText = null;
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
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
          geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          break;
        }

        const errData = await response.json().catch(() => ({}));
        const isRetryable = response.status === 503 || response.status === 429 ||
                            (errData.error?.message && errData.error.message.toLowerCase().includes('high demand'));

        if (!isRetryable) break;

        if (attempt < maxRetries) {
          console.log(`Gemini API retryable error. Retrying... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      } catch (fetchErr) {
        console.log(`Gemini fetch error: ${fetchErr.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      }
    }

    if (geminiText) {
      return parseAndRespond(geminiText);
    }

    // ========== STEP 2: Gemini failed — try Groq ==========
    console.log('Gemini failed. Falling back to Groq...');
    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            console.log('Groq fallback succeeded.');
            return parseAndRespond(groqText);
          }
        } else {
          const groqErr = await groqResponse.text().catch(() => '');
          console.error(`Groq API error (${groqResponse.status}): ${groqErr}`);
        }
      } catch (groqFetchErr) {
        console.error('Groq fetch error:', groqFetchErr.message);
      }
    } else {
      console.log('GROQ_API_KEY not set, skipping Groq fallback.');
    }

    // ========== STEP 3: Both failed — canned responses ==========
    console.log('Both Gemini and Groq failed. Using canned fallback.');

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
