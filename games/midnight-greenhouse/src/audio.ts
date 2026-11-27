import type { Cue } from './simulation.js';
import type { Settings } from './save.js';

type Bed = 'off' | 'brief' | 'watch' | 'storm';
const path = (name: string) => './audio/' + name + '.ogg';
const priority: Partial<Record<Cue, number>> = { breach: 2, warning: 1, victory: 3, defeat: 3 };

export class Sound {
  private beds = new Map<string, HTMLAudioElement>();
  private voices: { audio: HTMLAudioElement; cue: Cue }[] = [];
  private last = new Map<Cue, number>();
  private unlocked = false;
  private scene: Bed = 'off';
  private paused = false;
  private blendStart = 0;
  private blendFrom = 0;
  private blendTo = 0;
  private blend = 0;

  constructor(private settings: Settings) {}

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.sync();
  }

  setScene(scene: Bed) {
    if (this.scene === scene) return;
    this.scene = scene;
    this.blendStart = performance.now();
    this.blendFrom = this.blend;
    this.blendTo = scene === 'storm' ? 1 : 0;
    this.sync();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.clearVoices();
    this.sync();
  }

  private loop(name: string, gain: number, enabled: boolean) {
    let audio = this.beds.get(name);
    if (!audio && !enabled) return;
    if (!audio) {
      audio = new Audio(path(name));
      audio.loop = true;
      this.beds.set(name, audio);
    }
    audio.volume = gain;
    if (enabled) {
      if (audio.paused && !audio.error) this.play(audio);
    } else if (!audio.paused) audio.pause();
  }

  private play(audio: HTMLAudioElement) {
    void audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')) return;
      console.warn('Greenhouse audio unavailable', audio.getAttribute('src'));
    });
  }

  private gain(bus: 'sfx' | 'music') {
    return this.settings.mute ? 0 : this.settings.master * this.settings[bus];
  }

  sync() {
    if (!this.unlocked) return;
    const music = this.gain('music');
    const active = !this.paused && this.scene !== 'off';
    const t = Math.min(1, (performance.now() - this.blendStart) / 700);
    this.blend = this.blendFrom + (this.blendTo - this.blendFrom) * t;
    this.loop('ambient-rain', music * (this.scene === 'brief' ? 0.21 : 0.37), active);
    const playing = active && this.scene !== 'brief';
    this.loop('music-watch', music * (1 - this.blend) * 0.77, playing && this.blend < 1);
    this.loop('music-storm', music * this.blend * 0.75, playing && (this.blend > 0 || this.scene === 'storm'));
    for (const { audio } of this.voices) audio.volume = this.gain('sfx') * 0.8;
  }

  cue(cue: Cue) {
    if (!this.unlocked || this.paused || this.settings.mute) return;
    const now = performance.now();
    if (now - (this.last.get(cue) ?? -Infinity) < 90) return;
    this.last.set(cue, now);
    const reuse = this.voices.findIndex(({ audio }) => audio.ended || audio.paused);
    const free = reuse >= 0 ? reuse : this.voices.length;
    let index = free;
    if (index >= 8) {
      index = this.voices.findIndex((voice) => (priority[voice.cue] ?? 0) < (priority[cue] ?? 0));
      if (index < 0) return;
    }
    this.voices[index]?.audio.pause();
    const audio = new Audio(path(cue));
    audio.volume = this.gain('sfx') * 0.8;
    this.voices[index] = { audio, cue };
    this.play(audio);
  }

  clearVoices() {
    for (const { audio } of this.voices) audio.pause();
    this.voices = [];
    this.last.clear();
  }
}
