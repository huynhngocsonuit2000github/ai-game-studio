export type Settings = { master: number; music: number; sfx: number; mute: boolean; reduced: boolean };
type Record = { stars: number; fastest: number };
const prefix = 'midnight-greenhouse.';
const settingsKey = prefix + 'settings.v1';
const progressKey = prefix + 'progress.v1';

function read(key: string): unknown {
  const value = localStorage.getItem(key);
  try { return JSON.parse(value ?? 'null'); } catch { return null; }
}
const isObject = (value: unknown): value is { [key: string]: unknown } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const volume = (value: unknown, fallback: number) =>
  typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback;

export class Save {
  readonly settings: Settings = { master: 0.7, music: 0.35, sfx: 0.65, mute: false,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  record: Record | null = null;
  unavailable = false;

  constructor() {
    try {
      const settings = read(settingsKey);
      if (isObject(settings) && settings.version === 1) {
        for (const id of ['master', 'music', 'sfx'] as const) this.settings[id] = volume(settings[id], this.settings[id]);
        if (typeof settings.mute === 'boolean') this.settings.mute = settings.mute;
        if (typeof settings.reduced === 'boolean') this.settings.reduced = settings.reduced;
      }
      const progress = read(progressKey);
      if (isObject(progress) && progress.version === 1 && isObject(progress.raincourt)) {
        const { stars, fastest } = progress.raincourt;
        if (typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 3
          && typeof fastest === 'number' && Number.isFinite(fastest) && fastest > 0) {
          this.record = { stars, fastest };
        }
      }
    } catch {
      this.unavailable = true;
    }
  }

  private write(key: string, data: object) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      this.unavailable = true;
    }
  }

  storeSettings() {
    this.write(settingsKey, { version: 1, ...this.settings });
  }

  win(stars: number, time: number) {
    this.record = { stars: Math.max(stars, this.record?.stars ?? 0),
      fastest: Math.min(time, this.record?.fastest ?? Infinity) };
    this.write(progressKey, { version: 1, raincourt: this.record });
  }
}
