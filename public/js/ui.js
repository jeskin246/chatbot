/**
 * Aura Voice AI — User Interface Controller & DOM Utilities
 */

import { chatManager } from './chat-manager.js';
import { config } from './config.js';

export const DOM = {
  // Navigation & Layout
  app: document.getElementById('app'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
  closeSidebarBtn: document.getElementById('close-sidebar-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  historyList: document.getElementById('history-list'),
  historySearch: document.getElementById('history-search'),
  clearAllChatsBtn: document.getElementById('clear-all-chats-btn'),
  exportHistoryBtn: document.getElementById('export-history-btn'),
  settingsSidebarBtn: document.getElementById('settings-sidebar-btn'),
  providerBadge: document.getElementById('provider-badge'),

  // Status & Speaking
  aiStatusPill: document.getElementById('ai-status-pill'),
  aiStatusText: document.getElementById('ai-status-text'),
  activeVoiceSpeakingBar: document.getElementById('active-voice-speaking-bar'),
  stopSpeakingBtn: document.getElementById('stop-speaking-btn'),
  autoSpeakToggleBtn: document.getElementById('auto-speak-toggle-btn'),
  settingsBtn: document.getElementById('settings-btn'),

  // Chat Stream
  chatStream: document.getElementById('chat-stream'),
  welcomeView: document.getElementById('welcome-view'),
  messagesContainer: document.getElementById('messages-container'),
  scrollBottomBtn: document.getElementById('scroll-bottom-btn'),

  // Live Speech Recognition Card
  speechPreviewCard: document.getElementById('speech-preview-card'),
  speechInterimText: document.getElementById('speech-interim-text'),
  speechDuration: document.getElementById('speech-duration'),
  speechCancelBtn: document.getElementById('speech-cancel-btn'),
  speechEditBtn: document.getElementById('speech-edit-btn'),
  speechSendNowBtn: document.getElementById('speech-send-now-btn'),

  // Input & Visualizer
  audioVisualizerWrap: document.getElementById('audio-visualizer-wrap'),
  visualizerCanvas: document.getElementById('visualizer-canvas'),
  micToggleBtn: document.getElementById('mic-toggle-btn'),
  chatTextarea: document.getElementById('chat-textarea'),
  sendMsgBtn: document.getElementById('send-msg-btn'),
  charCounter: document.getElementById('char-counter'),
  ttsStatusHint: document.getElementById('tts-status-hint'),

  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  providerSelect: document.getElementById('provider-select'),
  apiKeyGroup: document.getElementById('api-key-group'),
  apiKeyInput: document.getElementById('api-key-input'),
  apiKeyHint: document.getElementById('api-key-hint'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  systemInstructionInput: document.getElementById('system-instruction-input'),
  sttLangSelect: document.getElementById('stt-lang-select'),
  sttAutosendToggle: document.getElementById('stt-autosend-toggle'),
  sttContinuousToggle: document.getElementById('stt-continuous-toggle'),
  ttsAutoSpeakToggle: document.getElementById('tts-auto-speak-toggle'),
  ttsVoiceSelect: document.getElementById('tts-voice-select'),
  testVoiceBtn: document.getElementById('test-voice-btn'),
  ttsRateRange: document.getElementById('tts-rate-range'),
  ttsRateVal: document.getElementById('tts-rate-val'),
  ttsPitchRange: document.getElementById('tts-pitch-range'),
  ttsPitchVal: document.getElementById('tts-pitch-val'),
  resetSettingsBtn: document.getElementById('reset-settings-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  themeCards: document.querySelectorAll('.theme-option-card'),

  // Export Modal
  exportModal: document.getElementById('export-modal'),
  closeExportBtn: document.getElementById('close-export-btn'),
  exportMdBtn: document.getElementById('export-md-btn'),
  exportJsonBtn: document.getElementById('export-json-btn'),
  exportTxtBtn: document.getElementById('export-txt-btn'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

export class UIController {
  constructor() {
    this.speechTimerInterval = null;
    this.speechStartTime = null;
  }

  showToast(message, type = 'info', duration = 4000) {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'error') icon = 'fa-triangle-exclamation';
    if (type === 'success') icon = 'fa-circle-check';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <div>${message}</div>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  setStatus(status) {
    // status: 'ready' | 'listening' | 'thinking' | 'speaking'
    DOM.aiStatusPill.className = 'status-indicator-pill ' + status;

    if (status === 'listening') {
      DOM.aiStatusText.textContent = 'Listening to Mic...';
    } else if (status === 'thinking') {
      DOM.aiStatusText.textContent = 'Generating Answer...';
    } else if (status === 'speaking') {
      DOM.aiStatusText.textContent = 'Speaking Response...';
    } else {
      DOM.aiStatusText.textContent = 'Assistant Ready';
    }
  }

  updateProviderBadge() {
    const provider = config.get('provider') || 'builtin';
    if (provider === 'gemini') {
      DOM.providerBadge.textContent = 'Google Gemini';
      DOM.providerBadge.style.color = '#38bdf8';
    } else if (provider === 'openai') {
      DOM.providerBadge.textContent = 'OpenAI GPT';
      DOM.providerBadge.style.color = '#10b981';
    } else {
      DOM.providerBadge.textContent = 'Built-in AI';
      DOM.providerBadge.style.color = 'var(--accent-cyan)';
    }
  }

  applyTheme(themeName) {
    document.body.className = themeName;
    DOM.themeCards.forEach(card => {
      if (card.getAttribute('data-theme') === themeName) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // Live Speech Preview Box
  showSpeechPreview() {
    DOM.speechPreviewCard.classList.remove('hidden');
    DOM.speechInterimText.textContent = 'Listening... Speak into your microphone';
    DOM.speechInterimText.classList.remove('recognized');
    DOM.audioVisualizerWrap.classList.remove('hidden');

    this.speechStartTime = Date.now();
    this.updateSpeechTimer();
    this.speechTimerInterval = setInterval(() => this.updateSpeechTimer(), 1000);
  }

  updateSpeechPreviewText(interim, finalSoFar = '') {
    const fullText = (finalSoFar + ' ' + interim).trim();
    if (fullText) {
      DOM.speechInterimText.textContent = `"${fullText}"`;
      DOM.speechInterimText.classList.add('recognized');
    }
  }

  hideSpeechPreview() {
    DOM.speechPreviewCard.classList.add('hidden');
    DOM.audioVisualizerWrap.classList.add('hidden');
    if (this.speechTimerInterval) {
      clearInterval(this.speechTimerInterval);
      this.speechTimerInterval = null;
    }
  }

  updateSpeechTimer() {
    if (!this.speechStartTime) return;
    const elapsedSeconds = Math.floor((Date.now() - this.speechStartTime) / 1000);
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');
    DOM.speechDuration.textContent = `${mins}:${secs}`;
  }

  // Render History List in Sidebar
  renderHistoryList(searchTerm = '') {
    const sessions = chatManager.getAllSessionsList();
    const activeSession = chatManager.getActiveSession();

    DOM.historyList.innerHTML = '';

    const filtered = sessions.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filtered.length === 0) {
      DOM.historyList.innerHTML = `<li style="padding:0.75rem; font-size:0.8rem; color:var(--text-muted); text-align:center;">No conversations found</li>`;
      return;
    }

    filtered.forEach(session => {
      const li = document.createElement('li');
      li.className = `history-item ${activeSession && activeSession.id === session.id ? 'active' : ''}`;
      li.setAttribute('data-session-id', session.id);

      li.innerHTML = `
        <div class="history-item-title" title="${chatManager.escapeHTML(session.title)}">
          <i class="fa-regular fa-message"></i>
          <span>${chatManager.escapeHTML(session.title)}</span>
        </div>
        <button class="history-item-delete" data-delete-id="${session.id}" title="Delete chat">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      DOM.historyList.appendChild(li);
    });
  }

  // Render Messages in Active Chat Stream
  renderMessages(messages = []) {
    DOM.messagesContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
      DOM.welcomeView.classList.remove('hidden');
      return;
    }

    DOM.welcomeView.classList.add('hidden');

    messages.forEach(msg => {
      this.appendMessageElement(msg);
    });

    this.scrollToBottom();
  }

  appendMessageElement(msg) {
    const isUser = msg.role === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user-row' : 'ai-row'}`;
    row.id = msg.id;

    const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const renderedContent = isUser ? chatManager.escapeHTML(msg.content).replace(/\n/g, '<br>') : chatManager.renderMarkdown(msg.content);

    let actionsHtml = '';
    if (!isUser) {
      actionsHtml = `
        <div class="message-actions">
          <button class="msg-action-btn speak-msg-btn" data-msg-id="${msg.id}" title="Read aloud">
            <i class="fa-solid fa-volume-high"></i> Read Aloud
          </button>
          <button class="msg-action-btn copy-msg-btn" data-msg-id="${msg.id}" title="Copy answer">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="message-avatar">
        <i class="fa-solid ${isUser ? 'fa-user' : 'fa-brain-circuit'}"></i>
      </div>
      <div class="message-content-wrap">
        <div class="message-header">
          <span>${isUser ? 'You' : 'Aura AI'}</span>
          <span>•</span>
          <span>${formattedTime}</span>
        </div>
        <div class="message-bubble">
          ${renderedContent}
        </div>
        ${actionsHtml}
      </div>
    `;

    DOM.messagesContainer.appendChild(row);
  }

  showTypingIndicator() {
    const id = 'typing-indicator-row';
    const existing = document.getElementById(id);
    if (existing) return;

    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.id = id;
    row.innerHTML = `
      <div class="message-avatar">
        <i class="fa-solid fa-brain-circuit"></i>
      </div>
      <div class="message-content-wrap">
        <div class="message-bubble typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    DOM.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator-row');
    if (indicator) {
      indicator.remove();
    }
  }

  scrollToBottom() {
    DOM.chatStream.scrollTop = DOM.chatStream.scrollHeight;
  }
}

export const ui = new UIController();
