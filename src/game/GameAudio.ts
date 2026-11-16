export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientNodes: OscillatorNode[] = [];
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.start();
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.55 : 0, this.context.currentTime, 0.18);
    }
  }

  playFootstep(running: boolean): void {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(running ? 108 : 88, now);
    oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(running ? 0.13 : 0.09, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain);
    gain.connect(this.master!);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  }

  playJump(): void {
    this.playTone(300, 490, 0.2, 0.055);
  }

  playInteract(): void {
    this.playTone(520, 760, 0.14, 0.045);
  }

  playLocked(): void {
    this.playTone(260, 145, 0.2, 0.055);
  }

  playDoor(): void {
    this.playTone(170, 82, 0.55, 0.11, 'triangle');
    this.playTone(520, 280, 0.32, 0.025, 'sine', 0.04);
  }

  playCollision(): void {
    this.playTone(115, 58, 0.18, 0.12, 'triangle');
  }

  playMilestone(): void {
    this.playTone(440, 660, 0.42, 0.065);
    this.playTone(554.37, 830.61, 0.56, 0.045, 'sine', 0.08);
    this.playTone(659.25, 987.77, 0.7, 0.032, 'sine', 0.16);
  }

  dispose(): void {
    this.ambientNodes.forEach((oscillator) => oscillator.stop());
    this.ambientNodes = [];
    const context = this.context;
    this.context = null;
    this.master = null;
    if (context && context.state !== 'closed') {
      void context.close().catch((error: unknown) => console.error('Audio context gagal ditutup.', error));
    }
  }

  private start(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
      this.createAmbientPad();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume().catch((error: unknown) => console.error('Audio gagal dimulai.', error));
    }
  }

  private createAmbientPad(): void {
    if (!this.context || !this.master) return;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 760;
    const padGain = this.context.createGain();
    padGain.gain.value = 0.12;
    filter.connect(padGain);
    padGain.connect(this.master);

    const swell = this.context.createOscillator();
    const swellDepth = this.context.createGain();
    swell.frequency.value = 0.075;
    swellDepth.gain.value = 0.018;
    swell.connect(swellDepth);
    swellDepth.connect(padGain.gain);
    swell.start();
    this.ambientNodes.push(swell);

    for (const [frequency, volume] of [[130.81, 0.35], [164.81, 0.23], [196, 0.2], [261.63, 0.12]]) {
      const oscillator = this.context.createOscillator();
      const voiceGain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      voiceGain.gain.value = volume;
      oscillator.connect(voiceGain);
      voiceGain.connect(filter);
      oscillator.start();
      this.ambientNodes.push(oscillator);
    }
  }

  private playTone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    delay = 0,
  ): void {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.02, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}
