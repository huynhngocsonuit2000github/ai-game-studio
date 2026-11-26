import type { Result } from './session.ts';

export const SAVE_KEY = 'forest-adventure:save:v1';
export const EXPANSION_SAVE_KEY = 'forest-adventure:exp-10-trails:preview:v1';

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  reducedMotion: boolean;
}

interface Best {
  ticks: number;
  fireflies: number;
}

interface Save {
  schemaVersion: 1;
  unlockedLevelIds: string[];
  bestByLevel: Partial<Record<string, Best>>;
  settings: Settings;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function volume(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function parseSave(raw: unknown, ids: readonly string[], reducedMotion: boolean): Save {
  const known = object(raw);
  const data = known.schemaVersion === 1 ? known : {};
  const unlocked = Array.isArray(data.unlockedLevelIds) ? data.unlockedLevelIds : [];
  const unlockedLevelIds = ids.slice(0, 1);
  for (const id of ids.slice(1)) {
    if (!unlocked.includes(id)) break;
    unlockedLevelIds.push(id);
  }
  const bestByLevel: Save['bestByLevel'] = {};
  const records = object(data.bestByLevel);
  for (const id of unlockedLevelIds) {
    const { ticks, fireflies } = object(records[id]);
    if (validCount(ticks) && ticks > 0 && validCount(fireflies) && fireflies <= 8) bestByLevel[id] = { ticks, fireflies };
  }
  const settings = object(data.settings);
  return {
    schemaVersion: 1, unlockedLevelIds, bestByLevel,
    settings: {
      master: volume(settings.master, .7),
      music: volume(settings.music, .75),
      sfx: volume(settings.sfx, .85),
      muted: settings.muted === true,
      reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : reducedMotion,
    },
  };
}

function decode(raw: string | null): unknown {
  try {
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export class SaveStore {
  readonly data: Save;
  private readonly storage: Storage | undefined;
  private readonly key: string;
  unavailable = false;

  constructor(
    ids: readonly string[],
    reducedMotion: boolean,
    getStorage = () => window.localStorage,
    legacyIds?: readonly string[],
  ) {
    this.key = legacyIds ? EXPANSION_SAVE_KEY : SAVE_KEY;
    let parsed: unknown;
    let legacy: unknown;
    try {
      this.storage = getStorage();
      parsed = decode(this.storage.getItem(this.key));
      if (legacyIds && object(parsed).schemaVersion !== 1) {
        legacy = decode(this.storage.getItem(SAVE_KEY));
      }
    } catch {
      this.unavailable = true;
    }

    if (legacyIds && object(parsed).schemaVersion !== 1) {
      this.data = parseSave(legacy, legacyIds, reducedMotion);
      const lastClassic = legacyIds.at(-1);
      const firstNew = ids[legacyIds.length];
      if (lastClassic && firstNew && this.data.bestByLevel[lastClassic]) {
        this.data.unlockedLevelIds.push(firstNew);
      }
      if (object(legacy).schemaVersion === 1) this.persist();
    } else {
      this.data = parseSave(parsed, ids, reducedMotion);
    }
  }

  record(id: string, result: Result, nextId?: string) {
    const previous = this.data.bestByLevel[id];
    this.data.bestByLevel[id] = {
      ticks: Math.min(result.ticks, previous?.ticks ?? Infinity),
      fireflies: Math.max(result.fireflies, previous?.fireflies ?? 0),
    };
    if (nextId && !this.data.unlockedLevelIds.includes(nextId)) this.data.unlockedLevelIds.push(nextId);
    this.persist();
  }

  persist() {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.data));
    } catch {
      this.unavailable = true;
    }
  }
}
