import { items, campaignStages as stages } from './campaign-content.ts';
import type { CampaignRecords } from './campaign-save.ts';

export const kinKey = 'ai-game-studio:monster-survivor:lantern-kin:v1';
export const tiers = ['normal', 'elite', 'nightmare'] as const;
export type Tier = typeof tiers[number];
export const tierRules = {
  normal: { hp: 1, leaderHp: 1, damage: 1, extraSeconds: 0 },
  elite: { hp: 1.25, leaderHp: 1.15, damage: 1.10, extraSeconds: 120 },
  nightmare: { hp: 1.50, leaderHp: 1.25, damage: 1.20, extraSeconds: 240 },
};
export const pets = ['ember-fox', 'moon-owl', 'moss-turtle'] as const;
export type Pet = typeof pets[number];
export const engravings = {
  'cinder-chain': 'ember-lantern', 'searing-brand': 'ember-lantern',
  ricochet: 'prism-lantern', refraction: 'prism-lantern',
  aftertoll: 'warden-lantern', 'shelter-bell': 'warden-lantern',
} as const;
export type Engraving = keyof typeof engravings;
export type KinLoadout = { pet?: Pet; bond?: number; engraving?: Engraving };
type KinSave = {
  schemaVersion: 1; treats: number; shards: number; best: Record<string, number>;
  bonds: Partial<Record<Pet, number>>; pet?: Pet; learned: Engraving[];
  engraved: Partial<Record<typeof engravings[Engraving], Engraving>>; attempts: string[];
};
export type KinReward = { first: boolean; treats: number; shards: number; pet?: Pet; completed: boolean };
const fresh = (): KinSave => ({ schemaVersion: 1, treats: 0, shards: 0, best: {}, bonds: {}, learned: [], engraved: {}, attempts: [] });
const whole = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const dictionary = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const petId = (id: unknown): id is Pet => pets.some(pet => pet === id);
const engravingId = (id: unknown): id is Engraving => typeof id === 'string' && Object.hasOwn(engravings, id);
const recordId = (stage: string, tier: Tier) => stage + ':' + tier;

export class KinRecords {
  data = fresh();
  status = '';
  private storage?: Storage;
  private readOnly = false;
  private raw: string | null = null;

  constructor(storage: () => Storage) {
    try { this.storage = storage(); this.refresh(); }
    catch { this.sessionOnly(); }
  }

  private sessionOnly() {
    this.storage = undefined;
    this.status = 'Lantern Kin storage is unavailable. Progress is session only.';
  }

  refresh() {
    if (!this.storage) return;
    let raw: string | null;
    try { raw = this.storage.getItem(kinKey); }
    catch { this.sessionOnly(); return; }
    if (raw === this.raw) return;
    this.raw = raw;
    this.status = '';
    this.data = fresh();
    this.readOnly = raw !== null;
    if (raw === null) return;
    try {
      const value: unknown = JSON.parse(raw);
      if (!dictionary(value)) throw new Error();
      if (whole(value.schemaVersion) && value.schemaVersion > 1) {
        this.status = 'This Lantern Kin save comes from a newer version. Progress here is session only.';
        return;
      }
      if (value.schemaVersion !== 1 || !whole(value.treats) || !whole(value.shards) ||
          !dictionary(value.best) || !dictionary(value.bonds) || !dictionary(value.engraved) ||
          !Array.isArray(value.learned) || !value.learned.every(engravingId) ||
          !Array.isArray(value.attempts) || !value.attempts.every(id => typeof id === 'string' && id.length > 0 && id.length <= 80)) throw new Error();
      const next = fresh();
      next.treats = value.treats;
      next.shards = value.shards;
      next.attempts = [...new Set<string>(value.attempts)];
      next.learned = [...new Set<Engraving>(value.learned)];
      for (const [key, time] of Object.entries(value.best)) {
        if (!stages.some(stage => tiers.some(tier => recordId(stage.id, tier) === key)) || !whole(time)) throw new Error();
        next.best[key] = time;
      }
      for (const [id, bond] of Object.entries(value.bonds)) {
        if (!petId(id) || !whole(bond) || bond < 1 || bond > 3) throw new Error();
        next.bonds[id] = bond;
      }
      if (value.pet !== undefined) {
        if (!petId(value.pet) || !next.bonds[value.pet]) throw new Error();
        next.pet = value.pet;
      }
      for (const [weapon, id] of Object.entries(value.engraved)) {
        if (!engravingId(id) || engravings[id] !== weapon || !next.learned.includes(id)) throw new Error();
        next.engraved[engravings[id]] = id;
      }
      this.data = next;
      this.readOnly = false;
    } catch { this.status = 'The Lantern Kin save could not be read. Progress here is session only.'; }
  }

  private write(next: KinSave) {
    if (this.storage && !this.readOnly) {
      try {
        const raw = JSON.stringify(next);
        this.storage.setItem(kinKey, raw);
        this.raw = raw;
        this.status = '';
      } catch { this.sessionOnly(); }
    }
    this.data = next;
  }

  best(stage: string, tier: Tier, campaign: CampaignRecords) {
    return this.data.best[recordId(stage, tier)] ?? (tier === 'normal' ? campaign.data.bestMs[stage] : undefined);
  }

  unlocked(stage: string, tier: Tier, campaign: CampaignRecords): boolean {
    const index = stages.findIndex(entry => entry.id === stage);
    if (index < 0) return false;
    const previousTier = tiers[tiers.indexOf(tier) - 1];
    if (previousTier) return this.best(stage, previousTier, campaign) !== undefined;
    if (index < 5) return campaign.unlocked(stage);
    return this.best(stages[index - 1].id, 'normal', campaign) !== undefined;
  }

  loadout(campaign: CampaignRecords): KinLoadout {
    const pet = this.data.pet;
    const weapon = campaign.data.equipment.weapon;
    const engraving = Object.values(this.data.engraved).find(id => engravings[id] === weapon && campaign.data.ranks[weapon] === 3);
    return { pet, bond: pet && this.data.bonds[pet], engraving };
  }

  adoptFox(campaign: CampaignRecords) {
    this.refresh();
    campaign.refresh();
    if (!campaign.data.cleared.includes(stages[0].id) || this.data.bonds['ember-fox']) return false;
    this.write({ ...this.data, bonds: { ...this.data.bonds, 'ember-fox': 1 } });
    return true;
  }

  equipPet(pet?: Pet) {
    this.refresh();
    if (pet !== undefined && !this.data.bonds[pet]) return false;
    this.write({ ...this.data, pet });
    return true;
  }

  feed(pet: Pet, expected: number) {
    this.refresh();
    const current = this.data.bonds[pet];
    const cost = current === 1 ? 3 : current === 2 ? 6 : 0;
    if (!current || current !== expected || !cost || this.data.treats < cost) return false;
    this.write({ ...this.data, treats: this.data.treats - cost, bonds: { ...this.data.bonds, [pet]: current + 1 } });
    return true;
  }

  engrave(campaign: CampaignRecords, id?: Engraving) {
    this.refresh();
    campaign.refresh();
    const weapon = campaign.data.equipment.weapon;
    if (!weapon || !items.has(weapon) || campaign.data.ranks[weapon] !== 3) return false;
    if (id && engravings[id] !== weapon) return false;
    const next = structuredClone(this.data);
    if (!id) {
      for (const engraving of Object.values(next.engraved)) if (engravings[engraving] === weapon) delete next.engraved[engravings[engraving]];
    } else {
      if (!next.learned.includes(id)) {
        if (next.shards < 3) return false;
        next.shards -= 3;
        next.learned.push(id);
      }
      next.engraved[engravings[id]] = id;
    }
    this.write(next);
    return true;
  }

  settle(campaign: CampaignRecords, attempt: {
    id: string; stage: string; tier: Tier; elapsedMs: number; exited: boolean; treats: number; rescued: boolean;
  }): KinReward | undefined {
    this.refresh();
    campaign.refresh();
    const { id, stage, tier, elapsedMs, exited } = attempt;
    const order = stages.find(entry => entry.id === stage)?.order ?? 0;
    if (!exited || !order || !this.unlocked(stage, tier, campaign) || tier === 'normal' && order <= 5 ||
        !id.length || id.length > 80 || !whole(elapsedMs) || this.data.attempts.includes(id)) return;
    const key = recordId(stage, tier);
    const first = this.data.best[key] === undefined;
    const reward: KinReward = {
      first, treats: Math.max(0, Math.min(2, Math.floor(attempt.treats) || 0)),
      shards: tier === 'nightmare' ? first ? 4 : 1 : tier === 'elite' && first ? 3 : 0,
      completed: first && order === 8 && tier === 'normal',
    };
    if (first && tier === 'normal') reward.treats += order - 3;
    if (first && tier === 'elite') reward.treats += 2;
    if (first && tier === 'normal' && order === 6) reward.pet = 'moon-owl';
    if (order === 7 && attempt.rescued && !this.data.bonds['moss-turtle']) reward.pet = 'moss-turtle';
    const next = structuredClone(this.data);
    if (reward.pet) next.bonds[reward.pet] = 1;
    next.best[key] = Math.min(next.best[key] ?? Infinity, elapsedMs);
    next.treats = Math.min(Number.MAX_SAFE_INTEGER, next.treats + reward.treats);
    next.shards = Math.min(Number.MAX_SAFE_INTEGER, next.shards + reward.shards);
    next.attempts.push(id);
    this.write(next);
    return reward;
  }
}

export async function writeRecord<T>(key: string, write: () => T): Promise<T> {
  if (!navigator.locks) return write();
  let acquired = false;
  try {
    return await navigator.locks.request(key, () => {
      acquired = true;
      return write();
    });
  } catch (error) {
    if (acquired) throw error;
    return write();
  }
}
