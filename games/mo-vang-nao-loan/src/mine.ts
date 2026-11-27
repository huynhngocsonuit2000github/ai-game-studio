export const WIDTH = 840;
export const HEIGHT = 570;
export const PIVOT = { x: 420, y: 108 };
export const STEP = 1 / 120;
export const SHOP = [
  { id: 'potion', name: 'Thuốc tăng lực', price: 140, detail: 'Kéo vật nặng nhanh gấp 1,8 lần trong 12 giây.' },
  { id: 'scissors', name: 'Kéo cắt dây', price: 60, detail: 'Bỏ vật đang kéo để thả móc lại ngay. Dùng một lần.' },
  { id: 'magnet', name: 'Nam châm', price: 90, detail: 'Móc quét chậm còn 55% trong 8 giây, giữ nguyên tầm với.' },
] as const;

export type Supply = typeof SHOP[number]['id'];
export type ItemKind = 'small' | 'medium' | 'large' | 'rock' | 'chest';
export type ChestRoll = 'cash' | 'supply' | 'rock';
export type Inventory = Record<Supply, number>;
export type Armed = Record<'potion' | 'magnet', boolean>;
export type Entry = {
  wallet: number;
  inventory: Inventory;
  armed: Armed;
  seed: number;
  practice: boolean;
};
export type Treasure = { id: string; kind: ItemKind; x: number; y: number; radius: number };
export type Scenario = { duration: number; earnings: number; seed: number; treasure: Treasure[] };
type Phase = 'aim' | 'out' | 'reel';
export type MineEvent = {
  action: 'cast' | 'latch' | 'bank' | 'empty' | 'cut' | 'result';
  time: number;
  target?: string;
  value?: number;
  roll?: ChestRoll;
  passed?: boolean;
};

const mineTreasure: Treasure[] = [
  { id: 'gold-1', kind: 'small', x: 420, y: 218, radius: 19 },
  { id: 'gold-2', kind: 'small', x: 464, y: 250, radius: 17 },
  { id: 'gold-3', kind: 'small', x: 262, y: 253, radius: 19 },
  { id: 'gold-4', kind: 'small', x: 223, y: 242, radius: 18 },
  { id: 'gold-5', kind: 'small', x: 618, y: 250, radius: 19 },
  { id: 'gold-6', kind: 'small', x: 656, y: 259, radius: 18 },
  { id: 'gold-7', kind: 'medium', x: 335, y: 365, radius: 27 },
  { id: 'gold-8', kind: 'medium', x: 564, y: 365, radius: 27 },
  { id: 'gold-9', kind: 'large', x: 210, y: 423, radius: 37 },
  { id: 'stone-1', kind: 'rock', x: 361, y: 484, radius: 32 },
  { id: 'stone-2', kind: 'rock', x: 486, y: 507, radius: 31 },
  { id: 'chest', kind: 'chest', x: 420, y: 493, radius: 24 },
];

export const values = { small: 100, medium: 220, large: 400, rock: 15 };
const reelSpeed: Record<ItemKind, number> = { small: 105, medium: 96, large: 73, rock: 57, chest: 97 };

export function newEntry(): Entry {
  return {
    wallet: 0,
    inventory: { potion: 0, scissors: 0, magnet: 0 },
    armed: { potion: false, magnet: false },
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
    practice: false,
  };
}

export function nextRandom(seed: number) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 0x100000000 };
}

export function openChest(seed: number) {
  const first = nextRandom(seed);
  if (first.value < 0.5) return { roll: 'cash', value: 350, seed: first.seed } as const;
  if (first.value >= 0.8) return { roll: 'rock', value: 15, seed: first.seed } as const;
  const second = nextRandom(first.seed);
  return { roll: 'supply', value: 0, supply: SHOP[Math.floor(second.value * SHOP.length)].id, seed: second.seed } as const;
}

export class Mine {
  readonly quota = 600;
  readonly duration: number;
  readonly entry: Entry;
  readonly inventory: Inventory;
  readonly events: MineEvent[] = [];
  readonly treasure: Treasure[];
  readonly effects = { potion: 0, magnet: 0 };
  time = 0;
  earnings: number;
  wallet: number;
  phase: Phase = 'aim';
  angle = 0;
  distance = 0;
  target: Treasure | undefined;
  result: boolean | undefined;
  private seed: number;
  private direction = -1;
  private openingHold = .42;
  private firstCast = true;

  constructor(entry: Entry, scenario?: Scenario) {
    this.entry = structuredClone(entry);
    this.duration = scenario?.duration ?? 75;
    this.earnings = scenario?.earnings ?? 0;
    this.wallet = entry.wallet + this.earnings;
    this.inventory = { ...entry.inventory };
    this.seed = scenario?.seed ?? entry.seed;
    this.treasure = structuredClone(scenario?.treasure ?? mineTreasure);
  }

  get remaining() { return Math.max(0, this.duration - this.time); }
  get canCut() { return this.phase === 'reel' && !!this.target && this.inventory.scissors > 0; }
  get vector() { return { x: Math.sin(this.angle), y: Math.cos(this.angle) }; }
  get hook() {
    const direction = this.vector;
    return { x: PIVOT.x + direction.x * this.distance, y: PIVOT.y + direction.y * this.distance };
  }

  press() {
    if (this.result !== undefined) return false;
    if (this.canCut) {
      this.inventory.scissors--;
      this.events.push({ action: 'cut', time: this.time, target: this.target?.id });
      this.resetHook();
      return true;
    }
    if (this.phase !== 'aim') return false;
    if (this.firstCast) {
      this.firstCast = false;
      for (const id of ['potion', 'magnet'] as const) {
        if (this.entry.armed[id] && this.inventory[id] > 0) {
          this.inventory[id]--;
          this.effects[id] = id === 'potion' ? 12 : 8;
        }
      }
    }
    this.openingHold = 0;
    this.phase = 'out';
    this.events.push({ action: 'cast', time: this.time });
    return true;
  }

  step() {
    if (this.result !== undefined) return;
    const step = Math.min(STEP, this.remaining);
    this.time += step;
    if (this.phase === 'aim') this.sweep(step);
    else if (this.phase === 'out') this.extend(step);
    else this.reel(step);
    for (const id of ['potion', 'magnet'] as const) {
      this.effects[id] = Math.max(0, this.effects[id] - step);
    }
    if (this.remaining < 1e-8) {
      this.time = this.duration;
      this.result = this.earnings >= this.quota;
      this.events.push({ action: 'result', time: this.time, passed: this.result });
    }
  }

  private sweep(step: number) {
    if (this.openingHold > 0) {
      this.openingHold -= step;
      return;
    }
    const edge = 68 * Math.PI / 180;
    this.angle += this.direction * (55 * Math.PI / 180) * step * (this.effects.magnet > 0 ? 0.55 : 1);
    if (Math.abs(this.angle) >= edge) {
      this.angle = Math.sign(this.angle) * (2 * edge - Math.abs(this.angle));
      this.direction *= -1;
    }
  }

  private extend(step: number) {
    const direction = this.vector;
    const range = Math.min(
      direction.x < 0 ? (PIVOT.x - 18) / -direction.x : (WIDTH - 18 - PIVOT.x) / direction.x,
      (HEIGHT - 32 - PIVOT.y) / direction.y,
    );
    const nextDistance = Math.min(range, this.distance + 155 * step);
    let closest = nextDistance;
    for (const target of this.treasure) {
      const x = target.x - PIVOT.x;
      const y = target.y - PIVOT.y;
      const along = x * direction.x + y * direction.y;
      const across = x * direction.y - y * direction.x;
      if (Math.abs(across) >= target.radius || along <= 0) continue;
      const hit = along - Math.sqrt(target.radius ** 2 - across ** 2);
      if (hit < this.distance || hit > closest) continue;
      closest = hit;
      this.target = target;
    }
    this.distance = closest;
    if (this.target || nextDistance === range) {
      this.phase = 'reel';
      this.events.push({ action: 'latch', time: this.time, target: this.target?.id });
    }
  }

  private reel(step: number) {
    const multiplier = this.effects.potion > 0 && this.target ? 1.8 : 1;
    const speed = this.target ? reelSpeed[this.target.kind] : 260;
    this.distance = Math.max(0, this.distance - speed * multiplier * step);
    if (this.distance > 0) return;
    if (this.target) this.bank(this.target);
    else this.events.push({ action: 'empty', time: this.time });
    this.resetHook();
  }

  private bank(target: Treasure) {
    this.treasure.splice(this.treasure.indexOf(target), 1);
    const chest = target.kind === 'chest' ? openChest(this.seed) : undefined;
    if (chest) {
      this.seed = chest.seed;
      if (chest.roll === 'supply') this.inventory[chest.supply]++;
    }
    const value = target.kind === 'chest' ? (chest?.value ?? 0) : values[target.kind];
    this.wallet += value;
    this.earnings += value;
    this.events.push({ action: 'bank', time: this.time, target: target.id, value, roll: chest?.roll });
  }

  private resetHook() {
    this.direction = this.angle === 0 ? -this.direction : -Math.sign(this.angle);
    this.angle = 0;
    this.distance = 0;
    this.target = undefined;
    this.phase = 'aim';
  }
}
