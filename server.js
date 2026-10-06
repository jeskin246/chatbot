require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Built-in intelligent response generator for zero-config offline / out-of-the-box usage
function generateBuiltinResponse(prompt, history = []) {
  const lower = prompt.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening|day)|sup|howdy)\b/.test(lower)) {
    const greetings = [
      "Hello! I am your AI Voice & Text Assistant. How can I help you today?",
      "Hi there! It's great to talk with you. You can chat with me using your keyboard or click the microphone to speak.",
      "Greetings! I am ready to answer your questions, brainstorm ideas, write code, or just chat. What's on your mind?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Identity / Capabilities
  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('what can you do') || lower.includes('help')) {
    return `I am an intelligent multi-modal AI Assistant equipped with:
• 🎙️ **Voice Input (Speech-to-Text)**: Speak naturally through your microphone with live interim transcript preview.
• 🔊 **Voice Output (Text-to-Speech)**: Listen to my answers with customizable voices, pitch, and speed.
• 💬 **Multi-Turn Conversation**: Full chat history with sessions, export (Markdown/JSON), and code syntax rendering.
• ⚡ **AI Providers**: Built-in smart assistant engine, with direct support for **Google Gemini** and **OpenAI GPT** models via Settings.

Try asking me a question, speaking with your mic, or asking for a code example!`;
  }

  // Time and Date
  if (lower.includes('time') || lower.includes('date') || lower.includes('today')) {
    const now = new Date();
    return `Currently, it is **${now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, and the local time is **${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}**.`;
  }

  // Coding / Tech Queries
  if (lower.includes('python') || lower.includes('javascript') || lower.includes('code') || lower.includes('function') || lower.includes('html') || lower.includes('css')) {
    if (lower.includes('fibonacci')) {
      return `Here is an efficient Fibonacci sequence generator in JavaScript and Python:

\`\`\`javascript
// JavaScript Fibonacci Generator
function fibonacci(n) {
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq.slice(0, n);
}
console.log(fibonacci(10)); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

\`\`\`python
# Python Fibonacci Generator
def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
\`\`\`
Would you like me to explain how this works or write it in another language?`;
    }

    if (lower.includes('api') || lower.includes('fetch') || lower.includes('async')) {
      return `Here is a modern example of making an asynchronous API call with error handling:

\`\`\`javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`https://api.example.com/users/\${userId}\`);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
\`\`\`
This handles network errors and non-200 HTTP response codes cleanly.`;
    }

    return `Here is a helpful programming tip! When structuring modern applications:
1. **Modular Architecture**: Separate concerns into distinct modules (API client, UI rendering, State management).
2. **Robust Error Handling**: Always wrap asynchronous I/O in \`try/catch\` blocks.
3. **Accessibility**: Use semantic HTML elements and proper ARIA labels.

What specific coding challenge or language would you like assistance with?`;
  }

  // Joke / Fun
  if (lower.includes('joke') || lower.includes('funny')) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "Why did the JavaScript developer wear glasses? Because they didn't C# (see sharp)! 👓",
      "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // Advice / Philosophy / General
  if (lower.includes('weather')) {
    return "I don't have direct access to live satellite sensors in offline mode, but you can configure a live Gemini/OpenAI API key in the Settings modal (⚙️) for real-time web capabilities!";
  }

  // Default intelligent contextual reply
  return `Thank you for your message: *" ${prompt} "*.

I have processed your query. If you'd like to explore this further:
1. Ask me to elaborate or provide step-by-step instructions.
2. Request practical examples or code snippets.
3. You can also connect your own **Google Gemini** or **OpenAI** API key in the top-right **Settings (⚙️)** menu for unrestricted large language model inference!

What would you like to explore next?`;
}

// Call Google Gemini API
async function callGeminiAPI(apiKey, prompt, history = [], systemInstruction = '') {
  const contents = [];
  
  // Format past history into Gemini format
  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  // Add current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `Gemini API Error: HTTP ${response.status} ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return text;
}

// Call OpenAI API
async function callOpenAIAPI(apiKey, prompt, history = [], systemInstruction = '', model = 'gpt-4o-mini') {
  const messages = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  } else {
    messages.push({ role: 'system', content: 'You are a helpful, intelligent, and concise AI voice and text assistant.' });
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

  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `OpenAI API Error: HTTP ${response.status} ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI returned an empty response.');
  }
  return text;
}

// Main Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, history, provider, apiKey, systemInstruction, model } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A non-empty prompt message is required.' });
    }

    const selectedProvider = provider || process.env.DEFAULT_PROVIDER || 'builtin';
    const effectiveGeminiKey = apiKey || process.env.GEMINI_API_KEY;
    const effectiveOpenAIKey = apiKey || process.env.OPENAI_API_KEY;

    let responseText = '';

    if (selectedProvider === 'gemini') {
      if (!effectiveGeminiKey) {
        return res.status(400).json({
          error: 'Gemini API Key is missing. Please provide it in Settings (⚙️) or set GEMINI_API_KEY in .env.'
        });
      }
      responseText = await callGeminiAPI(effectiveGeminiKey, prompt.trim(), history, systemInstruction);
    } else if (selectedProvider === 'openai') {
      if (!effectiveOpenAIKey) {
        return res.status(400).json({
          error: 'OpenAI API Key is missing. Please provide it in Settings (⚙️) or set OPENAI_API_KEY in .env.'
        });
      }
      responseText = await callOpenAIAPI(effectiveOpenAIKey, prompt.trim(), history, systemInstruction, model);
    } else {
      // Built-in intelligent fallback
      responseText = generateBuiltinResponse(prompt.trim(), history);
    }

    return res.json({
      reply: responseText,
      provider: selectedProvider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in /api/chat:', error);
    return res.status(500).json({
      error: error.message || 'Internal Server Error while generating response.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      defaultProvider: process.env.DEFAULT_PROVIDER || 'builtin'
    }
  });
});

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=====================================================`);
  console.log(`🚀 AI Voice & Text Chatbot Server running successfully!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🎙️ Speech-to-Text & Text-to-Speech ready`);
  console.log(`=====================================================`);
});
