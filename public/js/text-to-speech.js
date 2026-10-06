/**
 * Aura Voice AI — Text-to-Speech (TTS) Module
 * Handles browser speech synthesis, voice list caching, markdown sanitization, and playback control.
 */

export class TextToSpeech {
  constructor(options = {}) {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.selectedVoiceURI = options.voiceURI || '';
    this.rate = options.rate || 1.0;
    this.pitch = options.pitch || 1.0;

    // Callbacks
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onError = options.onError || (() => {});

    this.initVoices();
  }

  isSupported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  initVoices() {
    if (!this.isSupported()) return;

    const populateVoices = () => {
      this.voices = this.synth.getVoices();
      if (typeof this.onVoicesLoaded === 'function') {
        this.onVoicesLoaded(this.voices);
      }
    };

    populateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = populateVoices;
    }
  }

  getVoices() {
    if (this.voices.length === 0 && this.isSupported()) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI;
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, parseFloat(rate) || 1.0));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.5, Math.min(1.5, parseFloat(pitch) || 1.0));
  }

  /**
   * Clean markdown tags, emojis, and code blocks so the synthesizer speaks naturally.
   */
  sanitizeForSpeech(text) {
    if (!text) return '';
    
    let clean = text
      // Replace code blocks with a brief notice
      .replace(/```[\s\S]*?```/g, ' [Code example omitted from speech] ')
      // Strip inline code `code`
      .replace(/`([^`]+)`/g, '$1')
      // Strip markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Strip headings, bold, italics, strikethroughs
      .replace(/[#*_~]+/g, '')
      // Strip list markers
      .replace(/^[\s*+-]+\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Strip HTML tags
      .replace(/<\/?[^>]+(>|$)/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return clean;
  }

  speak(text, onEndCallback = null) {
    if (!this.isSupported()) {
      this.onError('Text-to-Speech is not supported in this browser.');
      return;
    }

    // Cancel any current utterance
    this.stop();

    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      // Select voice
      const voices = this.getVoices();
      let matchedVoice = null;

      if (this.selectedVoiceURI) {
        matchedVoice = voices.find(v => v.voiceURI === this.selectedVoiceURI);
      }

      // If no voice specified or found, look for nice English voices (Google, Natural, Samantha, etc.)
      if (!matchedVoice && voices.length > 0) {
        matchedVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online')))) ||
                       voices.find(v => v.lang.startsWith('en')) ||
                       voices[0];
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.rate = this.rate;
      utterance.pitch = this.pitch;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.onEnd();
        if (typeof onEndCallback === 'function') {
          onEndCallback();
        }
      };

      utterance.onerror = (event) => {
        // Interrupted/canceled is normal when user clicks stop
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('Speech synthesis error:', event);
          this.onError(`TTS Error: ${event.error}`);
        }
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.onEnd();
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.error('Failed to initiate TTS:', e);
      this.isSpeaking = false;
      this.onError('Failed to speak response.');
    }
  }

  stop() {
    if (!this.isSupported()) return;
    try {
      this.synth.cancel();
    } catch (e) {
      console.warn('Error stopping speech synthesis:', e);
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.onEnd();
  }
}
