import { skills } from './content.ts';
import type { GardenRun } from './slice.ts';

export const saveKey = 'ai-game-studio:monster-survivor:v1';
export const defaultSettings = {
  master: .8, music: .55, sfx: .72, mute: false, reducedMotion: false, highContrast: false, damageNumbers: true,
};
type Settings = typeof defaultSettings;
const base = () => ({
  schemaVersion: 1,
  settings: { ...defaultSettings },
  lifetime: { runs: 0, wins: 0, bestClearMs: null as number | null, longestMs: 0, recordKills: 0 },
  discoveredSkillIds: ['wick-dart'],
  cosmetics: { unlocked: [] as string[], selected: '' },
  runIds: [] as string[],
});
type Save = ReturnType<typeof base>;

const object = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null
  ? value as Record<string, unknown> : {};
const counter = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) ? Math.max(0, value) : 0;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(x => typeof x === 'string') : [];
const volume = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(1, value)) : fallback;
const flag = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;

export class Records {
  data = base();
  status = '';
  private readOnly = false;

  private storage: () => Pick<Storage, 'getItem' | 'setItem'>;

  constructor(storage: () => Pick<Storage, 'getItem' | 'setItem'>) {
    this.storage = storage;
    this.data = this.read();
  }

  private read() {
    const save = base();
    try {
      const raw = this.storage().getItem(saveKey);
      if (!raw) return save;
      const stored = object(JSON.parse(raw));
      if (typeof stored.schemaVersion === 'number' && stored.schemaVersion > 1) {
        this.readOnly = true;
        this.status = 'This save comes from a newer version. Changes last for this session.';
        return save;
      }
      if (stored.schemaVersion !== 1) throw new Error('Unknown save schema');
      const settings = object(stored.settings);
      const stats = object(stored.lifetime);
      const cosmetics = object(stored.cosmetics);
      save.settings = {
        master: volume(settings.master, defaultSettings.master), music: volume(settings.music, defaultSettings.music),
        sfx: volume(settings.sfx, defaultSettings.sfx), mute: flag(settings.mute, false),
        reducedMotion: flag(settings.reducedMotion, false), highContrast: flag(settings.highContrast, false),
        damageNumbers: flag(settings.damageNumbers, true),
      };
      save.lifetime = {
        runs: counter(stats.runs), wins: counter(stats.wins), bestClearMs: counter(stats.bestClearMs) || null,
        longestMs: counter(stats.longestMs), recordKills: counter(stats.recordKills),
      };
      save.runIds = strings(stored.runIds).slice(-20);
      save.discoveredSkillIds = ['wick-dart', ...new Set(strings(stored.discoveredSkillIds).filter(id => id !== 'wick-dart' && skills.has(id)))];
      save.cosmetics.unlocked = strings(cosmetics.unlocked).filter(id => id === 'dawn-scarf');
      if (cosmetics.selected === 'dawn-scarf' && save.cosmetics.unlocked.includes('dawn-scarf')) save.cosmetics.selected = 'dawn-scarf';
    } catch {
      this.status = 'Local data could not be read. This session starts with defaults.';
    }
    return save;
  }

  private write(save: Save) {
    this.data = save;
    if (this.readOnly) return;
    try {
      this.storage().setItem(saveKey, JSON.stringify(save));
    } catch {
      this.status = 'Local storage is unavailable. Changes last for this session.';
    }
  }

  update(settings: Settings) {
    const save = this.status || this.readOnly ? this.data : this.read();
    this.write({ ...save, settings });
  }

  selectScarf(selected: '' | 'dawn-scarf') {
    const save = this.status || this.readOnly ? this.data : this.read();
    if (selected && !save.cosmetics.unlocked.includes(selected)) return;
    this.write({ ...save, cosmetics: { ...save.cosmetics, selected } });
  }

  finalize(run: GardenRun, id: string) {
    if (!run.result || this.data.runIds.includes(id)) return;
    const save = this.status || this.readOnly ? this.data : this.read();
    if (save.runIds.includes(id)) return;
    const ms = Math.round(run.elapsed * 1000);
    save.lifetime.runs++;
    save.lifetime.longestMs = Math.max(save.lifetime.longestMs, ms);
    save.lifetime.recordKills = Math.max(save.lifetime.recordKills, run.kills);
    if (run.result === 'victory') {
      save.lifetime.wins++;
      save.lifetime.bestClearMs = Math.min(save.lifetime.bestClearMs ?? Infinity, ms);
      if (!save.cosmetics.unlocked.includes('dawn-scarf')) save.cosmetics.unlocked.push('dawn-scarf');
    }
    save.discoveredSkillIds = [...new Set([...save.discoveredSkillIds, ...run.build.keys()])];
    save.runIds = [...save.runIds, id].slice(-20);
    this.write(save);
  }
}
