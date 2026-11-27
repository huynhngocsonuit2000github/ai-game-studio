import { newEntry } from './mine.js';
import type { Entry } from './mine.js';

const SAVE_KEY = 'studio.mo-vang-nao-loan.save';
const SETTINGS_KEY = 'studio.mo-vang-nao-loan.settings';
export type Save = { version: 1; location: 'entry' | 'shop'; entry: Entry };

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as unknown;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The current session remains playable without browser storage.
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function restore(): Save {
  const stored = read(SAVE_KEY);
  const fallback = { version: 1, location: 'entry', entry: newEntry() } as const;
  if (!record(stored) || stored.version !== 1 || (stored.location !== 'entry' && stored.location !== 'shop')) return fallback;
  const entry = stored.entry;
  if (!record(entry) || !count(entry.wallet) || !count(entry.seed) || entry.seed > 0xffffffff ||
      typeof entry.practice !== 'boolean' || !record(entry.inventory) || !record(entry.armed)) return fallback;
  const { potion, magnet, scissors } = entry.inventory;
  if (!count(potion) || !count(magnet) || !count(scissors) ||
      typeof entry.armed.potion !== 'boolean' || typeof entry.armed.magnet !== 'boolean') return fallback;
  return {
    version: 1,
    location: stored.location,
    entry: {
      wallet: entry.wallet,
      seed: entry.seed,
      practice: entry.practice,
      inventory: { potion, magnet, scissors },
      armed: { potion: entry.armed.potion && potion > 0, magnet: entry.armed.magnet && magnet > 0 },
    },
  };
}

export function save(state: Save) {
  write(SAVE_KEY, state);
}

export function loadSettings() {
  const stored = read(SETTINGS_KEY);
  return {
    mute: record(stored) && stored.mute === true,
    reduced: record(stored) && typeof stored.reduced === 'boolean'
      ? stored.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

export function saveSettings(settings: ReturnType<typeof loadSettings>) {
  write(SETTINGS_KEY, settings);
}
