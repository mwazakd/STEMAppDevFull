import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from '../types';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null;

if (!API_KEY) {
  console.warn("API_KEY is not set. Chatbot functionality will be disabled.");
  ai = null;
} else {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

const model = 'gemini-2.5-flash';

export const getChatbotResponse = async (history: ChatMessage[]): Promise<string> => {
  if (!ai) {
    return "Chatbot is currently unavailable. API key is missing.";
  }

  try {
    const contents = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: `You are a friendly and helpful STEM tutor for African students. 
            Your goal is to explain complex topics in a simple, encouraging, and culturally relevant way. 
            Use analogies related to everyday life in Africa where possible. Keep your answers concise and clear.`,
        }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error fetching response from Gemini API:", error);
    return "Sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
};
