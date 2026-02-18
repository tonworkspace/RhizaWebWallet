
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  // Use gemini-3-pro-preview for complex reasoning and elite financial advisor tasks
  async askAssistant(prompt: string, context?: any) {
    // Initializing AI instance with direct process.env.API_KEY access as per SDK guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: `You are RhizaCore AI, an elite financial advisor for the TON (The Open Network) blockchain ecosystem. 
          The user is currently using the RhizaCore DApp wallet. 
          Provide concise, technical, yet accessible advice on TON assets, Jettons, NFTs, staking, and security. 
          Always emphasize security and decentralization. 
          If asked about specific wallet features, remind them RhizaCore is a non-custodial wallet. 
          Portfolio Context: ${JSON.stringify(context || {})}`,
          temperature: 0.7,
        },
      });

      // Using .text property directly from response
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "I'm having trouble connecting to my neural core. Please check your connection or try again later.";
    }
  }

  async analyzeTransaction(txDetails: string) {
    // Initializing AI instance with direct process.env.API_KEY access
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this TON transaction for potential risks or unusual patterns: ${txDetails}`,
        config: {
          systemInstruction: "You are a blockchain security analyst. Flag high-risk addresses or suspicious smart contract interactions.",
        },
      });
      return response.text;
    } catch (error) {
      return "Risk analysis unavailable.";
    }
  }
}

export const geminiService = new GeminiService();
