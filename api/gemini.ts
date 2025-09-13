import { GoogleGenAI, GenerateContentParameters } from "@google/genai";

// This file is a secure backend proxy. It runs on the server, not in the browser.
// It safely uses your API_KEY environment variable to call the Google AI API.

let ai: GoogleGenAI;

function getAi() {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set on the server.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: GenerateContentParameters = await req.json();

    const aiClient = getAi();
    const response = await aiClient.models.generateContent(body);
    
    // We can't return the full response object as it might contain complex, non-serializable parts.
    // Instead, we extract the parts the frontend actually needs.
    const result = {
      text: response.text,
      candidates: response.candidates,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in Gemini proxy:', error);
    return new Response(JSON.stringify({ 
        error: 'An error occurred while communicating with the AI model.',
        details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
