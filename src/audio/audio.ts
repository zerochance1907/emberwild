import { settings } from '../game/settings';
import { chordNotes, parseLead, TRACKS, type TrackId } from './tracks';

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type Sfx =
  | 'select' | 'confirm' | 'cancel' | 'bump' | 'hit' | 'superhit' | 'weakhit' | 'faint' | 'shake' | 'caught' | 'levelup'
  | 'heal' | 'door' | 'encounter' | 'item' | 'save' | 'ledge' | 'evolve' | 'buy' | 'error' | 'thorns' | 'lantern'
  | 'exclaim' | 'throw' | 'statup' | 'statdown' | 'run' | 'text'
  | 'gust' | 'splash' | 'valve' | 'thunder' | 'hatch';

/**
 * Tiny WebAudio chiptune engine: a look-ahead step sequencer with square/triangle
 * voices and a noise channel, plus synthesized sound effects. No audio files.
 */
class AudioEngine {
  ctx: AudioContext | null = null;
  private music!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private current: TrackId | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private seq: ReturnType<AudioEngine['compile']> | null = null;
  private ambience: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wantAmbience: 'rain' | 'storm' | null = null;
  private lastText = 0;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.music = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    this.music.connect(comp);
    this.sfxBus.connect(comp);
    comp.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolume();
    const want = this.current;
    this.current = null;
    if (want) this.playMusic(want);
    if (this.wantAmbience) this.setAmbience(this.wantAmbience);
  }

  applyVolume() {
    if (!this.ctx) return;
    this.music.gain.value = (settings.musicVol / 10) * 0.22;
    this.sfxBus.gain.value = (settings.sfxVol / 10) * 0.35;
  }

  private compile(id: TrackId) {
    const t = TRACKS[id];
    const lead = parseLead(t.lead);
    const total = Math.max(lead.steps, t.chords.length * 16);
    const tr = t.transpose ?? 0;
    return { t, lead, total, tr, byStep: new Map(lead.notes.map((n) => [n.step, n])) };
  }

  playMusic(id: TrackId) {
    if (this.current === id) return;
    this.current = id;
    if (!this.ctx) return;
    this.stopTimer();
    this.seq = this.compile(id);
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.current = null;
    this.stopTimer();
  }

  private stopTimer() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    if (!this.ctx || !this.seq) return;
    const { t, total, tr, byStep } = this.seq;
    const stepDur = 60 / t.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const s = this.step % total;
      const at = this.nextTime;
      const bar = Math.floor(s / 16) % t.chords.length;
      const inBar = s % 16;
      const chord = chordNotes(t.chords[bar]).map((n) => n + tr);
      const n = byStep.get(s);
      if (n) this.tone(t.leadWave ?? 'square', midiHz(n.midi + tr), at, n.len * stepDur * 0.92, 0.32, this.music, 0.01);
      // bass
      const root = chord[0] - 12;
      if (t.bass === 'pulse' && inBar % 2 === 0) this.tone('triangle', midiHz(inBar % 4 === 0 ? root : root + 12), at, stepDur * 1.6, 0.5, this.music);
      if (t.bass === 'walk' && inBar % 4 === 0) this.tone('triangle', midiHz([root, root + 7, root + 12, root + 7][inBar / 4]), at, stepDur * 3.5, 0.5, this.music);
      if (t.bass === 'gallop' && [0, 3, 4, 7, 8, 11, 12, 14].includes(inBar)) this.tone('triangle', midiHz(inBar === 14 ? root + 12 : root), at, stepDur * 0.9, 0.55, this.music);
      if (t.bass === 'drone' && inBar === 0) this.tone('triangle', midiHz(root), at, stepDur * 15, 0.45, this.music);
      // arpeggio
      if (t.arp && inBar % 2 === 1) {
        const arpNote = chord[Math.floor(inBar / 2) % 3] + 12;
        this.tone('square', midiHz(arpNote), at, stepDur * 0.7, 0.07, this.music);
      }
      // drums
      const ch = t.drums?.[inBar];
      if (ch === 'k') this.kick(at);
      else if (ch === 's') this.noiseHit(at, 0.12, 0.25, 1800);
      else if (ch === 'h') this.noiseHit(at, 0.03, 0.08, 7000);
      this.nextTime += stepDur;
      this.step++;
      if (t.loop === false && this.step >= total) {
        this.stopTimer();
        break;
      }
    }
  }

  private tone(type: OscillatorType, hz: number, at: number, dur: number, vol: number, dest: AudioNode, attack = 0.005, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(hz, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.setValueAtTime(vol, at + Math.max(attack, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  private kick(at: number) {
    this.tone('sine', 150, at, 0.12, 0.7, this.music, 0.002, 40);
  }

  private noiseHit(at: number, dur: number, vol: number, freq: number, dest: AudioNode = this.music) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = freq > 4000 ? 'highpass' : 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  setAmbience(kind: 'rain' | 'storm' | null) {
    if (this.ambience && kind === this.wantAmbience) return;
    this.wantAmbience = kind;
    if (!this.ctx) return;
    if (this.ambience) {
      const a = this.ambience;
      a.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
      setTimeout(() => a.src.stop(), 700);
      this.ambience = null;
    }
    if (kind === 'rain' || kind === 'storm') {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      f.frequency.value = kind === 'storm' ? 900 : 1400;
      g.gain.linearRampToValueAtTime(kind === 'storm' ? 0.26 : 0.18, this.ctx.currentTime + 1);
      src.connect(f);
      f.connect(g);
      g.connect(this.sfxBus);
      src.start();
      this.ambience = { src, gain: g };
    }
  }

  /** Synthesized one-shot sound effects. */
  sfx(name: Sfx) {
    if (!this.ctx) return;
    const at = this.ctx.currentTime + 0.005;
    const b = this.sfxBus;
    const seq = (notes: number[], step: number, type: OscillatorType = 'square', vol = 0.35, dur = step * 0.9) =>
      notes.forEach((m, i) => this.tone(type, midiHz(m), at + i * step, dur, vol, b));
    switch (name) {
      case 'select': return this.tone('square', 880, at, 0.04, 0.2, b);
      case 'text': {
        if (this.ctx.currentTime - this.lastText < 0.045) return;
        this.lastText = this.ctx.currentTime;
        return this.tone('square', 620 + Math.random() * 60, at, 0.025, 0.06, b);
      }
      case 'confirm': return seq([76, 83], 0.05);
      case 'cancel': return seq([72, 67], 0.05);
      case 'error': return seq([50, 46], 0.08, 'square', 0.3);
      case 'bump': return this.tone('square', 90, at, 0.08, 0.3, b);
      case 'hit': this.noiseHit(at, 0.15, 0.6, 900, b); return this.tone('square', 200, at, 0.1, 0.3, b, 0.002, 60);
      case 'superhit': this.noiseHit(at, 0.3, 0.8, 600, b); this.tone('sawtooth', 300, at, 0.25, 0.35, b, 0.002, 50); return;
      case 'weakhit': return this.noiseHit(at, 0.1, 0.35, 1500, b);
      case 'faint': return this.tone('square', 600, at, 0.6, 0.3, b, 0.01, 60);
      case 'shake': return seq([60, 64], 0.06, 'square', 0.25);
      case 'caught': return seq([72, 76, 79, 84, 79, 84], 0.08);
      case 'levelup': return seq([72, 76, 79, 84, 88], 0.07, 'square', 0.3);
      case 'heal': return seq([72, 76, 79, 76, 79, 84], 0.11, 'triangle', 0.5);
      case 'door': this.noiseHit(at, 0.12, 0.3, 500, b); return;
      case 'encounter': return seq([64, 67, 70, 73, 76, 79, 82], 0.04, 'square', 0.3);
      case 'item': return seq([79, 84, 88, 91], 0.09, 'square', 0.3);
      case 'save': return seq([67, 72, 79], 0.08, 'triangle', 0.5);
      case 'ledge': return this.tone('square', 300, at, 0.18, 0.25, b, 0.005, 700);
      case 'evolve': return seq([60, 64, 67, 72, 76, 79, 84, 88], 0.12, 'triangle', 0.5);
      case 'buy': return seq([84, 88], 0.06);
      case 'thorns': this.noiseHit(at, 0.5, 0.5, 300, b); return seq([60, 55, 50], 0.12, 'sawtooth', 0.2);
      case 'lantern': return seq([84, 91, 96], 0.09, 'triangle', 0.4);
      case 'exclaim': return seq([88, 93], 0.05, 'square', 0.3);
      case 'throw': return this.tone('square', 400, at, 0.25, 0.2, b, 0.005, 1200);
      case 'statup': return seq([67, 71, 74, 79], 0.05, 'square', 0.25);
      case 'statdown': return seq([79, 74, 71, 67], 0.05, 'square', 0.25);
      case 'run': return seq([72, 69, 65], 0.05, 'square', 0.25);
      case 'gust': this.noiseHit(at, 0.45, 0.35, 2400, b); return this.tone('sine', 300, at, 0.4, 0.12, b, 0.05, 900);
      case 'splash': this.noiseHit(at, 0.25, 0.45, 1200, b); return this.tone('triangle', 500, at, 0.15, 0.2, b, 0.005, 180);
      case 'valve': this.noiseHit(at, 0.6, 0.3, 700, b); return seq([55, 50, 55, 62], 0.1, 'square', 0.22);
      case 'thunder': this.noiseHit(at, 1.4, 0.7, 180, b); return this.tone('sine', 70, at, 1.2, 0.5, b, 0.01, 30);
      case 'hatch': return seq([72, 79, 76, 84, 88, 91], 0.09, 'triangle', 0.45);
    }
  }

  /** A short creature cry derived from its species id (each one is unique). */
  cry(species: string, pitch = 1) {
    if (!this.ctx) return;
    let h = 0;
    for (const ch of species) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const base = 300 + (h % 500);
    const at = this.ctx.currentTime + 0.01;
    const wave: OscillatorType = (['square', 'sawtooth', 'triangle'] as const)[h % 3];
    this.tone(wave, base * pitch, at, 0.12, 0.3, this.sfxBus, 0.005, base * pitch * (1.2 + ((h >> 3) % 5) / 10));
    this.tone(wave, base * 1.3 * pitch, at + 0.1, 0.2, 0.25, this.sfxBus, 0.005, base * 0.7 * pitch);
  }
}

export const audio = new AudioEngine();
