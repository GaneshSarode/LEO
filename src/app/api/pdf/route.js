import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { base64Pdf, prompt } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'No API key provided' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf"
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    if (text.startsWith('```json')) text = text.replace(/^```json\n/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '');
    if (text.endsWith('```')) text = text.replace(/\n```$/, '');

    const tasks = JSON.parse(text);
    return Response.json({ tasks });
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
