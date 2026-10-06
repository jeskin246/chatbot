/**
 * Aura Voice AI — Configuration & LocalStorage Manager
 */

const STORAGE_KEYS = {
  SETTINGS: 'aura_voice_settings_v1',
  SESSIONS: 'aura_voice_sessions_v1',
  ACTIVE_SESSION: 'aura_voice_active_session_id',
  THEME: 'aura_voice_theme'
};

const DEFAULT_SETTINGS = {
  provider: 'builtin', // 'builtin', 'gemini', 'openai'
  geminiApiKey: '',
  openaiApiKey: '',
  systemInstruction: 'You are Aura, an intelligent, helpful, and concise AI voice and text assistant. Provide clear, structured, and informative responses.',
  sttLang: 'en-US',
  sttAutoSend: false,
  sttContinuous: true,
  ttsAutoSpeak: true,
  ttsVoiceURI: '',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  theme: 'theme-cyber-dark'
};

export class ConfigManager {
  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage, using defaults', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
    return this.settings;
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings(this.settings);
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to reset settings:', e);
    }
    return this.settings;
  }
}

export const config = new ConfigManager();
export { STORAGE_KEYS, DEFAULT_SETTINGS };
