import { gear, items, slots, stages, statsFor } from './campaign-content.ts';
import type { Slot, Stats } from './campaign-content.ts';

export const campaignKey = 'ai-game-studio:monster-survivor:campaign:v1';
type CampaignSave = {
  schemaVersion: 1; wallet: number; ranks: Record<string, number>;
  equipment: Partial<Record<Slot, string>>; cleared: string[];
  bestMs: Record<string, number>; settled: string[];
};
export type Attempt = {
  id: string; stageId: string; gold: number; gear: string[]; cleared: boolean; elapsedMs: number;
};
export type Settlement = {
  gold: number; items: string[]; firstClear: boolean; completed: boolean; firstClearDuplicate?: boolean;
};
const fresh = (): CampaignSave => ({ schemaVersion: 1, wallet: gear.startingGold, ranks: {}, equipment: {}, cleared: [], bestMs: {}, settled: [] });
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const attemptLimit = 80;

function decode(raw: string | null): { data: CampaignSave; status: string; readOnly: boolean } {
  if (raw === null) return { data: fresh(), status: '', readOnly: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value)) throw new Error();
    if (whole(value.schemaVersion) && value.schemaVersion > 1) {
      return { data: fresh(), status: 'This Campaign save comes from a newer version. Progress here is session only.', readOnly: true };
    }
    if (value.schemaVersion !== 1 || !whole(value.wallet) || !object(value.ranks) || !object(value.equipment) ||
        !Array.isArray(value.cleared) || !object(value.bestMs) || !Array.isArray(value.settled)) throw new Error();
    const data = fresh();
    data.wallet = value.wallet;
    for (const [id, rank] of Object.entries(value.ranks)) {
      if (!items.has(id) || !whole(rank) || rank > gear.rankCap) throw new Error();
      data.ranks[id] = rank;
    }
    for (const slot of slots) {
      const id = value.equipment[slot];
      if (id === undefined) continue;
      if (typeof id !== 'string' || items.get(id)?.slot !== slot || !Object.hasOwn(data.ranks, id)) throw new Error();
      data.equipment[slot] = id;
    }
    for (const [index, id] of value.cleared.entries()) {
      if (!stages[index] || id !== stages[index].id || !whole(value.bestMs[id])) throw new Error();
      data.cleared.push(id);
      data.bestMs[id] = value.bestMs[id];
    }
    if (!value.settled.every((id: unknown) => typeof id === 'string' && id.length <= 80)) throw new Error();
    data.settled = [...new Set<string>(value.settled)].slice(-attemptLimit);
    return { data, status: '', readOnly: false };
  } catch {
    return { data: fresh(), status: 'The Campaign save could not be read. Starting with beginner gear.', readOnly: false };
  }
}

export class CampaignRecords {
  data = fresh();
  status = '';
  private storage?: Storage;
  private readOnly = false;
  private raw: string | null = null;

  constructor(getStorage: () => Storage) {
    try {
      this.storage = getStorage();
      this.refresh();
    } catch {
      this.sessionOnly();
    }
  }

  refresh() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(campaignKey);
      if (raw === this.raw) return;
      this.raw = raw;
      const decoded = decode(raw);
      this.data = decoded.data;
      this.status = decoded.status;
      this.readOnly = decoded.readOnly;
    } catch {
      this.sessionOnly();
    }
  }

  private sessionOnly() {
    this.storage = undefined;
    this.status = 'Campaign storage is unavailable. Progress is session only.';
  }

  private write(next: CampaignSave) {
    if (this.storage && !this.readOnly) {
      try {
        const raw = JSON.stringify(next);
        this.storage.setItem(campaignKey, raw);
        this.raw = raw;
        this.status = '';
      } catch {
        this.sessionOnly();
      }
    }
    this.data = next;
  }

  unlocked(id: string) {
    const index = stages.findIndex(stage => stage.id === id);
    return index >= 0 && index <= this.data.cleared.length;
  }

  get stats() {
    const totals = statsFor();
    for (const id of Object.values(this.data.equipment)) {
      const stats = statsFor(items.get(id), this.data.ranks[id]);
      for (const key of Object.keys(totals) as (keyof Stats)[]) totals[key] += stats[key];
    }
    const caps = gear.combat.caps;
    totals.flatMainDamage = Math.min(totals.flatMainDamage, caps.weaponFlatDamage);
    totals.moveSpeedPercent = Math.min(totals.moveSpeedPercent, caps.moveSpeedPercent);
    totals.contactReductionPercent = Math.min(totals.contactReductionPercent, caps.damageReductionPercent);
    totals.projectileReductionPercent = Math.min(totals.projectileReductionPercent, caps.damageReductionPercent);
    totals.spellCooldownReductionPercent = Math.min(totals.spellCooldownReductionPercent, caps.cooldownReductionPercent);
    return totals;
  }

  equip(slot: Slot, id?: string) {
    this.refresh();
    if (!slots.includes(slot) || id !== undefined && (items.get(id)?.slot !== slot || !Object.hasOwn(this.data.ranks, id))) return false;
    const next = structuredClone(this.data);
    if (id === undefined) delete next.equipment[slot];
    else next.equipment[slot] = id;
    this.write(next);
    return true;
  }

  upgrade(id: string, expectedRank: number) {
    this.refresh();
    const rank = this.data.ranks[id];
    const cost = gear.upgradeCostByTargetRank[(rank + 1) as 1 | 2 | 3];
    if (!items.has(id) || rank !== expectedRank || !cost || this.data.wallet < cost) return false;
    const next = structuredClone(this.data);
    next.ranks[id]++;
    next.wallet -= cost;
    this.write(next);
    return true;
  }

  settle(attempt: Attempt): Settlement | undefined {
    this.refresh();
    const stage = stages.find(stage => stage.id === attempt.stageId);
    if (!stage || !this.unlocked(stage.id) || this.data.settled.includes(attempt.id)) return;
    const next = structuredClone(this.data);
    const clearedBefore = next.cleared.includes(stage.id);
    const firstClear = attempt.cleared && !clearedBefore;
    const earned: Settlement = { gold: attempt.gold, items: [], firstClear, completed: firstClear && stage.order === stages.length };
    const award = (id: string) => {
      const item = items.get(id);
      if (!item) return;
      if (Object.hasOwn(next.ranks, id)) earned.gold += gear.duplicatesGoldByRarity[item.rarity];
      else {
        next.ranks[id] = 0;
        earned.items.push(id);
      }
    };
    for (const id of attempt.gear) award(id);
    if (firstClear) {
      if (Object.hasOwn(next.ranks, stage.firstClearGear)) earned.firstClearDuplicate = true;
      award(stage.firstClearGear);
      next.cleared.push(stage.id);
      earned.gold += stage.goldClear;
    }
    if (attempt.cleared) next.bestMs[stage.id] = Math.min(next.bestMs[stage.id] ?? Infinity, attempt.elapsedMs);
    next.wallet = Math.min(Number.MAX_SAFE_INTEGER, next.wallet + earned.gold);
    next.settled = [...next.settled, attempt.id].slice(-attemptLimit);
    this.write(next);
    return earned;
  }
}
