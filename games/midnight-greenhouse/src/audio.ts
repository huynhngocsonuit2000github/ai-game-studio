import type { Cue } from './simulation.js';
import type { Settings } from './save.js';

type Bed = 'off' | 'brief' | 'watch' | 'storm';
type Track = 'ambient-rain' | 'music-watch' | 'music-storm';
type Voice = { source: AudioBufferSourceNode; cue: Cue };
type Loop = { source: AudioBufferSourceNode; gain: GainNode };

const priority: Partial<Record<Cue, number>> = { breach: 2, warning: 1, victory: 3, defeat: 3 };
const tracks: Track[] = ['ambient-rain', 'music-watch', 'music-storm'];

export class Sound {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private pendingLoops = new Set<Track>();
  private loops = new Map<Track, Loop>();
  private voices = new Set<Voice>();
  private last = new Map<Cue, number>();
  private scene: Bed = 'off';
  private paused = false;
  private voiceGeneration = 0;
  private blendStart = 0;
  private blendFrom = 0;
  private blendTo = 0;
  private blend = 0;

  constructor(private settings: Settings) {}

  unlock() {
    if (this.context) return;
    try {
      const context = this.context = new AudioContext();
      this.master = context.createGain();
      this.music = context.createGain();
      this.sfx = context.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(context.destination);
      if (!this.paused) void context.resume().catch(() => {});
      this.sync();
    } catch {
      console.warn('Greenhouse Web Audio unavailable');
    }
  }

  setScene(scene: Bed) {
    if (this.scene === scene) return;
    const resting = this.scene === 'off' || this.scene === 'brief';
    this.scene = scene;
    this.blendStart = performance.now();
    this.blendFrom = resting ? 0 : this.blend;
    this.blendTo = scene === 'storm' ? 1 : 0;
    for (const [name, loop] of this.loops) {
      if (this.wantsLoop(name)) continue;
      loop.source.stop();
      this.loops.delete(name);
    }
    this.sync();
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      this.clearVoices();
      void this.context?.suspend().catch(() => {});
    } else {
      void this.context?.resume().catch(() => {});
      this.sync();
    }
  }

  private load(name: string, context: AudioContext) {
    let buffer = this.buffers.get(name);
    if (!buffer) {
      buffer = fetch('./audio/' + name + '.ogg').then(async (response) => {
        if (!response.ok) throw new Error('Audio request: ' + response.status);
        return context.decodeAudioData(await response.arrayBuffer());
      }).catch(() => {
        console.warn('Greenhouse audio unavailable:', name);
        return null;
      });
      this.buffers.set(name, buffer);
    }
    return buffer;
  }

  private wantsLoop(name: Track) {
    return this.scene !== 'off' && (name === 'ambient-rain' || this.scene !== 'brief');
  }

  private loopGain(name: Track) {
    if (name === 'ambient-rain') return this.scene === 'brief' ? 0.21 : 0.37;
    return name === 'music-watch' ? (1 - this.blend) * 0.77 : this.blend * 0.75;
  }

  private async startLoop(name: Track, context: AudioContext, bus: GainNode) {
    this.pendingLoops.add(name);
    const buffer = await this.load(name, context);
    if (!buffer) return;
    this.pendingLoops.delete(name);
    if (this.paused || !this.wantsLoop(name)) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = this.loopGain(name);
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(bus);
    source.addEventListener('ended', () => gain.disconnect(), { once: true });
    this.loops.set(name, { source, gain });
    source.start();
  }

  sync() {
    const { context, master, music, sfx } = this;
    if (!context || !master || !music || !sfx) return;
    master.gain.value = this.settings.mute ? 0 : this.settings.master;
    music.gain.value = this.settings.music;
    sfx.gain.value = this.settings.sfx * 0.8;
    if (this.paused) return;
    const t = Math.min(1, (performance.now() - this.blendStart) / 700);
    this.blend = this.blendFrom + (this.blendTo - this.blendFrom) * t;
    for (const name of tracks) {
      if (!this.wantsLoop(name)) continue;
      const loop = this.loops.get(name);
      if (loop) loop.gain.gain.value = this.loopGain(name);
      else if (!this.pendingLoops.has(name)) void this.startLoop(name, context, music);
    }
  }

  async cue(cue: Cue) {
    const { context, sfx } = this;
    if (!context || !sfx || this.paused || this.settings.mute) return;
    const now = performance.now();
    if (now - (this.last.get(cue) ?? -Infinity) < 90) return;
    this.last.set(cue, now);
    const generation = this.voiceGeneration;
    const buffer = await this.load(cue, context);
    if (!buffer || generation !== this.voiceGeneration || this.paused || this.settings.mute) return;
    if (this.voices.size >= 8) {
      const interrupted = [...this.voices].find((voice) => (priority[voice.cue] ?? 0) < (priority[cue] ?? 0));
      if (!interrupted) return;
      interrupted.source.stop();
      this.voices.delete(interrupted);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(sfx);
    const voice = { source, cue };
    this.voices.add(voice);
    source.addEventListener('ended', () => {
      this.voices.delete(voice);
      source.disconnect();
    }, { once: true });
    source.start();
  }

  clearVoices() {
    this.voiceGeneration++;
    for (const voice of this.voices) voice.source.stop();
    this.voices.clear();
    this.last.clear();
  }
}
