import type { SoundKind } from '../types';

class SoundService {
  private muted = false;
  private audioCtx: AudioContext | null = null;

  private freqs: Record<SoundKind, number> = {
    coin: 740,
    gasolina: 570,
    power: 880,
    hit: 120,
    shield: 260
  };

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public play(kind: SoundKind): void {
    if (this.muted) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const o = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      const baseFreq = this.freqs[kind] || 440;

      o.type = kind === 'hit' ? 'sawtooth' : 'sine';
      o.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        kind === 'hit' ? 65 : baseFreq * 1.35,
        this.audioCtx.currentTime + 0.12
      );

      g.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.16);

      o.connect(g);
      g.connect(this.audioCtx.destination);

      o.start();
      o.stop(this.audioCtx.currentTime + 0.17);
    } catch {
      // Audio playback can fail if user hasn't interacted or unsupported
    }
  }
}

export const sound = new SoundService();
