import { levels } from './content.js';
import type { LevelId } from './content.js';

export type Settings = { master: number; music: number; sfx: number; mute: boolean; reduced: boolean };
type Win = { stars: number; fastest: number };
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
  private readonly wins: Partial<Record<LevelId, Win>> = {};
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
      if (isObject(progress) && progress.version === 1) {
        for (const id of levels) {
          const value = progress[id];
          if (!isObject(value)) break;
          const { stars, fastest } = value;
          if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 3
            || typeof fastest !== 'number' || !Number.isFinite(fastest) || fastest <= 0) break;
          this.wins[id] = { stars, fastest };
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

  record(id: LevelId) { return this.wins[id]; }

  unlocked(id: LevelId) {
    return levels.slice(0, levels.indexOf(id)).every((prior) => Boolean(this.wins[prior]));
  }

  win(id: LevelId, stars: number, time: number) {
    if (!this.unlocked(id)) return;
    this.wins[id] = { stars: Math.max(stars, this.wins[id]?.stars ?? 0),
      fastest: Math.min(time, this.wins[id]?.fastest ?? Infinity) };
    this.write(progressKey, { version: 1, ...this.wins });
  }
}
