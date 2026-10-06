/**
 * Aura Voice AI — Real-time Audio Visualizer
 * Renders live frequency waveform bars onto a canvas from microphone input using the Web Audio API.
 */

export class AudioVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.audioCtx = null;
    this.analyser = null;
    this.mediaStream = null;
    this.source = null;
    this.animFrameId = null;
    this.isActive = false;
    this.useSimulatedWave = false;
    this.simulatedPhase = 0;
  }

  async start() {
    this.isActive = true;
    this.resizeCanvas();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;

        this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);
        this.source.connect(this.analyser);
        this.useSimulatedWave = false;
      } else {
        this.useSimulatedWave = true;
      }
    } catch (err) {
      console.warn('Microphone stream for visualizer unavailable, falling back to simulated wave:', err);
      this.useSimulatedWave = true;
    }

    this.render();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
  }

  render() {
    if (!this.isActive || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    const barCount = 32;
    const barWidth = (width / barCount) * 0.65;
    const barGap = (width / barCount) * 0.35;

    let dataArray = new Uint8Array(barCount);

    if (this.analyser && !this.useSimulatedWave) {
      const bufferLength = this.analyser.frequencyBinCount;
      const rawData = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(rawData);

      // Resample data to barCount
      const step = Math.floor(bufferLength / barCount) || 1;
      for (let i = 0; i < barCount; i++) {
        dataArray[i] = rawData[i * step] || 0;
      }
    } else {
      // Simulated audio wave dynamics
      this.simulatedPhase += 0.08;
      for (let i = 0; i < barCount; i++) {
        const val = Math.sin(this.simulatedPhase + (i * 0.3)) * 0.5 + 0.5;
        const subVal = Math.cos(this.simulatedPhase * 0.7 + (i * 0.2)) * 0.3 + 0.3;
        dataArray[i] = Math.floor((val + subVal) * 128);
      }
    }

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const percent = dataArray[i] / 255;
      const barHeight = Math.max(4, percent * height * 0.85);
      const x = i * (barWidth + barGap) + barGap / 2;
      const y = (height - barHeight) / 2;

      // Create gradient for each bar
      const gradient = this.ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#06b6d4'); // Cyan
      gradient.addColorStop(0.5, '#8b5cf6'); // Purple
      gradient.addColorStop(1, '#ec4899'); // Rose

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
        this.ctx.roundRect(x, y, barWidth, barHeight, 3);
      } else {
        this.ctx.rect(x, y, barWidth, barHeight);
      }
      this.ctx.fill();
    }

    this.animFrameId = requestAnimationFrame(() => this.render());
  }

  stop() {
    this.isActive = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
