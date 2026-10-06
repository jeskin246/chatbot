/**
 * Aura Voice AI — Main Application Orchestrator
 * Integrates Voice Input, Voice Output, Audio Visualizer, AI Service, and UI interactions.
 */

import { config } from './config.js';
import { SpeechToText } from './speech-to-text.js';
import { TextToSpeech } from './text-to-speech.js';
import { AudioVisualizer } from './audio-visualizer.js';
import { chatManager } from './chat-manager.js';
import { aiService } from './ai-service.js';
import { DOM, ui } from './ui.js';

class App {
  constructor() {
    this.stt = null;
    this.tts = null;
    this.visualizer = null;
    this.isGenerating = false;
    this.currentRecognizedSpeech = '';
  }

  async init() {
    console.log('Initializing Aura Voice AI...');

    // 1. Initialize Audio Visualizer
    if (DOM.visualizerCanvas) {
      this.visualizer = new AudioVisualizer(DOM.visualizerCanvas);
    }

    // 2. Initialize Speech-to-Text
    this.stt = new SpeechToText({
      lang: config.get('sttLang') || 'en-US',
      continuous: config.get('sttContinuous') !== false,
      onStart: () => this.handleSTTStart(),
      onInterimResult: (interim, finalSoFar) => this.handleSTTInterim(interim, finalSoFar),
      onFinalResult: (finalText) => this.handleSTTFinal(finalText),
      onError: (errMsg, errCode) => this.handleSTTError(errMsg, errCode),
      onEnd: (finalText) => this.handleSTTEnd(finalText)
    });

    // 3. Initialize Text-to-Speech
    this.tts = new TextToSpeech({
      voiceURI: config.get('ttsVoiceURI'),
      rate: config.get('ttsRate'),
      pitch: config.get('ttsPitch'),
      onStart: () => this.handleTTSStart(),
      onEnd: () => this.handleTTSEnd(),
      onError: (errMsg) => this.handleTTSError(errMsg)
    });

    // Hook voice loading into settings dropdown
    this.tts.onVoicesLoaded = (voices) => this.populateVoiceOptions(voices);

    // 4. Initial Theme and Settings Load
    ui.applyTheme(config.get('theme') || 'theme-cyber-dark');
    ui.updateProviderBadge();
    this.syncSettingsUI();

    // 5. Initial Chat History & Session Render
    ui.renderHistoryList();
    const activeMessages = chatManager.getMessages();
    ui.renderMessages(activeMessages);

    // 6. Bind All Event Listeners
    this.bindEvents();

    console.log('Aura Voice AI is ready.');
  }

  /* --------------------------------------------------------------------------
   * Voice Input (Speech-to-Text) Handlers
   * -------------------------------------------------------------------------- */
  handleSTTStart() {
    DOM.micToggleBtn.classList.add('listening');
    DOM.micToggleBtn.title = 'Listening... Click to stop';
    ui.setStatus('listening');
    ui.showSpeechPreview();
    if (this.visualizer) {
      this.visualizer.start();
    }
  }

  handleSTTInterim(interim, finalSoFar) {
    this.currentRecognizedSpeech = (finalSoFar + ' ' + interim).trim();
    ui.updateSpeechPreviewText(interim, finalSoFar);
  }

  handleSTTFinal(finalText) {
    this.currentRecognizedSpeech = finalText.trim();
    ui.updateSpeechPreviewText('', finalText);

    // If auto-send toggle is enabled
    if (config.get('sttAutoSend') && finalText) {
      this.stt.stop();
      this.sendUserMessage(finalText);
    }
  }

  handleSTTError(errMsg, errCode) {
    DOM.micToggleBtn.classList.remove('listening');
    DOM.micToggleBtn.title = 'Click to Speak (Ctrl+M)';
    ui.setStatus('ready');
    ui.hideSpeechPreview();
    if (this.visualizer) {
      this.visualizer.stop();
    }

    if (errCode !== 'aborted') {
      ui.showToast(errMsg, 'error', 5000);
    }
  }

  handleSTTEnd(finalText) {
    DOM.micToggleBtn.classList.remove('listening');
    DOM.micToggleBtn.title = 'Click to Speak (Ctrl+M)';
    ui.setStatus('ready');
    if (this.visualizer) {
      this.visualizer.stop();
    }

    const recognized = (finalText || this.currentRecognizedSpeech).trim();
    if (recognized && !config.get('sttAutoSend')) {
      // Keep speech preview open so user can click 'Send Now' or 'Send to Input Box'
      ui.updateSpeechPreviewText('', recognized);
    } else {
      ui.hideSpeechPreview();
    }
  }

  toggleMicrophone() {
    if (this.stt.isListening) {
      this.stt.stop();
    } else {
      // Stop TTS if assistant is currently speaking
      if (this.tts.isSpeaking) {
        this.tts.stop();
      }
      this.currentRecognizedSpeech = '';
      this.stt.start();
    }
  }

  /* --------------------------------------------------------------------------
   * Voice Output (Text-to-Speech) Handlers
   * -------------------------------------------------------------------------- */
  handleTTSStart() {
    ui.setStatus('speaking');
    DOM.activeVoiceSpeakingBar.classList.remove('hidden');
  }

  handleTTSEnd() {
    ui.setStatus('ready');
    DOM.activeVoiceSpeakingBar.classList.add('hidden');
    document.querySelectorAll('.speak-msg-btn.speaking-active').forEach(b => {
      b.classList.remove('speaking-active');
      b.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read Aloud';
    });
  }

  handleTTSError(errMsg) {
    ui.setStatus('ready');
    DOM.activeVoiceSpeakingBar.classList.add('hidden');
    ui.showToast(errMsg, 'error');
  }

  speakMessage(text, buttonElement = null) {
    if (this.tts.isSpeaking) {
      this.tts.stop();
    }

    if (buttonElement) {
      buttonElement.classList.add('speaking-active');
      buttonElement.innerHTML = '<i class="fa-solid fa-waveform"></i> Playing...';
    }

    this.tts.speak(text, () => {
      if (buttonElement) {
        buttonElement.classList.remove('speaking-active');
        buttonElement.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read Aloud';
      }
    });
  }

  /* --------------------------------------------------------------------------
   * Message Sending & AI Generation
   * -------------------------------------------------------------------------- */
  async sendUserMessage(text) {
    const prompt = (text || DOM.chatTextarea.value).trim();
    if (!prompt || this.isGenerating) return;

    // Reset inputs & hide preview
    DOM.chatTextarea.value = '';
    this.adjustTextareaHeight();
    this.currentRecognizedSpeech = '';
    ui.hideSpeechPreview();

    // If STT was running, stop it
    if (this.stt.isListening) {
      this.stt.stop();
    }

    // Add User message
    const userMsg = chatManager.addMessage('user', prompt);
    DOM.welcomeView.classList.add('hidden');
    ui.appendMessageElement(userMsg);
    ui.renderHistoryList();
    ui.scrollToBottom();

    // Set UI to thinking state
    this.isGenerating = true;
    ui.setStatus('thinking');
    ui.showTypingIndicator();

    try {
      const history = chatManager.getMessages();
      const reply = await aiService.generateResponse(prompt, history.slice(0, -1));

      // Remove typing indicator & append assistant response
      ui.hideTypingIndicator();
      const aiMsg = chatManager.addMessage('assistant', reply);
      ui.appendMessageElement(aiMsg);
      ui.scrollToBottom();

      // Speak reply if auto-TTS is enabled
      if (config.get('ttsAutoSpeak')) {
        this.tts.speak(reply);
      } else {
        ui.setStatus('ready');
      }

    } catch (err) {
      console.error('Failed to generate response:', err);
      ui.hideTypingIndicator();
      ui.setStatus('ready');
      ui.showToast(err.message || 'An error occurred while communicating with the AI.', 'error', 6000);

      // Append error message to chat
      const errorMsg = chatManager.addMessage('assistant', `⚠️ **Error**: ${err.message || 'Failed to generate response. Please check your network or API configuration in Settings.'}`);
      ui.appendMessageElement(errorMsg);
      ui.scrollToBottom();
    } finally {
      this.isGenerating = false;
    }
  }

  /* --------------------------------------------------------------------------
   * Settings Synchronization & Helpers
   * -------------------------------------------------------------------------- */
  syncSettingsUI() {
    const provider = config.get('provider') || 'builtin';
    DOM.providerSelect.value = provider;
    
    if (provider === 'gemini') {
      DOM.apiKeyGroup.classList.remove('hidden');
      DOM.apiKeyInput.value = config.get('geminiApiKey') || '';
      DOM.apiKeyHint.textContent = 'Enter your Google Gemini API Key (stored locally in browser).';
    } else if (provider === 'openai') {
      DOM.apiKeyGroup.classList.remove('hidden');
      DOM.apiKeyInput.value = config.get('openaiApiKey') || '';
      DOM.apiKeyHint.textContent = 'Enter your OpenAI API Key (stored locally in browser).';
    } else {
      DOM.apiKeyGroup.classList.add('hidden');
    }

    DOM.systemInstructionInput.value = config.get('systemInstruction') || '';
    DOM.sttLangSelect.value = config.get('sttLang') || 'en-US';
    DOM.sttAutosendToggle.checked = !!config.get('sttAutoSend');
    DOM.sttContinuousToggle.checked = config.get('sttContinuous') !== false;
    DOM.ttsAutoSpeakToggle.checked = config.get('ttsAutoSpeak') !== false;
    DOM.ttsRateRange.value = config.get('ttsRate') || 1.0;
    DOM.ttsRateVal.textContent = `${config.get('ttsRate') || 1.0}x`;
    DOM.ttsPitchRange.value = config.get('ttsPitch') || 1.0;
    DOM.ttsPitchVal.textContent = `${config.get('ttsPitch') || 1.0}`;

    // Auto speak toggle button in top navbar
    if (config.get('ttsAutoSpeak')) {
      DOM.autoSpeakToggleBtn.classList.add('active');
    } else {
      DOM.autoSpeakToggleBtn.classList.remove('active');
    }
  }

  populateVoiceOptions(voices) {
    if (!DOM.ttsVoiceSelect) return;
    DOM.ttsVoiceSelect.innerHTML = '';

    if (!voices || voices.length === 0) {
      DOM.ttsVoiceSelect.innerHTML = '<option value="">Default System Voice</option>';
      return;
    }

    const currentVoiceURI = config.get('ttsVoiceURI');

    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — [Default]' : ''}`;
      if (voice.voiceURI === currentVoiceURI) {
        option.selected = true;
      }
      DOM.ttsVoiceSelect.appendChild(option);
    });
  }

  adjustTextareaHeight() {
    DOM.chatTextarea.style.height = 'auto';
    DOM.chatTextarea.style.height = Math.min(DOM.chatTextarea.scrollHeight, 160) + 'px';
  }

  /* --------------------------------------------------------------------------
   * Event Bindings
   * -------------------------------------------------------------------------- */
  bindEvents() {
    // 1. Microphone Toggle
    DOM.micToggleBtn.addEventListener('click', () => this.toggleMicrophone());

    // 2. Chat Textarea & Send Button
    DOM.chatTextarea.addEventListener('input', () => {
      this.adjustTextareaHeight();
      const length = DOM.chatTextarea.value.length;
      if (length > 100) {
        DOM.charCounter.classList.remove('hidden');
        DOM.charCounter.textContent = length;
      } else {
        DOM.charCounter.classList.add('hidden');
      }
    });

    DOM.chatTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendUserMessage();
      }
    });

    DOM.sendMsgBtn.addEventListener('click', () => this.sendUserMessage());

    // 3. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        this.toggleMicrophone();
      }
    });

    // 4. Speech Preview Action Buttons
    DOM.speechSendNowBtn.addEventListener('click', () => {
      if (this.currentRecognizedSpeech) {
        this.sendUserMessage(this.currentRecognizedSpeech);
      }
    });

    DOM.speechEditBtn.addEventListener('click', () => {
      if (this.currentRecognizedSpeech) {
        DOM.chatTextarea.value = this.currentRecognizedSpeech;
        this.adjustTextareaHeight();
        DOM.chatTextarea.focus();
        ui.hideSpeechPreview();
      }
    });

    DOM.speechCancelBtn.addEventListener('click', () => {
      this.currentRecognizedSpeech = '';
      if (this.stt.isListening) {
        this.stt.stop();
      }
      ui.hideSpeechPreview();
    });

    // 5. Quick Prompt Cards
    document.querySelectorAll('.prompt-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          this.sendUserMessage(prompt);
        }
      });
    });

    // 6. Navigation & Sidebar Toggles
    DOM.toggleSidebarBtn.addEventListener('click', () => {
      DOM.sidebar.classList.toggle('open');
      DOM.sidebarOverlay.classList.toggle('active');
    });

    DOM.closeSidebarBtn.addEventListener('click', () => {
      DOM.sidebar.classList.remove('open');
      DOM.sidebarOverlay.classList.remove('active');
    });

    DOM.sidebarOverlay.addEventListener('click', () => {
      DOM.sidebar.classList.remove('open');
      DOM.sidebarOverlay.classList.remove('active');
    });

    // New Conversation
    DOM.newChatBtn.addEventListener('click', () => {
      chatManager.createNewSession();
      ui.renderHistoryList();
      ui.renderMessages([]);
      if (window.innerWidth <= 768) {
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('active');
      }
    });

    // History Search
    DOM.historySearch.addEventListener('input', (e) => {
      ui.renderHistoryList(e.target.value);
    });

    // Clear All Chats
    DOM.clearAllChatsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all conversation history?')) {
        chatManager.clearAllSessions();
        ui.renderHistoryList();
        ui.renderMessages([]);
        ui.showToast('All chat history cleared.', 'info');
      }
    });

    // History Item Click & Delete Delegation
    DOM.historyList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.history-item-delete');
      if (deleteBtn) {
        e.stopPropagation();
        const sessionId = deleteBtn.getAttribute('data-delete-id');
        chatManager.deleteSession(sessionId);
        ui.renderHistoryList();
        ui.renderMessages(chatManager.getMessages());
        return;
      }

      const item = e.target.closest('.history-item');
      if (item) {
        const sessionId = item.getAttribute('data-session-id');
        chatManager.switchSession(sessionId);
        ui.renderHistoryList();
        ui.renderMessages(chatManager.getMessages());
        if (window.innerWidth <= 768) {
          DOM.sidebar.classList.remove('open');
          DOM.sidebarOverlay.classList.remove('active');
        }
      }
    });

    // 7. Message Action Delegation (Read Aloud, Copy, Code Copy)
    DOM.messagesContainer.addEventListener('click', (e) => {
      // Copy Code Button
      const copyCodeBtn = e.target.closest('.copy-code-btn');
      if (copyCodeBtn) {
        const rawCode = decodeURIComponent(copyCodeBtn.getAttribute('data-code') || '');
        navigator.clipboard.writeText(rawCode).then(() => {
          copyCodeBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          setTimeout(() => {
            copyCodeBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Code';
          }, 2000);
        });
        return;
      }

      // Read Aloud Button
      const speakBtn = e.target.closest('.speak-msg-btn');
      if (speakBtn) {
        const msgId = speakBtn.getAttribute('data-msg-id');
        const session = chatManager.getActiveSession();
        const msg = session?.messages.find(m => m.id === msgId);
        if (msg) {
          this.speakMessage(msg.content, speakBtn);
        }
        return;
      }

      // Copy Message Text
      const copyMsgBtn = e.target.closest('.copy-msg-btn');
      if (copyMsgBtn) {
        const msgId = copyMsgBtn.getAttribute('data-msg-id');
        const session = chatManager.getActiveSession();
        const msg = session?.messages.find(m => m.id === msgId);
        if (msg) {
          navigator.clipboard.writeText(msg.content).then(() => {
            ui.showToast('Message copied to clipboard!', 'success');
          });
        }
      }
    });

    // 8. TTS Stop Controls
    DOM.stopSpeakingBtn.addEventListener('click', () => {
      this.tts.stop();
    });

    DOM.autoSpeakToggleBtn.addEventListener('click', () => {
      const current = config.get('ttsAutoSpeak');
      const updated = !current;
      config.set('ttsAutoSpeak', updated);
      DOM.autoSpeakToggleBtn.classList.toggle('active', updated);
      DOM.ttsAutoSpeakToggle.checked = updated;
      ui.showToast(updated ? 'Auto-TTS Voice Output: ON' : 'Auto-TTS Voice Output: OFF', 'info');
    });

    // 9. Settings Modal Controls
    const openSettings = () => {
      this.syncSettingsUI();
      DOM.settingsModal.classList.remove('hidden');
    };

    DOM.settingsBtn.addEventListener('click', openSettings);
    DOM.settingsSidebarBtn.addEventListener('click', () => {
      openSettings();
      if (window.innerWidth <= 768) {
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('active');
      }
    });

    DOM.closeSettingsBtn.addEventListener('click', () => {
      DOM.settingsModal.classList.add('hidden');
    });

    DOM.providerSelect.addEventListener('change', (e) => {
      const provider = e.target.value;
      if (provider === 'gemini' || provider === 'openai') {
        DOM.apiKeyGroup.classList.remove('hidden');
        DOM.apiKeyInput.value = (provider === 'gemini' ? config.get('geminiApiKey') : config.get('openaiApiKey')) || '';
      } else {
        DOM.apiKeyGroup.classList.add('hidden');
      }
    });

    DOM.toggleKeyVisibility.addEventListener('click', () => {
      const type = DOM.apiKeyInput.type === 'password' ? 'text' : 'password';
      DOM.apiKeyInput.type = type;
      DOM.toggleKeyVisibility.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });

    DOM.ttsRateRange.addEventListener('input', (e) => {
      DOM.ttsRateVal.textContent = `${e.target.value}x`;
    });

    DOM.ttsPitchRange.addEventListener('input', (e) => {
      DOM.ttsPitchVal.textContent = e.target.value;
    });

    DOM.testVoiceBtn.addEventListener('click', () => {
      const voiceURI = DOM.ttsVoiceSelect.value;
      const rate = parseFloat(DOM.ttsRateRange.value) || 1.0;
      const pitch = parseFloat(DOM.ttsPitchRange.value) || 1.0;
      this.tts.setVoice(voiceURI);
      this.tts.setRate(rate);
      this.tts.setPitch(pitch);
      this.tts.speak('Hello! This is a preview of my voice synthesis.');
    });

    // Theme Picker
    DOM.themeCards.forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.getAttribute('data-theme');
        config.set('theme', theme);
        ui.applyTheme(theme);
      });
    });

    DOM.saveSettingsBtn.addEventListener('click', () => {
      const provider = DOM.providerSelect.value;
      const keyVal = DOM.apiKeyInput.value.trim();

      const newSettings = {
        provider,
        systemInstruction: DOM.systemInstructionInput.value.trim(),
        sttLang: DOM.sttLangSelect.value,
        sttAutoSend: DOM.sttAutosendToggle.checked,
        sttContinuous: DOM.sttContinuousToggle.checked,
        ttsAutoSpeak: DOM.ttsAutoSpeakToggle.checked,
        ttsVoiceURI: DOM.ttsVoiceSelect.value,
        ttsRate: parseFloat(DOM.ttsRateRange.value),
        ttsPitch: parseFloat(DOM.ttsPitchRange.value)
      };

      if (provider === 'gemini') {
        newSettings.geminiApiKey = keyVal;
      } else if (provider === 'openai') {
        newSettings.openaiApiKey = keyVal;
      }

      config.saveSettings(newSettings);

      // Apply runtime updates to STT and TTS
      this.stt.setLanguage(newSettings.sttLang);
      this.stt.setContinuous(newSettings.sttContinuous);
      this.tts.setVoice(newSettings.ttsVoiceURI);
      this.tts.setRate(newSettings.ttsRate);
      this.tts.setPitch(newSettings.ttsPitch);

      ui.updateProviderBadge();
      DOM.autoSpeakToggleBtn.classList.toggle('active', newSettings.ttsAutoSpeak);
      DOM.settingsModal.classList.add('hidden');
      ui.showToast('Settings applied successfully!', 'success');
    });

    DOM.resetSettingsBtn.addEventListener('click', () => {
      if (confirm('Reset all settings to default values?')) {
        config.reset();
        this.syncSettingsUI();
        ui.applyTheme(config.get('theme'));
        ui.updateProviderBadge();
        ui.showToast('Settings reset to defaults.', 'info');
      }
    });

    // 10. Export Modal Controls
    DOM.exportHistoryBtn.addEventListener('click', () => {
      DOM.exportModal.classList.remove('hidden');
    });

    DOM.closeExportBtn.addEventListener('click', () => {
      DOM.exportModal.classList.add('hidden');
    });

    DOM.exportMdBtn.addEventListener('click', () => {
      try {
        chatManager.exportConversation('markdown');
        DOM.exportModal.classList.add('hidden');
        ui.showToast('Conversation exported as Markdown!', 'success');
      } catch (err) {
        ui.showToast(err.message, 'error');
      }
    });

    DOM.exportJsonBtn.addEventListener('click', () => {
      try {
        chatManager.exportConversation('json');
        DOM.exportModal.classList.add('hidden');
        ui.showToast('Conversation exported as JSON!', 'success');
      } catch (err) {
        ui.showToast(err.message, 'error');
      }
    });

    DOM.exportTxtBtn.addEventListener('click', () => {
      try {
        chatManager.exportConversation('txt');
        DOM.exportModal.classList.add('hidden');
        ui.showToast('Conversation exported as Plain Text!', 'success');
      } catch (err) {
        ui.showToast(err.message, 'error');
      }
    });
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
