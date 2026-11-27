import { enemies, garden, height, rules, skills, viewHeight, viewWidth, waves, width } from './content.ts';
import type { EnemyDef } from './content.ts';

export const dt = 1 / 60;
export const ticks = (seconds: number) => Math.round(seconds * 60);
const tau = 2 * Math.PI;
export type Point = { x: number; y: number };
export type Input = Point & { dash: boolean };
export type Cue = { id: string; point?: Point; damage?: number };
type Foe = Point & {
  id: number; def: EnemyDef; hp: number; maxHp: number; vx: number; vy: number;
  state: 'idle' | 'windup' | 'attack' | 'recover' | 'arrival';
  until: number; attack: 'cleave' | 'toll'; angle: number; casts: number; hit: boolean;
  phase: number; spark: number; poison: number; poisonDamage: number; poisonNext: number;
  bladeHits: number[];
};
type Bolt = Point & { vx: number; vy: number; left: number; damage: number; pierce: number; hits: number[]; comet: boolean };
type Loot = Point & { value: number; kind: 'ember' | 'potion' | 'chest'; expires: number };
type Patch = Point & { radius: number; until: number; damage: number };
export type Result = 'victory' | 'hp' | 'rite' | 'time';
export type Offer = { kind: 'level' | 'boon' | 'evolution'; cards: string[]; level: number };

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (a: number, low: number, high: number) => Math.max(low, Math.min(high, a));
export const vector = (angle: number): Point => ({ x: Math.cos(angle), y: Math.sin(angle) });
export const heading = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x);
export const angleDistance = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function outsideSolids(p: Point, radius: number) {
  return garden.blockers.every(block => distance(p, block) >= block.r + radius);
}

function segmentHit(a: Point, b: Point, p: Point, radius: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const offsetX = a.x - p.x;
  const offsetY = a.y - p.y;
  const length = dx * dx + dy * dy;
  const c = offsetX * offsetX + offsetY * offsetY - radius * radius;
  const approach = offsetX * dx + offsetY * dy;
  if (c <= 0) return approach < 0 ? 0 : Infinity;
  if (!length || approach >= 0) return Infinity;
  const discriminant = approach * approach - length * c;
  if (discriminant < 0) return Infinity;
  const t = (-approach - Math.sqrt(discriminant)) / length;
  return t <= 1 ? t : Infinity;
}

function solidHit(a: Point, b: Point, radius: number) {
  let hit = Infinity;
  for (const block of garden.blockers) hit = Math.min(hit, segmentHit(a, b, block, radius + block.r));
  return hit;
}

export function move(p: Point, dx: number, dy: number, radius: number, slide = true) {
  const margin = garden.boundaryMargin + radius;
  const target = {
    x: clamp(p.x + dx, margin, width - margin),
    y: clamp(p.y + dy, margin, height - margin),
  };
  const boundary = target.x !== p.x + dx || target.y !== p.y + dy;
  const hit = solidHit(p, target, radius);
  if (hit === Infinity) {
    Object.assign(p, target);
    return boundary;
  }
  if (slide) {
    move(p, dx, 0, radius, false);
    move(p, 0, dy, radius, false);
  } else {
    const t = Math.max(0, hit - .001);
    p.x += (target.x - p.x) * t;
    p.y += (target.y - p.y) * t;
  }
  return true;
}

export function camera(p: Point): Point {
  return {
    x: clamp(p.x - viewWidth / 2, 0, width - viewWidth),
    y: clamp(p.y - viewHeight / 2, 0, height - viewHeight),
  };
}

export class Clock {
  private carry = 0;
  reset() { this.carry = 0; }
  advance(seconds: number, step: () => boolean) {
    this.carry += clamp(seconds, 0, .1);
    for (let frame = 0; this.carry + 1e-9 >= dt && frame < 5; frame++) {
      this.carry -= dt;
      if (!step()) {
        this.reset();
        return;
      }
    }
    if (this.carry >= dt) this.carry = 0;
  }
}

export class Run {
  tick = 0;
  player = { x: garden.playerStart[0], y: garden.playerStart[1], hp: rules.player.hp, maxHp: rules.player.hp };
  foes: Foe[] = [];
  bolts: Bolt[] = [];
  loot: Loot[] = [];
  patches: Patch[] = [];
  orbit: Point[] = [];
  cues: Cue[] = [];
  build = new Map<string, number>([[rules.startingSkill, 1]]);
  damage = new Map<string, number>();
  xp = 0;
  level = 1;
  kills = 0;
  totalDamageTaken = 0;
  offer: Offer | null = null;
  result: Result | null = null;
  rerolls = rules.maxRerolls;
  picks = 0;
  dashReady = 0;
  dashUntil = 0;
  grace = 0;
  facing: Point = { x: 0, y: 1 };
  dashVector = this.facing;
  protected movementBonus = 0;
  protected cooldownBonus = 0;
  protected pickupBonus = 0;
  protected damageBonus = 0;
  protected xpMultiplier = 1;
  protected guard = 0;
  protected pendingLevels = 0;
  private serial = 0;
  private nextCast = new Map<string, number>();
  private waveDebt = .7;
  private normalKills = 0;
  private waveRng: () => number;
  private draftRng: () => number;
  private aiRng: () => number;
  private cells = new Map<number, Foe[]>();

  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.waveRng = random(seed ^ 732291);
    this.draftRng = random(seed ^ 913375);
    this.aiRng = random(seed ^ 138599);
  }

  get elapsed() { return this.tick * dt; }
  get xpGoal() {
    const n = this.level - 1;
    return rules.xp.start + rules.xp.linear * n + Math.floor(rules.xp.quadratic * n * n);
  }
  get boss() { return this.foes.find(foe => foe.def.role === 'boss'); }
  get elite() { return this.foes.find(foe => foe.def.role === 'elite'); }

  rank(id: string) {
    return skills.get(id)?.ranks[(this.build.get(id) ?? 0) - 1] ?? {};
  }

  step(input: Input) {
    if (this.result || this.offer) return;
    this.tick++;
    this.walk(input);
    this.direct();
    this.indexFoes();
    this.updateFoes();
    this.indexFoes();
    this.cast();
    this.moveBolts();
    this.resolveDeaths();
    if (this.player.hp > 0) {
      this.collect();
      this.objectives();
    }
    this.resolveOutcome();
    if (!this.result) this.nextOffer();
  }

  protected emit(id: string, point?: Point, damage?: number) {
    if (this.cues.length < 128) this.cues.push({ id, point: point && { x: point.x, y: point.y }, damage });
  }

  private walk(input: Input) {
    const length = Math.hypot(input.x, input.y);
    const direction = { x: input.x / Math.max(1, length), y: input.y / Math.max(1, length) };
    if (length) this.facing = { x: input.x / length, y: input.y / length };
    const p = rules.player;
    const laces = this.rank('gale-laces');
    if (input.dash && this.tick >= this.dashReady) {
      this.dashVector = { ...this.facing };
      this.dashUntil = this.tick + ticks(p.dashDurationSec);
      this.dashReady = this.tick + ticks(Math.max(1.6, p.dashCooldownSec - (laces.dashCooldownReductionSec ?? 0) - this.cooldownBonus));
      this.emit('dash', this.player);
    }
    if (this.tick < this.dashUntil) {
      const speed = p.dashDistance / ticks(p.dashDurationSec);
      if (move(this.player, this.dashVector.x * speed, this.dashVector.y * speed, p.radius, false)) this.dashUntil = this.tick;
      return;
    }
    const speed = p.speed * (1 + Math.min(.35, (laces.speedBonus ?? 0) + this.movementBonus));
    move(this.player, direction.x * speed * dt, direction.y * speed * dt, p.radius);
  }

  protected hurt(amount: number) {
    if (this.tick < this.dashUntil || this.tick < this.grace) return;
    if (this.guard > 0) {
      this.guard--;
      this.grace = this.tick + ticks(rules.player.blockGraceSec);
      this.emit('shield', this.player);
      return;
    }
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.totalDamageTaken += amount;
    this.grace = this.tick + ticks(rules.player.damageGraceSec);
    this.emit('hurt', this.player);
  }

  protected spawn(id: string, hp?: number, position?: Point): Foe | undefined {
    const def = enemies.get(id)!;
    const view = camera(this.player);
    let spot = position;
    const padding = garden.spawnTargetPadding;
    const margin = garden.boundaryMargin + def.radius;
    for (let attempt = 0; !spot && attempt < 40; attempt++) {
      const direction = vector(this.waveRng() * tau);
      const reach = 290 + this.waveRng() * 380;
      const candidate = {
        x: clamp(this.player.x + direction.x * reach, margin, width - margin),
        y: clamp(this.player.y + direction.y * reach, margin, height - margin),
      };
      if (distance(candidate, this.player) < garden.spawnMinFromPlayer || !outsideSolids(candidate, def.radius)) continue;
      if (candidate.x < view.x - padding || candidate.x > view.x + viewWidth + padding ||
          candidate.y < view.y - padding || candidate.y > view.y + viewHeight + padding) spot = candidate;
      if (!spot && def.role !== 'normal' && attempt > 28) spot = candidate;
    }
    if (!spot) return;
    const foe: Foe = {
      ...spot, id: ++this.serial, def, hp: hp ?? def.hp, maxHp: hp ?? def.hp,
      vx: 0, vy: 0, state: def.role === 'normal' ? 'idle' : 'arrival',
      until: this.tick + ticks(def.role === 'boss' ? 1.5 : 1),
      attack: 'cleave', angle: 0, casts: 0, hit: false, phase: 1,
      spark: 0, poison: 0, poisonDamage: 0, poisonNext: 0, bladeHits: [],
    };
    this.foes.push(foe);
    return foe;
  }

  protected direct() {
    const band = waves.slice.find(wave => this.tick >= ticks(wave.startSec) && this.tick < ticks(wave.endSec));
    if (!band) return;
    this.waveDebt += band.eventsPerSec * dt;
    if (this.waveDebt < 1) return;
    this.waveDebt--;
    let roll = this.waveRng() * band.groups.reduce((sum, group) => sum + Number(group[2]), 0);
    const group = band.groups.find(item => (roll -= Number(item[2])) < 0) ?? band.groups[0];
    let alive = this.foes.filter(foe => foe.def.role === 'normal').length;
    for (let i = 0; i < Number(group[1]) && alive < band.cap; i++) {
      if (this.spawn(String(group[0]))) alive++;
    }
  }

  private updateFoes() {
    for (const foe of this.foes) {
      const range = distance(this.player, foe);
      if (foe.state === 'arrival') {
        if (this.tick >= foe.until) foe.state = 'idle';
        continue;
      }
      if (foe.def.role === 'boss') {
        this.updateBoss(foe, range);
      } else {
        this.updateMob(foe, range);
      }
      if (distance(this.player, foe) <= foe.def.radius + rules.player.radius) this.hurt(foe.def.contactDamage);
    }
  }

  protected updateBoss(foe: Foe, range: number) {
    this.steer(foe, heading(foe, this.player), foe.def.speed, range);
  }

  protected steer(foe: Foe, angle: number, speed: number, range: number, accel = 460) {
    const dir = vector(angle);
    let x = dir.x;
    let y = dir.y;
    if (range > 22) {
      for (const other of this.neighbors(foe, 45)) {
        const gap = distance(foe, other);
        if (other === foe || gap < 1 || gap >= foe.def.radius + other.def.radius + 4) continue;
        x += (foe.x - other.x) / gap * .35;
        y += (foe.y - other.y) / gap * .35;
      }
    }
    foe.vx += clamp(x * speed - foe.vx, -accel * dt, accel * dt);
    foe.vy += clamp(y * speed - foe.vy, -accel * dt, accel * dt);
    move(foe, foe.vx * dt, foe.vy * dt, foe.def.radius);
  }

  private updateMob(foe: Foe, range: number) {
    const behavior = foe.def.behavior;
    const toward = heading(foe, this.player);
    if (behavior.ai === 'charge') {
      if (foe.state === 'windup' && this.tick >= foe.until) {
        foe.state = 'attack';
        foe.until = this.tick + ticks(behavior.chargeSec!);
      }
      if (foe.state === 'attack') {
        const dir = vector(foe.angle);
        const speed = behavior.chargeSpeed! * dt;
        const stop = move(foe, dir.x * speed, dir.y * speed, foe.def.radius, false);
        if (stop || this.tick >= foe.until) {
          foe.state = 'recover';
          foe.until = this.tick + ticks(behavior.recovery!);
        }
        return;
      }
      if (foe.state === 'recover' && this.tick >= foe.until) foe.state = 'idle';
      if (foe.state === 'idle' && range < behavior.triggerRange!) {
        foe.state = 'windup';
        foe.until = this.tick + ticks(behavior.windup!);
        foe.angle = toward;
        this.emit('telegraph', foe);
      }
      if (foe.state !== 'idle') return;
    }
    const angle = behavior.ai === 'flank' && range > 30
      ? toward + (foe.phase === 2 ? .48 : -.48) * Math.min(1, range / 95)
      : toward;
    if (behavior.ai === 'flank' && !foe.casts) {
      foe.phase = this.aiRng() < .5 ? 1 : 2;
      foe.casts = 1;
    }
    this.steer(foe, angle, foe.def.speed, range, behavior.accel ?? 680);
  }

  private indexFoes() {
    this.cells.clear();
    for (const foe of this.foes) {
      const id = Math.floor(foe.x / 80) + 32 * Math.floor(foe.y / 80);
      const cell = this.cells.get(id);
      if (cell) cell.push(foe);
      else this.cells.set(id, [foe]);
    }
  }

  private *neighbors(p: Point, radius: number) {
    for (let y = Math.floor((p.y - radius) / 80); y <= Math.floor((p.y + radius) / 80); y++) {
      for (let x = Math.max(0, Math.floor((p.x - radius) / 80)); x <= Math.min(31, Math.floor((p.x + radius) / 80)); x++) {
        yield* this.cells.get(x + y * 32) ?? [];
      }
    }
  }

  private target(range: number) {
    let best: Foe | undefined;
    for (const foe of this.neighbors(this.player, range)) {
      const gap = distance(foe, this.player);
      if (foe.hp <= 0 || foe.state === 'arrival' || gap > range || (gap === range && best && best.id < foe.id)) continue;
      if (solidHit(this.player, foe, 0) !== Infinity) continue;
      best = foe;
      range = gap;
    }
    return best;
  }

  private hit(foe: Foe, amount: number, source: string) {
    if (foe.hp <= 0 || foe.state === 'arrival') return;
    const damage = Math.round(amount * (this.rank('thread-lens').damageMultiplier ?? 1) * (1 + this.damageBonus));
    this.damage.set(source, (this.damage.get(source) ?? 0) + Math.min(foe.hp, damage));
    foe.hp -= damage;
    this.emit('impact', foe, damage);
  }

  private cast() {
    const comet = this.build.has('comet-thread');
    const id = comet ? 'comet-thread' : 'wick-dart';
    const dart = this.rank(id);
    if (this.tick >= (this.nextCast.get(id) ?? 0)) {
      const target = this.target(dart.range);
      if (target) {
        this.nextCast.set(id, this.tick + ticks(dart.intervalSec));
        this.emit(comet ? 'meteor' : 'dart', this.player);
        for (let i = 0; i < dart.count && this.bolts.length < rules.caps.projectiles; i++) {
          const angle = heading(this.player, target) + (i - (dart.count - 1) / 2) * (comet ? .175 : .279);
          const dir = vector(angle);
          this.bolts.push({
            x: this.player.x, y: this.player.y, vx: dir.x * 540, vy: dir.y * 540,
            left: dart.range, damage: dart.damage, pierce: dart.pierce, hits: [], comet,
          });
        }
      }
    }

    const area = this.rank('lantern-oil').areaMultiplier ?? 1;
    const duration = this.rank('root-charm').durationMultiplier ?? 1;
    const ring = this.rank('prism-ring');
    this.orbit.length = 0;
    for (let i = 0; i < (ring.count ?? 0); i++) {
      const dir = vector(tau * (i / ring.count + this.elapsed / ring.periodSec));
      const p = { x: this.player.x + dir.x * ring.radius * area, y: this.player.y + dir.y * ring.radius * area };
      this.orbit.push(p);
      for (const foe of this.neighbors(p, 65)) {
        if (foe.state === 'arrival' || foe.hp <= 0 || distance(p, foe) > foe.def.radius + 12 ||
            this.tick < (foe.bladeHits[i] ?? 0)) continue;
        foe.bladeHits[i] = this.tick + ticks(ring.rehitSec);
        this.hit(foe, ring.damage + (foe.spark > this.tick ? 9 : 0), 'prism-ring');
        foe.spark = 0;
      }
    }
    const bloom = this.rank('bog-bloom');
    if (bloom.tickDamage && this.tick >= (this.nextCast.get('bog-bloom') ?? 0)) {
      const target = this.target(bloom.range) ?? { x: this.player.x + this.facing.x * 70, y: this.player.y + this.facing.y * 70 };
      this.nextCast.set('bog-bloom', this.tick + ticks(bloom.intervalSec));
      if (this.patches.length === 3) this.patches.shift();
      this.patches.push({ x: target.x, y: target.y, radius: bloom.radius * area, until: this.tick + ticks(bloom.durationSec * duration), damage: bloom.tickDamage });
      this.emit('bloom', target);
    }
    this.patches = this.patches.filter(patch => patch.until >= this.tick);
    for (const patch of this.patches) {
      for (const foe of this.neighbors(patch, patch.radius)) {
        if (foe.state === 'arrival' || distance(foe, patch) > patch.radius) continue;
        if (foe.poison < this.tick) {
          foe.poisonNext = this.tick + ticks(.5);
          foe.poisonDamage = patch.damage;
        }
        foe.poisonDamage = Math.max(foe.poisonDamage, patch.damage);
        foe.poison = this.tick + ticks(duration);
      }
    }
    for (const foe of this.foes) {
      if (foe.poison >= this.tick && this.tick >= foe.poisonNext) {
        foe.poisonNext += ticks(.5);
        this.hit(foe, foe.poisonDamage, 'bog-bloom');
      }
    }
  }

  private moveBolts() {
    for (const bolt of this.bolts) {
      const end = { x: bolt.x + bolt.vx * dt, y: bolt.y + bolt.vy * dt };
      const wall = solidHit(bolt, end, 3);
      const hits: { foe: Foe; time: number }[] = [];
      for (const foe of this.neighbors(bolt, 70)) {
        if (foe.state === 'arrival' || foe.hp <= 0 || bolt.hits.includes(foe.id)) continue;
        const time = distance(bolt, foe) <= foe.def.radius + 4 ? 0 : segmentHit(bolt, end, foe, foe.def.radius + 4);
        if (time < wall && time <= 1) hits.push({ foe, time });
      }
      for (const { foe } of hits.sort((a, b) => a.time - b.time || a.foe.id - b.foe.id)) {
        this.hit(foe, bolt.damage, 'wick-dart');
        foe.spark = this.tick + ticks(3);
        bolt.hits.push(foe.id);
        if (bolt.pierce-- > 0) continue;
        bolt.left = 0;
        if (bolt.comet) {
          const rank = this.rank('comet-thread');
          const radius = rank.splashRadius * (this.rank('lantern-oil').areaMultiplier ?? 1);
          for (const other of this.neighbors(foe, radius)) {
            if (other !== foe && distance(other, foe) <= radius) this.hit(other, rank.splashDamage, 'wick-dart');
          }
        }
        break;
      }
      if (wall !== Infinity) bolt.left = 0;
      bolt.left -= 540 * dt;
      bolt.x = end.x;
      bolt.y = end.y;
    }
    this.bolts = this.bolts.filter(bolt => bolt.left > 0);
  }

  protected drop(p: Point, kind: Loot['kind'], value: number, expires = Infinity) {
    this.loot.push({ x: p.x, y: p.y, value, kind, expires });
  }

  private resolveDeaths() {
    for (const foe of this.foes) {
      if (foe.hp > 0) continue;
      this.kills++;
      this.emit('kill', foe);
      if (foe.def.role === 'boss') {
        this.bossDefeated();
        continue;
      }
      if (foe.def.role === 'elite') this.eliteDefeated(foe);
      if (foe.def.role === 'normal' && ++this.normalKills % 45 === 0 && !this.loot.some(item => item.kind === 'potion')) {
        this.drop(foe, 'potion', 18, this.tick + ticks(20));
      }
      if (this.loot.length < rules.caps.xpPickups) this.drop(foe, 'ember', foe.def.xp);
      else {
        const closest = this.loot.filter(item => item.kind === 'ember').reduce<Loot | undefined>((best, item) =>
          !best || distance(foe, item) < distance(foe, best) ? item : best, undefined);
        if (closest) closest.value += foe.def.xp;
      }
    }
    this.foes = this.foes.filter(foe => foe.hp > 0);
  }

  protected bossDefeated() {}
  protected eliteDefeated(_foe: Foe) { void _foe; }
  protected objectives() {}

  protected gainXp(amount: number) {
    this.xp += amount * this.xpMultiplier;
    while (this.xp >= this.xpGoal) {
      this.xp -= this.xpGoal;
      this.level++;
      this.pendingLevels++;
    }
  }

  private collect() {
    this.loot = this.loot.filter(item => {
      if (item.expires < this.tick) return false;
      const gap = distance(item, this.player);
      if (item.kind === 'chest' && gap < 28) {
        this.bankCatalyst();
        return false;
      }
      if (item.kind === 'potion' && gap < 26 && this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
        this.emit('xp', item);
        return false;
      }
      if (item.kind !== 'ember') return true;
      if (gap < 13) {
        this.gainXp(item.value);
        this.emit('xp', item);
        return false;
      }
      if (gap < rules.player.pickupRadius + this.pickupBonus) {
        const dir = vector(heading(item, this.player));
        item.x += dir.x * 390 * dt;
        item.y += dir.y * 390 * dt;
      }
      return true;
    });
  }

  protected bankCatalyst() {}

  protected resolveOutcome() {
    if (this.player.hp <= 0) this.result = 'hp';
  }

  protected show(kind: Offer['kind'], cards: string[]) {
    this.offer = { kind, cards, level: this.level - this.pendingLevels };
    this.emit(kind === 'level' ? 'level' : 'select');
  }

  protected nextOffer() {
    if (this.pendingLevels && !this.offer) {
      this.pendingLevels--;
      this.show('level', this.drawCards());
    }
  }

  private drawCards(excluded: string[] = []) {
    const count = (type: string) => [...this.build.keys()].filter(id => skills.get(id)?.type === type || (type === 'active' && skills.get(id)?.type === 'evolution')).length;
    const legal = [...rules.slice.skillPool].sort().filter(id => {
      const skill = skills.get(id)!;
      const rank = this.build.get(id) ?? 0;
      if (id === 'wick-dart' && this.build.has('comet-thread')) return false;
      if (rank) return rank < skill.maxRank;
      return count(skill.type) < (skill.type === 'active' ? rules.slots.active : rules.slots.passive);
    });
    const pool = legal.filter(id => !excluded.includes(id));
    const cards: string[] = [];
    const take = (id: string | undefined) => {
      if (!id) return;
      cards.push(id);
      pool.splice(pool.indexOf(id), 1);
    };
    if (this.level - this.pendingLevels === 2 && !excluded.length) {
      take(pool.find(id => id === 'bog-bloom' || id === 'prism-ring'));
    }
    if (this.level - this.pendingLevels >= 3) {
      take(pool.find(id => id === 'thread-lens' && !this.build.has(id)) ??
        pool.find(id => id === 'wick-dart') ??
        pool.find(id => id === 'thread-lens' && (this.build.get(id) ?? 0) < 2));
    }
    while (pool.length && cards.length < 3) {
      const weight = (id: string) => this.build.has(id) ? 4 : skills.get(id)?.type === 'active' ? 3 : 2;
      let roll = this.draftRng() * pool.reduce((sum, id) => sum + weight(id), 0);
      take(pool.find(id => (roll -= weight(id)) < 0) ?? pool[0]);
    }
    for (const id of [...legal, 'patch', 'haste', 'wick-oil', 'skip']) {
      if (cards.length >= 3) break;
      if (cards.includes(id) || (id === 'patch' && this.player.hp >= this.player.maxHp) ||
          (id === 'wick-oil' && this.damageBonus >= .15)) continue;
      cards.push(id);
    }
    return cards;
  }

  reroll() {
    if (this.offer?.kind !== 'level' || this.rerolls <= 0 || this.picks < 2) return;
    this.rerolls--;
    this.offer = { ...this.offer, cards: this.drawCards(this.offer.cards) };
  }

  choose(id: string) {
    if (!this.offer?.cards.includes(id) || this.offer.kind !== 'level') return false;
    const skill = skills.get(id);
    if (skill) this.build.set(id, (this.build.get(id) ?? 0) + 1);
    if (id === 'patch') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    if (id === 'haste') this.dashReady = Math.max(this.tick, this.dashReady - ticks(.35));
    if (id === 'wick-oil') this.damageBonus = Math.min(.15, this.damageBonus + .03);
    this.picks++;
    this.offer = null;
    this.emit('select');
    this.nextOffer();
    return true;
  }
}

export type { Foe };
