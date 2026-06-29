// Helper: fetch with a timeout so we never hang
const fetchWithTimeout = (url, options, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

const cleanMarkdown = (text) => {
  if (!text) return '';
  if (text.startsWith('```json')) text = text.replace(/^```json\n/, '');
  if (text.startsWith('```')) text = text.replace(/^```\n/, '');
  if (text.endsWith('```')) text = text.replace(/\n```$/, '');
  return text;
};

export async function askGemini(action, payload) {
  try {
    const res = await fetchWithTimeout('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    }, 15000); // 15 seconds max for server route to respond
    
    if (!res.ok) throw new Error(`API route failed: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('askGemini failed:', error);
    
    // Fallback response format if everything fails
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
  try {
    const res = await fetchWithTimeout('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'raw', payload: { prompt } })
    }, 15000);
    
    if (!res.ok) throw new Error(`API route failed: ${res.status}`);
    const data = await res.json();
    return { text: data.result || JSON.stringify(data) };
  } catch (e) {
    console.error('askGeminiRaw failed:', e);
    return { error: 'Failed', text: '{"title":"Fallback Task","deadline":null,"hasDeadline":false}' };
  }
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent`,
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
      25000 // PDFs need more time
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
