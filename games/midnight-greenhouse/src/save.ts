import { levels } from './content.js';
import type { LevelId } from './content.js';

export type Settings = { master: number; music: number; sfx: number; mute: boolean; reduced: boolean };
type Win = { stars: number; fastest: number };
const prefix = 'midnight-greenhouse.';
const settingsKey = prefix + 'settings.v1';
const legacyKey = prefix + 'progress.v1';
const progressKey = prefix + 'retro.progress.v1';

function read(key: string): unknown {
  const value = localStorage.getItem(key);
  try { return JSON.parse(value ?? 'null'); } catch { return null; }
}
const isObject = (value: unknown): value is { [key: string]: unknown } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const volume = (value: unknown, fallback: number) =>
  typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback;

function parseWin(source: unknown, id: LevelId): Win | undefined {
  if (!isObject(source) || source.version !== 1) return;
  const value = source[id];
  if (!isObject(value)) return;
  const { stars, fastest } = value;
  if (typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 3
    && typeof fastest === 'number' && Number.isFinite(fastest) && fastest > 0) return { stars, fastest };
}

export class Save {
  readonly settings: Settings = { master: 0.7, music: 0.35, sfx: 0.65, mute: false,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  private readonly wins: Partial<Record<LevelId, Win>> = {};
  private readonly oldWins: Partial<Record<LevelId, Win>> = {};
  unavailable = false;

  constructor() {
    try {
      const settings = read(settingsKey);
      if (isObject(settings) && settings.version === 1) {
        for (const id of ['master', 'music', 'sfx'] as const) this.settings[id] = volume(settings[id], this.settings[id]);
        if (typeof settings.mute === 'boolean') this.settings.mute = settings.mute;
        if (typeof settings.reduced === 'boolean') this.settings.reduced = settings.reduced;
      }
      const legacy = read(legacyKey);
      const retro = read(progressKey);
      for (const id of levels) {
        const oldWin = parseWin(legacy, id);
        const newWin = parseWin(retro, id);
        if (!this.unlocked(id)) break;
        if (oldWin && (id === levels[0] || this.oldWins[levels[levels.indexOf(id) - 1]])) this.oldWins[id] = oldWin;
        if (newWin) this.wins[id] = newWin;
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

  legacy(id: LevelId) { return this.oldWins[id]; }

  unlocked(id: LevelId) {
    return levels.slice(0, levels.indexOf(id)).every((prior) => Boolean(this.wins[prior] || this.oldWins[prior]));
  }

  win(id: LevelId, stars: number, time: number) {
    if (!this.unlocked(id)) return;
    this.wins[id] = { stars: Math.max(stars, this.wins[id]?.stars ?? 0),
      fastest: Math.min(time, this.wins[id]?.fastest ?? Infinity) };
    this.write(progressKey, { version: 1, ...this.wins });
  }
}
