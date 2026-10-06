/**
 * Aura Voice AI — AI Service Client
 * Handles communication with backend /api/chat and local client-side fallbacks.
 */

import { config } from './config.js';

export class AIService {
  constructor() {
    this.apiBaseUrl = window.location.origin.startsWith('http') ? window.location.origin : '';
  }

  async generateResponse(prompt, history = []) {
    const provider = config.get('provider') || 'builtin';
    const geminiApiKey = config.get('geminiApiKey');
    const openaiApiKey = config.get('openaiApiKey');
    const systemInstruction = config.get('systemInstruction');

    const apiKey = provider === 'gemini' ? geminiApiKey : (provider === 'openai' ? openaiApiKey : '');

    // Format message history
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      // 1. Attempt to call server API endpoint
      const response = await fetch(`${this.apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: formattedHistory,
          provider,
          apiKey,
          systemInstruction
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.reply || 'I received your message, but no content was returned.';
    } catch (networkOrServerError) {
      console.warn('Backend /api/chat unreachable or returned error, evaluating client-side fallback:', networkOrServerError);

      // If user selected Gemini or OpenAI with client-side key, or if backend is offline, handle client-side
      if (provider === 'gemini' && apiKey) {
        return await this.callClientSideGemini(apiKey, prompt, formattedHistory, systemInstruction);
      } else if (provider === 'openai' && apiKey) {
        return await this.callClientSideOpenAI(apiKey, prompt, formattedHistory, systemInstruction);
      } else if (provider === 'builtin') {
        return this.generateClientSideBuiltin(prompt);
      }

      // Re-throw server error if specific API key or configuration was requested
      throw networkOrServerError;
    }
  }

  async callClientSideGemini(apiKey, prompt, history, systemInstruction) {
    const contents = [];
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received from Gemini.';
  }

  async callClientSideOpenAI(apiKey, prompt, history, systemInstruction) {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API Error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response received from OpenAI.';
  }

  generateClientSideBuiltin(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return "Hello! I am Aura, your voice & text AI assistant. How can I help you today?";
    }
    if (lower.includes('code') || lower.includes('javascript')) {
      return "Here is a quick JavaScript snippet:\n\n```javascript\nconst greet = (name) => `Hello, ${name}! Welcome to Voice AI!`;\nconsole.log(greet('Explorer'));\n```\nWhat else would you like to build?";
    }
    return `I received your voice/text prompt: "${prompt}". You can configure your own Google Gemini or OpenAI API key in Settings (⚙️) to unlock full large language model intelligence!`;
  }
}

export const aiService = new AIService();
