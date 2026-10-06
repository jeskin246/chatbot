# 🎙️ Aura Voice AI — Intelligent Voice & Text Chatbot

A modern, full-stack AI Chatbot application featuring real-time **Speech-to-Text (Voice Input)**, **Text-to-Speech (Voice Output)**, live **Audio Waveform Visualizer**, **Live Interim Speech Preview**, multi-session **Chat History**, and dynamic **Multi-Model AI Integration** (Built-in offline engine, Google Gemini, OpenAI).

---

## ✨ Features

- 💬 **Dual Input Modes**: Seamlessly switch between keyboard typing and natural voice microphone input.
- 🎙️ **Real-Time Speech-to-Text (STT)**: Uses the Web Speech Recognition API with live interim transcript updates.
- 👁️ **Live Speech Preview**: View, edit, send, or discard recognized speech before it gets submitted.
- 🔊 **Text-to-Speech (TTS)**: The AI speaks its responses aloud with customizable voices, speech rate, and pitch controls.
- 📊 **Real-time Audio Visualizer**: Dynamic frequency waveform visualizer powered by the Web Audio API.
- 🧠 **Multi-Provider AI Intelligence**:
  - **Built-in Smart Assistant**: Zero-configuration intelligent responses for conversation, coding, reasoning, and math.
  - **Google Gemini API**: Plug in a Gemini API key for high-speed frontier reasoning.
  - **OpenAI API**: Connect GPT-4o / GPT-4o-mini models.
- 📜 **Chat History & Session Management**:
  - Multi-session conversation management stored persistently in LocalStorage.
  - Search past conversations in real time.
  - Export chat history as **Markdown (.md)**, **JSON (.json)**, or **Plain Text (.txt)**.
- 🎨 **Modern Design & Themes**:
  - Cyberpunk Dark, Midnight Blue, and Clean Light themes.
  - Markdown formatting with syntax-highlighted code blocks and 1-click copy buttons.
  - Responsive design optimized for desktop and mobile devices.
- 🛡️ **Robust Error Handling**:
  - Clear user alerts for microphone permission denials, hardware disconnections, and API rate limits.
  - Graceful client-side fallback if the backend server is unreachable.

---

## 📁 Modular Project Structure

```
tsa1/
├── package.json              # Project dependencies and npm scripts
├── server.js                 # Express server & API endpoints (Gemini, OpenAI, Built-in)
├── .env.example              # Example environment configuration
├── README.md                 # Complete documentation and setup guide
└── public/                   # Client-side frontend application
    ├── index.html            # Main semantic HTML5 single-page application
    ├── css/
    │   ├── main.css          # Design system, CSS variables, typography, responsive layout
    │   ├── chat.css          # Chat bubbles, markdown styling, code copy, typing indicator
    │   ├── voice.css         # Mic button states, visualizer, live speech preview card
    │   └── modal.css         # Settings modal, export modal, range sliders, switches
    └── js/
        ├── app.js            # Main application orchestrator and event binder
        ├── config.js         # Configuration & LocalStorage state management
        ├── speech-to-text.js # Web Speech Recognition API module & error handlers
        ├── text-to-speech.js # Speech Synthesis API module & natural voice sanitization
        ├── audio-visualizer.js # Web Audio API microphone frequency waveform renderer
        ├── chat-manager.js   # Conversation sessions, history persistence & export
        ├── ai-service.js     # API communication client & direct client-side fallback
        └── ui.js             # DOM controller, toast notifications & status indicators
```

---

## 🛠️ Requirements

- **Node.js**: `v18.0.0` or newer (Tested on Node.js v24)
- **Web Browser**:
  - **Google Chrome** or **Microsoft Edge** (Recommended for full Web Speech API & Web Audio support)
  - **Brave / Opera / Safari** (Supported with microphone permissions enabled)

---

## 🚀 Quickstart & Local Setup

### 1. Install Dependencies
Open your terminal in the project directory and run:

```bash
npm install
```

### 2. (Optional) Configure Environment Variables
Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

You can optionally define your default API keys in `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DEFAULT_PROVIDER=builtin
```
*(Note: You can also configure API keys dynamically in the web UI Settings without editing files).*

### 3. Start the Application
Run the local server:

```bash
npm start
```

Or run with automatic file reloading for development:
```bash
npm run dev
```

### 4. Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## 🎙️ How to Use Voice Features

1. **Microphone Input**:
   - Click the **Microphone (🎙️)** button at the bottom left or press `Ctrl + M` / `Cmd + M`.
   - When prompted by your browser, click **"Allow"** to grant microphone access.
   - Speak your question or message.
   - The **Live Speech Preview** card will display your transcribed words in real time.
   - Click **"Send Now"**, **"Send to Input Box"** (to make edits), or let it auto-send if enabled in Settings.

2. **Listening to AI Responses (TTS)**:
   - When the AI generates a response, it will automatically speak if **Auto-TTS** is enabled (toggle in the top-right navbar).
   - You can also click **"Read Aloud"** on any past assistant message.
   - Click **"Stop"** in the top navbar banner at any time to pause/stop voice output.

3. **Customizing Voice & Models**:
   - Click the **Settings (⚙️)** icon in the top-right.
   - Switch between Built-in AI, Google Gemini, or OpenAI.
   - Select your preferred Speech Recognition Language (English, Spanish, French, German, Japanese, Hindi, etc.).
   - Choose different synthetic voices from your operating system and adjust speaking rate and pitch.

---

## 🔧 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Microphone access was denied"** | Click the padlock or microphone icon in your browser's URL address bar and change the Microphone permission from "Block" to "Allow", then refresh. |
| **Speech recognition not working** | Make sure you are using a browser that supports Web Speech Recognition (Google Chrome, Microsoft Edge, Safari). |
| **API key error** | Verify that your Google Gemini or OpenAI API key is active and has sufficient billing/quota credits. |
| **No sound during Text-to-Speech** | Check your system volume, verify the TTS toggle is active (volume icon in top navbar), and ensure a valid voice is selected in Settings. |

---

## 📄 License
MIT License. Free for personal and commercial use.
