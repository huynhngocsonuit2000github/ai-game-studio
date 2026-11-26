import cues from '../assets/runtime/audio/cues.json';
import type { Settings } from './save.ts';
import type { Session } from './session.ts';

const urls = import.meta.glob<string>('../assets/runtime/audio/*.{ogg,m4a}', { eager: true, query: '?url', import: 'default' });
type Cue = (typeof cues.tracks)[number];
type Voice = { source: AudioBufferSourceNode; critical: boolean };
type Event = ReturnType<Session['step']>[number];

const effects: Partial<Record<Event, string>> = {
  jump: 'jump', land: 'land', stomp: 'stomp', fall: 'fall', healthChanged: 'hurt',
  seedCollected: 'seed', fireflyCollected: 'firefly', lanternLit: 'lantern', gateOpened: 'gate', levelCleared: 'clear',
};
const critical = new Set(['hurt', 'fall', 'seed', 'lantern', 'gate', 'clear']);
const ui = new Set(['hover', 'confirm', 'resume']);

export class TrailAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private score?: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer | undefined>>();
  private decoded = new Map<string, AudioBuffer>();
  private voices = new Set<Voice>();
  private tracks = new Map<string, AudioBufferSourceNode>();
  private planned = new Set<string>();
  private active = false;
  private lastLand = -Infinity;
  private lastHover = -Infinity;
  private readonly preferOgg = Boolean(document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"'));

  constructor(private settings: Settings) {}

  unlock() {
    try {
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        this.master = context.createGain();
        this.music = context.createGain();
        this.sfx = context.createGain();
        this.score = context.createGain();
        // The master output stays below -1 dBFS even when several cues coincide.
        const limiter = context.createWaveShaper();
        limiter.curve = Float32Array.from({ length: 1025 }, (_, index) => {
          const sample = index / 512 - 1;
          const magnitude = Math.abs(sample);
          return Math.sign(sample) * (magnitude <= .72 ? magnitude : .72 + .16 * Math.tanh((magnitude - .72) / .16));
        });
        this.master.connect(limiter).connect(context.destination);
        this.music.connect(this.master);
        this.sfx.connect(this.master);
        this.score.connect(this.music);
        this.score.gain.value = 0;
        this.applySettings();
      }
      void this.context.resume().catch(() => {});
    } catch {
      // Game feedback is also rendered on screen when Web Audio is unavailable.
    }
  }

  applySettings() {
    if (!this.master || !this.music || !this.sfx) return;
    this.master.gain.value = this.settings.muted ? 0 : this.settings.master;
    this.music.gain.value = this.settings.music;
    this.sfx.gain.value = this.settings.sfx;
  }

  playLevel(oak: boolean) {
    if (!this.context) return;
    this.setActive(true);
    this.planned = new Set([oak ? 'lantern-oak-theme' : 'fernlight-theme', 'forest-ambience']);
    for (const [id, voice] of this.tracks) {
      if (this.planned.has(id)) continue;
      voice.stop();
      this.tracks.delete(id);
    }
    for (const id of this.planned) {
      const cue = cues.tracks.find((track) => track.id === id);
      if (cue && !this.tracks.has(id)) void this.startTrack(cue);
    }
    for (const cue of cues.tracks) {
      if (!cue.loop) void this.load(cue);
    }
  }

  setActive(active: boolean, retainEffects = false) {
    this.active = active;
    if (!this.context || !this.score) return;
    const now = this.context.currentTime;
    const gain = this.score.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(active ? 1 : 0, now, .055);
    if (!active && !retainEffects) this.stopEffects();
  }

  stopEffects() {
    for (const voice of this.voices) voice.source.stop();
    this.voices.clear();
  }

  onEvents(events: readonly Event[]) {
    for (const event of events) {
      const cue = effects[event];
      if (cue) this.effect(cue);
    }
  }

  effect(id: string) {
    if (!this.context || !this.sfx || this.settings.muted || (!this.active && !ui.has(id))) return;
    const buffer = this.decoded.get(id);
    if (!buffer) return;
    const now = this.context.currentTime;
    if (id === 'land') {
      if (now - this.lastLand < .12) return;
      this.lastLand = now;
    }
    if (id === 'hover') {
      if (now - this.lastHover < .1) return;
      this.lastHover = now;
    }
    if (this.voices.size >= 8) {
      const replace = critical.has(id) && [...this.voices].find((voice) => !voice.critical);
      if (!replace) return;
      replace.source.stop();
      this.voices.delete(replace);
    }
    const source = this.source(buffer, this.sfx, ui.has(id) ? .4 : (critical.has(id) || id === 'firefly') ? .72 : .6);
    const voice = { source, critical: critical.has(id) };
    this.voices.add(voice);
    source.onended = () => this.voices.delete(voice);
    source.start();
  }

  private load(cue: Cue) {
    const existing = this.buffers.get(cue.id);
    if (existing) return existing;
    const pending = this.decode(cue);
    this.buffers.set(cue.id, pending);
    return pending;
  }

  private async decode(cue: Cue) {
    if (!this.context) return;
    const variants = this.preferOgg ? cue.variants : [...cue.variants].reverse();
    for (const file of variants) {
      const url = urls['../assets/runtime/audio/' + file];
      if (!url) continue;
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.decoded.set(cue.id, buffer);
        return buffer;
      } catch {
        // Try the alternate codec when a fetch or decode fails.
      }
    }
  }

  private async startTrack(cue: Cue) {
    const buffer = await this.load(cue);
    if (!buffer || !this.score || !this.planned.has(cue.id) || this.tracks.has(cue.id)) return;
    const source = this.source(buffer, this.score, cue.id === 'forest-ambience' ? .24 : .4);
    const [start = 0, end = buffer.duration * cues.sampleRate] = cue.loopSamples ?? [];
    source.loop = true;
    source.loopStart = start / cues.sampleRate;
    source.loopEnd = Math.min(buffer.duration, end / cues.sampleRate);
    source.start();
    this.tracks.set(cue.id, source);
  }

  private source(buffer: AudioBuffer, output: AudioNode, gain: number) {
    const context = output.context;
    const source = context.createBufferSource();
    const volume = context.createGain();
    volume.gain.value = gain;
    source.buffer = buffer;
    source.connect(volume).connect(output);
    return source;
  }
}
