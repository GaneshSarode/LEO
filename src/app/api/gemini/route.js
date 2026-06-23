import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPTS = {
  breakdown: `You are a task breakdown specialist. Given a task title and optional description, break it into 3-7 actionable subtasks with time estimates. Return ONLY a JSON array, no markdown, no code blocks: [{"title": "subtask description", "estimatedMinutes": number}]`,

  prioritize: `You are a productivity expert. Given a list of tasks with their deadlines and descriptions, rank them by urgency and importance. Return ONLY a JSON array of task IDs in priority order with brief reasoning: [{"id": "taskId", "reason": "brief reason"}]`,

  schedule: `You are a daily planner. Given tasks and the current time, create an optimal schedule. Consider task priority, deadlines, and energy levels (morning=high focus, afternoon=moderate, evening=low). Return ONLY a JSON array: [{"taskId": "id", "taskTitle": "title", "suggestedTime": "HH:MM", "duration": minutes, "reason": "brief reason"}]`,

  coach: `You are LEO, a friendly AI productivity coach inside "The Last-Minute Life Saver" app. You help users manage tasks, overcome procrastination, and boost productivity. Be encouraging, practical, and concise. Use emojis sparingly but warmly. If the user shares their tasks context, reference specific tasks by name. Keep responses under 150 words unless the user asks for detail.`,

  nudge: `Generate a brief, motivational productivity nudge (1-2 sentences). Be specific and actionable, not generic. Return only the text, no quotes.`,

  dailySummary: `Given the user's task statistics, generate a brief personalized daily insight (2-3 sentences). Mention specific numbers from the stats. Be encouraging but honest about what needs attention. Return only the text, no quotes or markdown.`,
};

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const { action, message, taskContext, chatHistory } = await request.json();

    if (!action || !SYSTEM_PROMPTS[action]) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid actions: ${Object.keys(SYSTEM_PROMPTS).join(', ')}` },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = SYSTEM_PROMPTS[action];

    // Build the conversation context
    let fullPrompt = systemPrompt;

    if (taskContext) {
      fullPrompt += `\n\nUser's current tasks:\n${taskContext}`;
    }

    // For chat action, include history
    let contents = [];
    if (action === 'coach' && chatHistory && chatHistory.length > 0) {
      // Build multi-turn conversation
      contents = chatHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
      // Add the new message
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    } else {
      contents = [
        {
          role: 'user',
          parts: [{ text: `${fullPrompt}\n\n${message}` }],
        },
      ];
    }

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: action === 'coach' ? 0.8 : 0.3,
        maxOutputTokens: action === 'coach' ? 1024 : 2048,
      },
    });

    const response = result.response;
    const text = response.text();

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
