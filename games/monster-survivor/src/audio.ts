import manifest from '../assets/runtime/audio/audio.json';
import type { defaultSettings } from './save.ts';

const urls = import.meta.glob<string>('../assets/runtime/audio/*.wav', {
  eager: true, query: '?url&no-inline', import: 'default',
});
type Track = keyof typeof manifest.music;
type Sfx = keyof typeof manifest.sfx;
type Voice = { source: AudioBufferSourceNode; gain: GainNode; priority: boolean };

const critical = new Set(['ward', 'telegraph', 'level', 'boss-arrival', 'hurt', 'shield', 'win', 'lose', 'elite']);

export class Sound {
  private ctx?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private decoded = new Map<string, Promise<AudioBuffer | undefined>>();
  private voices = new Set<Voice>();
  private tracks = new Set<Voice>();
  private lead?: Voice;
  private last = new Map<string, number>();
  private desired: Track | null = null;
  private transition = 0;
  private duck = 1;
  private config: typeof defaultSettings;
  private suspended = false;

  constructor(settings: typeof defaultSettings) {
    this.config = settings;
  }

  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.music = this.ctx.createGain();
        this.sfx = this.ctx.createGain();
        this.sfx.connect(this.master);
        this.music.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.apply(this.config, this.duck);
        const track = this.desired;
        this.desired = null;
        this.theme(track);
      }
      if (!this.suspended) void this.ctx.resume().catch(() => {});
    } catch {
      // Audio is optional. All warnings also have a visible cue.
    }
  }

  apply(settings: typeof defaultSettings, duck = this.duck) {
    this.config = settings;
    this.duck = duck;
    if (!this.ctx || !this.master || !this.music || !this.sfx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.mute ? 0 : settings.master, now, .035);
    this.music.gain.setTargetAtTime(settings.music * duck, now, .07);
    this.sfx.gain.setTargetAtTime(settings.sfx, now, .035);
  }

  suspend(active: boolean) {
    if (this.suspended === active) return;
    this.suspended = active;
    if (!this.ctx) return;
    if (active) void this.ctx.suspend().catch(() => {});
    else void this.ctx.resume().catch(() => {});
  }

  private buffer(file: string) {
    const current = this.decoded.get(file);
    if (current) return current;
    const url = urls['../assets/runtime/audio/' + file];
    const promise = fetch(url).then(response => {
      if (!response.ok) throw new Error('Audio asset unavailable');
      return response.arrayBuffer();
    }).then(bytes => this.ctx!.decodeAudioData(bytes)).catch(() => undefined);
    this.decoded.set(file, promise);
    return promise;
  }

  private voice(buffer: AudioBuffer, bus: GainNode, pool: Set<Voice>, priority: boolean) {
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx!.createGain();
    source.connect(gain);
    gain.connect(bus);
    const voice = { source, gain, priority };
    pool.add(voice);
    source.onended = () => {
      pool.delete(voice);
      source.disconnect();
      gain.disconnect();
    };
    return voice;
  }

  private fade(voice: Voice, seconds: number) {
    const now = this.ctx!.currentTime;
    voice.gain.gain.cancelAndHoldAtTime(now);
    voice.gain.gain.linearRampToValueAtTime(0, now + seconds);
    voice.source.stop(now + seconds);
  }

  theme(track: Track | null) {
    if (this.desired === track) return;
    this.desired = track;
    if (!this.ctx) return;
    const token = ++this.transition;
    if (!track) {
      if (this.lead) this.fade(this.lead, .3);
      this.lead = undefined;
      return;
    }
    const item = manifest.music[track];
    void this.buffer(item.file).then(buffer => {
      if (!buffer || token !== this.transition) return;
      const seconds = track === 'warden-toll' ? .75 : .45;
      const now = this.ctx!.currentTime;
      for (const voice of this.tracks) {
        if (voice !== this.lead) {
          voice.source.stop(now);
          this.tracks.delete(voice);
        }
      }
      if (this.lead) this.fade(this.lead, seconds);
      const voice = this.voice(buffer, this.music!, this.tracks, true);
      this.lead = voice;
      voice.source.loop = true;
      voice.source.loopStart = item.loopStartFrame / manifest.sampleRate;
      voice.source.loopEnd = item.loopEndFrame / manifest.sampleRate;
      voice.gain.gain.setValueAtTime(0, now);
      voice.gain.gain.linearRampToValueAtTime(.80, now + seconds);
      voice.source.start(now);
    });
  }

  play(id: string) {
    const key = id as Sfx;
    if (!this.ctx || this.suspended || this.config.mute || !Object.hasOwn(manifest.sfx, key)) return;
    const now = performance.now();
    if (now - (this.last.get(key) ?? -Infinity) < (key === 'xp' ? 110 : 65)) return;
    this.last.set(key, now);
    const priority = critical.has(id);
    void this.buffer(manifest.sfx[key]).then(buffer => {
      if (!buffer || this.suspended || this.config.mute || performance.now() - now > 320) return;
      if (this.voices.size >= 12) {
        const expendable = priority && [...this.voices].find(voice => !voice.priority);
        if (!expendable) return;
        this.voices.delete(expendable);
        expendable.source.stop();
      }
      const voice = this.voice(buffer, this.sfx!, this.voices, priority);
      voice.gain.gain.value = priority ? .46 : .23;
      voice.source.start();
    });
  }

  clearEffects() {
    for (const voice of this.voices) voice.source.stop();
    this.voices.clear();
    this.last.clear();
  }
}
