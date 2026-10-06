/**
 * Aura Voice AI — Speech-to-Text (STT) Module
 * Handles browser microphone access, continuous/interim speech recognition, and error management.
 */

export class SpeechToText {
  constructor(options = {}) {
    this.recognition = null;
    this.isListening = false;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.lang = options.lang || 'en-US';
    this.continuous = options.continuous !== false;

    // Callbacks
    this.onStart = options.onStart || (() => {});
    this.onInterimResult = options.onInterimResult || (() => {});
    this.onFinalResult = options.onFinalResult || (() => {});
    this.onError = options.onError || (() => {});
    this.onEnd = options.onEnd || (() => {});

    this.init();
  }

  isSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  init() {
    if (!this.isSupported()) {
      console.warn('SpeechRecognition is not supported in this browser.');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.lang;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.interimTranscript = '';
      this.finalTranscript = '';
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += transcript;
          this.finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      this.interimTranscript = interim;

      if (interim) {
        this.onInterimResult(interim, this.finalTranscript);
      }

      if (currentFinal) {
        this.onFinalResult(this.finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let userFriendlyMessage = 'An error occurred with voice recognition.';

      switch (event.error) {
        case 'not-allowed':
          userFriendlyMessage = 'Microphone access was denied. Please allow microphone permissions in your browser address bar.';
          break;
        case 'no-speech':
          userFriendlyMessage = 'No speech was detected. Please try speaking closer to your microphone.';
          break;
        case 'audio-capture':
          userFriendlyMessage = 'No microphone was found or microphone is busy in another app.';
          break;
        case 'network':
          userFriendlyMessage = 'Speech recognition network error. Please check your internet connection.';
          break;
        case 'aborted':
          // User or system intentionally cancelled recognition
          userFriendlyMessage = 'Voice recognition stopped.';
          break;
        default:
          userFriendlyMessage = `Voice recognition error: ${event.error}`;
      }

      this.isListening = false;
      this.onError(userFriendlyMessage, event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd(this.finalTranscript.trim());
    };

    return true;
  }

  setLanguage(langCode) {
    this.lang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  setContinuous(isContinuous) {
    this.continuous = isContinuous;
    if (this.recognition) {
      this.recognition.continuous = isContinuous;
    }
  }

  start() {
    if (!this.recognition) {
      if (!this.init()) {
        this.onError('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or a Web Speech-compatible browser.', 'unsupported');
        return false;
      }
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.interimTranscript = '';
      this.finalTranscript = '';
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('SpeechRecognition start failed or already active:', e);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
    }
    this.isListening = false;
  }

  abort() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch (e) {
        console.warn('Error aborting recognition:', e);
      }
    }
    this.isListening = false;
  }
}
