import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Try Gemini First (using the specified gemini-2.5-flash model)
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (geminiText) {
          return NextResponse.json({ text: geminiText });
        }
      } else {
        const err = await response.text();
        console.warn(`Gemini API failed with status ${response.status}:`, err);
      }
    } catch (geminiError) {
      console.warn("Gemini fetch error:", geminiError);
    }

    // Fallback to Groq if Gemini fails
    console.log('Gemini failed or returned empty. Falling back to Groq...');
    const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
    
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
            return NextResponse.json({ text: groqText });
          }
        } else {
          const groqErr = await groqResponse.text();
          console.error(`Groq API error (${groqResponse.status}):`, groqErr);
        }
      } catch (groqError) {
        console.error('Groq fetch error:', groqError);
      }
    }

    // Both failed
    return NextResponse.json({ error: 'AI Services Unavailable', text: '{"title":"Fallback Task","deadline":null,"hasDeadline":false}' }, { status: 503 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', text: '{"title":"Fallback Task","deadline":null,"hasDeadline":false}' }, { status: 500 });
  }
}
