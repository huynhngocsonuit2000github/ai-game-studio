import { enemies, garden, height, rules, skills, viewHeight, viewWidth, waves, width } from './content.ts';
import type { EnemyDef } from './content.ts';

export const dt = 1 / 60;
export const ticks = (seconds: number) => Math.round(seconds * 60);
const tau = 2 * Math.PI;
const unlearned: Readonly<Record<string, number>> = Object.freeze({});
export type Point = { x: number; y: number };
export type Input = Point & { dash: boolean; burst?: boolean; interact?: boolean };
export type Cue = { id: string; point?: Point; damage?: number };
export type SpellEffect = {
  spell: string; kind: 'hit' | 'cast' | 'ring' | 'spread'; at: Point; tick: number;
  radius?: number; angle?: number; to?: Point;
};
export type Arena = { width: number; height: number; blockers: { x: number; y: number; r: number; sprite: string }[] };
const gardenArena: Arena = { width, height, blockers: garden.blockers };
type Foe = Point & {
  id: number; def: EnemyDef; hp: number; maxHp: number; vx: number; vy: number;
  state: 'idle' | 'windup' | 'attack' | 'recover' | 'arrival';
  until: number; attack: 'cleave' | 'toll' | 'lanes'; angle: number; casts: number; hit: boolean;
  phase: number; spark: number; poison: number; poisonDamage: number; poisonNext: number;
  bladeHits: number[]; chill: number; slow: number; echo: boolean; attackTick: number; laneOrigin: number; hitRings: number;
};
type Bolt = Point & { vx: number; vy: number; left: number; damage: number; pierce: number; hits: number[]; source: 'wick-dart' | 'foxfire'; comet: boolean };
type Loot = Point & { value: number; kind: 'ember' | 'potion' | 'chest'; expires: number };
type Patch = Point & { born?: number; radius: number; until: number; damage: number; spread: boolean };
type Shot = Point & { vx: number; vy: number; until: number; damage: number };
type Meteor = Point & { radius: number; until: number; damage: number };
export type WaveBand = typeof waves.slice[number];
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

export function outsideSolids(p: Point, radius: number, arena = gardenArena) {
  return arena.blockers.every(block => distance(p, block) >= block.r + radius);
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

export function solidHit(a: Point, b: Point, radius: number, arena = gardenArena) {
  let hit = Infinity;
  for (const block of arena.blockers) hit = Math.min(hit, segmentHit(a, b, block, radius + block.r));
  return hit;
}

export function move(p: Point, dx: number, dy: number, radius: number, slide = true, arena = gardenArena) {
  const margin = garden.boundaryMargin + radius;
  const target = {
    x: clamp(p.x + dx, margin, arena.width - margin),
    y: clamp(p.y + dy, margin, arena.height - margin),
  };
  const boundary = target.x !== p.x + dx || target.y !== p.y + dy;
  const hit = solidHit(p, target, radius, arena);
  if (hit === Infinity) {
    Object.assign(p, target);
    return boundary;
  }
  if (slide) {
    move(p, dx, 0, radius, false, arena);
    move(p, 0, dy, radius, false, arena);
  } else {
    const t = Math.max(0, hit - .001);
    p.x += (target.x - p.x) * t;
    p.y += (target.y - p.y) * t;
  }
  return true;
}

export function camera(p: Point, arena = gardenArena): Point {
  return {
    x: clamp(p.x - viewWidth / 2, 0, arena.width - viewWidth),
    y: clamp(p.y - viewHeight / 2, 0, arena.height - viewHeight),
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
  familiars: Point[] = [];
  shots: Shot[] = [];
  meteors: Meteor[] = [];
  spawnsSkipped = 0;
  damageTakenBy = new Map<string, number>();
  xpEarned = 0;
  private guardNext = 0;
  private dashBurst = false;
  cues: Cue[] = [];
  readonly spellEffects: SpellEffect[] = [];
  readonly campaign: boolean = false;
  arena = gardenArena;
  protected spellSpeed = 1;
  protected speedCap = .35;
  protected mainDamage = 0;
  protected splashAdd = 0;

  clearSpellEffects() { this.spellEffects.length = 0; }

  protected effect(spell: string, kind: SpellEffect['kind'], at: Point, detail: Pick<SpellEffect, 'radius' | 'angle' | 'to'> = {}) {
    if (!this.campaign) return;
    if (this.spellEffects.length >= 80) {
      const decorative = this.spellEffects.findIndex(fx => fx.kind === 'hit');
      if (decorative >= 0) this.spellEffects.splice(decorative, 1);
      else if (kind === 'hit') return;
      else this.spellEffects.shift();
    }
    this.spellEffects.push({ spell, kind, at: { x: at.x, y: at.y }, tick: this.tick, ...detail });
  }

  get emberReach() {
    const reach = rules.player.pickupRadius + this.pickupBonus + (this.rank('heart-husk').pickupRadiusBonus ?? 0);
    return this.campaign ? Math.min(160, reach) : reach;
  }

  protected movementScale() { return 1; }
  protected action(_input: Input) { void _input; }
  protected foeAction(_foe: Foe) { void _foe; return false; }
  protected death(_foe: Foe) { void _foe; return false; }

  protected translate(p: Point, dx: number, dy: number, radius: number, slide = true) {
    return move(p, dx, dy, radius, slide, this.arena);
  }
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
  private cells: Foe[][] = [];
  private populatedCells: Foe[][] = [];

  readonly seed: number;
  readonly normal: boolean;

  constructor(seed: number, normal = false) {
    this.seed = seed;
    this.normal = normal;
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
    return this.skillRank(id, this.build.get(id) ?? 0);
  }

  skillRank(id: string, rank: number) {
    return skills.get(id)?.ranks[rank - 1] ?? unlearned;
  }

  step(input: Input) {
    if (this.result || this.offer) return;
    this.tick++;
    this.walk(input);
    this.direct();
    this.indexFoes();
    this.updateFoes();
    this.indexFoes();
    this.action(input);
    if (this.result) return;
    if (this.tick >= this.dashUntil) this.burstDash();
    this.cast();
    this.moveBolts();
    this.moveShots();
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
      this.dashBurst = true;
      this.dashVector = { ...this.facing };
      this.dashUntil = this.tick + ticks(p.dashDurationSec);
      this.dashReady = this.tick + ticks(Math.max(1.6, p.dashCooldownSec - (laces.dashCooldownReductionSec ?? 0) - this.cooldownBonus));
      this.emit('dash', this.player);
    }
    if (this.tick < this.dashUntil) {
      const speed = p.dashDistance / ticks(p.dashDurationSec);
      if (this.translate(this.player, this.dashVector.x * speed, this.dashVector.y * speed, p.radius, false)) this.dashUntil = this.tick;
      return;
    }
    const speed = p.speed * (1 + Math.min(this.speedCap, (laces.speedBonus ?? 0) + this.movementBonus));
    const scale = this.movementScale();
    this.translate(this.player, direction.x * speed * dt * scale, direction.y * speed * dt * scale, p.radius);
  }

  private burstDash() {
    if (!this.dashBurst) return;
    this.dashBurst = false;
    const pack = this.rank('lantern-pack');
    if (pack.dashBurstDamage) {
      this.pulse(this.player, pack.dashBurstRadius, pack.dashBurstDamage, 'foxfire');
      this.emit('bloom', this.player);
      this.effect('lantern-pack', 'ring', this.player, { radius: this.area(pack.dashBurstRadius), angle: Math.atan2(this.dashVector.y, this.dashVector.x) });
    }
  }

  protected hurt(amount: number, source = 'hazard') {
    if (this.tick < this.dashUntil || this.tick < this.grace) return;
    if (this.guard > 0) {
      this.guard--;
      this.grace = this.tick + ticks(rules.player.blockGraceSec);
      const mirror = this.rank('mirror-ward');
      if (!this.guardNext) this.guardNext = this.tick + ticks(mirror.rechargeSec ?? 8);
      if (mirror.burstDamage) this.pulse(this.player, mirror.radius, mirror.burstDamage, 'mirror-ward');
      this.emit('shield', this.player);
      this.effect('mirror-ward', 'ring', this.player, { radius: mirror.burstDamage ? this.area(mirror.radius) : 31 });
      return;
    }
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.totalDamageTaken += amount;
    this.damageTakenBy.set(source, (this.damageTakenBy.get(source) ?? 0) + amount);
    this.grace = this.tick + ticks(rules.player.damageGraceSec);
    this.emit('hurt', this.player);
  }

  protected spawn(id: string, hp?: number, position?: Point): Foe | undefined {
    const def = enemies.get(id)!;
    const view = camera(this.player, this.arena);
    let spot = position;
    const padding = garden.spawnTargetPadding;
    const margin = garden.boundaryMargin + def.radius;
    for (let attempt = 0; !spot && attempt < 40; attempt++) {
      const direction = vector(this.waveRng() * tau);
      const reach = 290 + this.waveRng() * 380;
      const candidate = {
        x: clamp(this.player.x + direction.x * reach, margin, this.arena.width - margin),
        y: clamp(this.player.y + direction.y * reach, margin, this.arena.height - margin),
      };
      if (distance(candidate, this.player) < garden.spawnMinFromPlayer || !outsideSolids(candidate, def.radius, this.arena)) continue;
      if (candidate.x < view.x - padding || candidate.x > view.x + viewWidth + padding ||
          candidate.y < view.y - padding || candidate.y > view.y + viewHeight + padding) spot = candidate;
      if (!spot && def.role !== 'normal' && attempt > 28) spot = candidate;
    }
    if (!spot) {
      this.spawnsSkipped++;
      return;
    }
    const foe: Foe = {
      ...spot, id: ++this.serial, def, hp: hp ?? def.hp, maxHp: hp ?? def.hp,
      vx: 0, vy: 0, state: def.role === 'normal' ? 'idle' : 'arrival',
      until: this.tick + ticks(def.role === 'boss' ? 1.5 : 1),
      attack: 'cleave', angle: 0, casts: 0, hit: false, phase: 1,
      spark: 0, poison: 0, poisonDamage: 0, poisonNext: 0, bladeHits: [], chill: 0, slow: 0, echo: false, attackTick: 0, laneOrigin: 0, hitRings: 0,
    };
    this.foes.push(foe);
    return foe;
  }

  protected direct() {
    const band = (this.normal ? waves.normal : waves.slice)
      .find(wave => this.tick >= ticks(wave.startSec) && this.tick < ticks(wave.endSec));
    if (band) this.spawnBand(band);
  }

  protected spawnBand(band: WaveBand) {
    if (!band) return;
    this.waveDebt += band.eventsPerSec * dt;
    if (this.waveDebt < 1) return;
    this.waveDebt--;
    let roll = this.waveRng() * band.groups.reduce((sum, group) => sum + Number(group[2]), 0);
    const group = band.groups.find(item => (roll -= Number(item[2])) < 0) ?? band.groups[0];
    let alive = this.foes.filter(foe => foe.def.role === 'normal').length;
    for (let i = 0; i < Number(group[1]) && alive < band.cap; i++) {
      const id = String(group[0]);
      const step = this.elapsed >= 540 ? 1.42 : this.elapsed >= 360 ? 1.26 : this.elapsed >= 180 ? 1.12 : 1;
      if (this.spawn(id, this.normal ? Math.round(enemies.get(id)!.hp * step) : undefined)) alive++;
    }
  }

  private updateFoes() {
    const count = this.foes.length;
    for (let index = 0; index < count; index++) {
      const foe = this.foes[index];
      if (foe.hp <= 0) continue;
      const range = distance(this.player, foe);
      if (foe.state === 'arrival') {
        if (this.tick >= foe.until) foe.state = 'idle';
        continue;
      }
      if (this.foeAction(foe)) continue;
      if (foe.def.role === 'boss') {
        this.updateBoss(foe, range);
      } else {
        this.updateMob(foe, range);
      }
      if (distance(this.player, foe) <= foe.def.radius + rules.player.radius) this.hurt(foe.def.contactDamage, foe.def.id);
    }
  }

  protected updateBoss(foe: Foe, range: number) {
    this.steer(foe, heading(foe, this.player), foe.def.speed, range);
  }

  protected steer(foe: Foe, angle: number, speed: number, range: number, accel = 460) {
    const dir = vector(angle);
    if (foe.chill > this.tick) speed *= 1 - Math.min(foe.slow, foe.def.role === 'boss' ? .15 : 1);
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
    this.translate(foe, foe.vx * dt, foe.vy * dt, foe.def.radius);
  }

  private updateMob(foe: Foe, range: number) {
    const behavior = foe.def.behavior;
    const toward = heading(foe, this.player);
    if (behavior.ai === 'ranged' || behavior.ai === 'pulse') {
      this.updateCaster(foe, range, toward);
      return;
    }
    if (behavior.ai === 'charge') {
      if (foe.state === 'windup' && this.tick >= foe.until) {
        foe.state = 'attack';
        foe.until = this.tick + ticks(behavior.chargeSec!);
      }
      if (foe.state === 'attack') {
        const dir = vector(foe.angle);
        const speed = behavior.chargeSpeed! * dt;
        const stop = this.translate(foe, dir.x * speed, dir.y * speed, foe.def.radius, false);
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

  private updateCaster(foe: Foe, range: number, toward: number) {
    const b = foe.def.behavior;
    const ranged = b.ai === 'ranged';
    if (foe.state === 'recover' && this.tick >= foe.until) foe.state = 'idle';
    if (foe.state === 'windup') {
      if (this.tick < foe.until) return;
      if (ranged) {
        if (this.shots.length < rules.caps.hostileShots) {
          const direction = vector(foe.angle);
          this.shots.push({
            x: foe.x, y: foe.y, vx: direction.x * b.shotSpeed!, vy: direction.y * b.shotSpeed!,
            until: this.tick + ticks(b.shotLife!), damage: b.shotDamage!,
          });
        }
      } else {
        if (range <= (foe.echo ? b.echoRadius! : b.pulseRadius!)) this.hurt(b.pulseDamage!, foe.def.id);
        if (b.echoDelay && !foe.echo) {
          foe.echo = true;
          foe.until = this.tick + ticks(b.echoDelay);
          this.emit('telegraph', foe);
          return;
        }
      }
      this.emit('bell', foe);
      foe.state = 'recover';
      foe.until = this.tick + ticks((b.interval ?? 3) - (ranged ? b.telegraph! : .84));
      return;
    }
    if (foe.state !== 'idle') return;
    const [inner, outer] = b.desiredBand ?? [0, b.triggerRange!];
    if (range < inner) {
      this.steer(foe, toward + Math.PI, foe.def.speed, range);
    } else if (range > outer || (ranged && solidHit(foe, this.player, 0, this.arena) !== Infinity)) {
      this.steer(foe, toward, foe.def.speed, range);
    } else {
      foe.state = 'windup';
      foe.angle = toward;
      foe.echo = false;
      foe.until = this.tick + ticks(b.telegraph!);
      this.emit('telegraph', foe);
    }
  }

  private moveShots() {
    this.shots = this.shots.filter(shot => {
      if (shot.until <= this.tick) return false;
      const end = { x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt };
      const wall = solidHit(shot, end, 4, this.arena);
      const contact = distance(shot, this.player) <= rules.player.radius + 5
        ? 0 : segmentHit(shot, end, this.player, rules.player.radius + 5);
      if (contact < wall && contact <= 1) {
        this.hurt(shot.damage, 'bog-brewer-shot');
        return false;
      }
      Object.assign(shot, end);
      return wall === Infinity && end.x >= 0 && end.y >= 0 && end.x <= this.arena.width && end.y <= this.arena.height;
    });
  }

  protected purgeShots(point: Point, radius: number) {
    this.shots = this.shots.filter(shot => distance(point, shot) > radius);
  }

  private indexFoes() {
    for (const cell of this.populatedCells) cell.length = 0;
    this.populatedCells.length = 0;
    for (const foe of this.foes) {
      const id = Math.floor(foe.x / 80) + 32 * Math.floor(foe.y / 80);
      const cell = this.cells[id] ??= [];
      if (cell.length === 0) this.populatedCells.push(cell);
      cell.push(foe);
    }
  }

  protected *neighbors(p: Point, radius: number) {
    const left = Math.max(0, Math.floor((p.x - radius) / 80));
    const right = Math.min(31, Math.floor((p.x + radius) / 80));
    for (let y = Math.max(0, Math.floor((p.y - radius) / 80)); y <= Math.floor((p.y + radius) / 80); y++) {
      for (let x = left; x <= right; x++) {
        const cell = this.cells[x + y * 32];
        if (cell?.length) yield* cell;
      }
    }
  }

  private target(range: number) {
    let best: Foe | undefined;
    for (const foe of this.neighbors(this.player, range)) {
      const gap = distance(foe, this.player);
      if (foe.hp <= 0 || foe.state === 'arrival' || gap > range || (gap === range && best && best.id < foe.id)) continue;
      if (solidHit(this.player, foe, 0, this.arena) !== Infinity) continue;
      best = foe;
      range = gap;
    }
    return best;
  }

  protected hit(foe: Foe, amount: number, source: string, at: Point = foe, angle?: number) {
    if (foe.hp <= 0 || foe.state === 'arrival') return;
    const armor = this.normal && foe.def.role === 'boss' && foe.state !== 'recover'
      ? this.campaign ? .58 : rules.normal.wardenArmorMultiplier : 1;
    const damage = Math.max(1, Math.round(amount * armor * (this.rank('thread-lens').damageMultiplier ?? 1) * (1 + this.damageBonus)));
    this.damage.set(source, (this.damage.get(source) ?? 0) + Math.min(foe.hp, damage));
    foe.hp -= damage;
    this.emit('impact', foe, damage);
    if (this.campaign) {
      const spell = [...this.build.keys()].find(id => skills.get(id)?.recipe?.active === source) ?? source;
      this.effect(spell, 'hit', at, { angle });
    }
  }

  private cast() {
    const comet = this.build.has('comet-thread');
    const id = comet ? 'comet-thread' : 'wick-dart';
    const dart = this.rank(id);
    if (this.tick >= (this.nextCast.get(id) ?? 0)) {
      const target = this.target(dart.range);
      if (target) {
        this.nextCast.set(id, this.tick + ticks(dart.intervalSec * this.spellSpeed));
        this.emit(comet ? 'meteor' : 'dart', this.player);
        this.effect(id, 'cast', this.player, { angle: heading(this.player, target) });
        for (let i = 0; i < dart.count && this.bolts.length < rules.caps.projectiles; i++) {
          const angle = heading(this.player, target) + (i - (dart.count - 1) / 2) * (comet ? .175 : .279);
          const dir = vector(angle);
          this.bolts.push({
            x: this.player.x, y: this.player.y, vx: dir.x * 540, vy: dir.y * 540,
            left: dart.range, damage: dart.damage + this.mainDamage, pierce: dart.pierce, hits: [], source: 'wick-dart', comet,
          });
        }
      }
    }

    const area = this.rank('lantern-oil').areaMultiplier ?? 1;
    const duration = this.rank('root-charm').durationMultiplier ?? 1;
    this.castNormal(area);
    const crown = this.build.has('crown-of-glass');
    const ring = this.rank(crown ? 'crown-of-glass' : 'prism-ring');
    if (crown && this.ready('glass-pulse', ring.periodSec, true)) {
      this.pulse(this.player, ring.pulseRadius, ring.pulseDamage, 'prism-ring', 'spark');
      this.emit('glass', this.player);
      this.effect('crown-of-glass', 'ring', this.player, { radius: this.area(ring.pulseRadius) });
    }
    this.orbit.length = 0;
    for (let i = 0; i < (ring.count ?? 0); i++) {
      const dir = vector(tau * (i / ring.count + this.elapsed / (ring.periodSec * (crown ? this.spellSpeed : 1))));
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
    const midnight = this.build.has('green-midnight');
    const bloom = this.rank(midnight ? 'green-midnight' : 'bog-bloom');
    if (bloom.tickDamage && this.tick >= (this.nextCast.get('bog-bloom') ?? 0)) {
      const target = this.target(bloom.range) ?? { x: this.player.x + this.facing.x * 70, y: this.player.y + this.facing.y * 70 };
      this.nextCast.set('bog-bloom', this.tick + ticks(bloom.intervalSec * this.spellSpeed));
      if (this.patches.length === 3) this.patches.shift();
      this.patches.push({ x: target.x, y: target.y, radius: bloom.radius * area, born: this.tick, until: this.tick + ticks(bloom.durationSec * duration), damage: bloom.tickDamage, spread: false });
      this.emit('bloom', target);
    }
    this.patches = this.patches.filter(patch => patch.until >= this.tick);
    for (const patch of this.patches) {
      for (const foe of this.neighbors(patch, patch.radius)) {
        if (foe.state === 'arrival' || distance(foe, patch) > patch.radius) continue;
        if (foe.poison < this.tick) {
          foe.poisonNext = this.tick + ticks(.5);
          foe.poisonDamage = patch.damage;
          if (midnight) {
            foe.chill = this.tick + ticks(bloom.chillSec * duration);
            foe.slow = bloom.moveSlow;
          }
        }
        foe.poisonDamage = Math.max(foe.poisonDamage, patch.damage);
        foe.poison = this.tick + ticks(Math.min(4, duration));
      }
    }
    for (const foe of this.foes) {
      if (foe.poison >= this.tick && this.tick >= foe.poisonNext) {
        foe.poisonNext += ticks(.5);
        this.hit(foe, foe.poisonDamage, 'bog-bloom');

      }
    }
  }

  private ready(id: string, seconds: number, delayFirst = false) {
    const due = this.nextCast.get(id);
    if (due === undefined && delayFirst) {
      this.nextCast.set(id, this.tick + ticks(seconds * this.spellSpeed));
      return false;
    }
    if (due !== undefined && this.tick < due) return false;
    this.nextCast.set(id, this.tick + ticks(Math.max(.25, seconds * this.spellSpeed)));
    return true;
  }

  private area(radius: number) { return radius * (this.rank('lantern-oil').areaMultiplier ?? 1); }

  private pulse(center: Point, radius: number, damage: number, source: string, bonus?: 'spark' | 'poison', push = 0) {
    radius = this.area(radius);
    for (const foe of this.neighbors(center, radius)) {
      if (foe.state === 'arrival' || foe.hp <= 0 || distance(center, foe) > radius) continue;
      const extra = bonus === 'spark' && foe.spark > this.tick ? 9 : 0;
      const scale = bonus === 'poison' && foe.poison > this.tick ? 1.35 : 1;
      this.hit(foe, damage * scale + extra, source);
      if (extra) foe.spark = 0;
      if (push && foe.def.role !== 'boss') {
        const dir = vector(heading(center, foe));
        const reach = foe.def.role === 'elite' ? push / 2 : push;
        this.translate(foe, dir.x * reach, dir.y * reach, foe.def.radius, false);
      }
    }
  }

  private castNormal(area: number) {
    const fox = this.rank(this.build.has('lantern-pack') ? 'lantern-pack' : 'foxfire');
    this.familiars.length = 0;
    if (fox.count) {
      const target = this.target(fox.range);
      for (let i = 0; i < fox.count; i++) {
        const angle = Math.atan2(this.facing.y, this.facing.x) + Math.PI + (i - (fox.count - 1) / 2) * .6;
        const dir = vector(angle);
        const p = { x: this.player.x + dir.x * 48, y: this.player.y + dir.y * 48 };
        this.familiars.push(p);
        if (!target || this.bolts.length >= rules.caps.projectiles ||
            !this.ready('fox-' + i, fox.intervalSec, i > 0)) continue;
        for (let j = i + 1; j < fox.count; j++) {
          if (!this.nextCast.has('fox-' + j)) this.nextCast.set('fox-' + j, this.tick + ticks(fox.intervalSec * this.spellSpeed * (j - i) / fox.count));
        }
        const aim = vector(heading(p, target));
        this.bolts.push({ ...p, vx: aim.x * fox.boltSpeed, vy: aim.y * fox.boltSpeed, left: fox.range,
          damage: fox.damage, pierce: 0, hits: [], source: 'foxfire', comet: false });
        this.emit('dart', p);
        this.effect(this.build.has('lantern-pack') ? 'lantern-pack' : 'foxfire', 'cast', p, { angle: heading(p, target) });
      }
    }
    const bell = this.rank('hex-bell');
    if (bell.damage && this.ready('hex-bell', bell.intervalSec)) {
      this.pulse(this.player, bell.radius, bell.damage, 'hex-bell', 'poison', bell.pushPx);
      this.emit('bell', this.player);
      this.effect('hex-bell', 'ring', this.player, { radius: this.area(bell.radius) });
    }
    const mirror = this.rank('mirror-ward');
    if (mirror.charges && this.guard < mirror.charges) {
      if (!this.guardNext) this.guardNext = this.tick + ticks(mirror.rechargeSec);
      if (this.tick >= this.guardNext) {
        this.guard++;
        this.guardNext = this.guard < mirror.charges ? this.tick + ticks(mirror.rechargeSec) : 0;
      }
    }
    const star = this.rank('starfall');
    if (star.damage && this.tick >= (this.nextCast.get('starfall') ?? 0)) {
      const candidate = [...this.neighbors(this.player, star.range)]
        .filter(foe => foe.hp > 0 && foe.state !== 'arrival' && distance(this.player, foe) <= star.range)
        .sort((a,b) => distance(this.player, a) - distance(this.player,b) || a.id - b.id).slice(0, 24);
      let best: Foe | undefined;
      let high = 0;
      const radius = star.radius * area;
      for (const foe of candidate) {
        let count = 0;
        for (const other of this.neighbors(foe, radius)) {
          if (other.hp > 0 && other.state !== 'arrival' && distance(foe, other) <= radius) count++;
        }
        if (count > high) { best = foe; high = count; }
      }
      if (best) {
        this.meteors.push({ x: best.x, y: best.y, radius, until: this.tick + ticks(star.delaySec), damage: star.damage });
        this.ready('starfall', star.intervalSec);
      }
    }
    this.meteors = this.meteors.filter(meteor => {
      if (meteor.until > this.tick) return true;
      for (const foe of this.neighbors(meteor, meteor.radius)) {
        if (distance(foe, meteor) <= meteor.radius) this.hit(foe, meteor.damage * (foe.spark > this.tick ? 1.25 : 1), 'starfall');
      }
      this.emit('meteor', meteor);
      this.effect('starfall', 'ring', meteor, { radius: meteor.radius });
      return false;
    });
  }

  private moveBolts() {
    for (const bolt of this.bolts) {
      const end = { x: bolt.x + bolt.vx * dt, y: bolt.y + bolt.vy * dt };
      const wall = solidHit(bolt, end, 3, this.arena);
      const hits: { foe: Foe; time: number }[] = [];
      for (const foe of this.neighbors(bolt, 70)) {
        if (foe.state === 'arrival' || foe.hp <= 0 || bolt.hits.includes(foe.id)) continue;
        const time = distance(bolt, foe) <= foe.def.radius + 4 ? 0 : segmentHit(bolt, end, foe, foe.def.radius + 4);
        if (time < wall && time <= 1) hits.push({ foe, time });
      }
      for (const { foe, time } of hits.sort((a, b) => a.time - b.time || a.foe.id - b.foe.id)) {
        const at = this.campaign ? { x: bolt.x + (end.x - bolt.x) * time, y: bolt.y + (end.y - bolt.y) * time } : foe;
        this.hit(foe, bolt.damage, bolt.source, at, this.campaign ? Math.atan2(bolt.vy, bolt.vx) : undefined);
        if (bolt.source === 'wick-dart') foe.spark = this.tick + ticks(3);
        bolt.hits.push(foe.id);
        const dart = this.rank('wick-dart');
        if (this.campaign && bolt.source === 'wick-dart' && !bolt.comet && dart.splashFraction) {
          const radius = this.area(dart.splashRadius + this.splashAdd);
          this.effect('wick-dart', 'ring', at, { radius });
          this.emit('splash', at);
          for (const other of this.neighbors(at, radius)) {
            if (other !== foe && distance(other, at) <= radius) this.hit(other, bolt.damage * dart.splashFraction, 'wick-dart');
          }
        }
        if (bolt.pierce-- > 0) continue;
        bolt.left = 0;
        if (bolt.comet) {
          const rank = this.rank('comet-thread');
          const radius = this.area(rank.splashRadius);
          this.effect('comet-thread', 'ring', at, { radius });
          for (const other of this.neighbors(at, radius)) {
            if (other !== foe && distance(other, at) <= radius) this.hit(other, rank.splashDamage, 'wick-dart');
          }
        }
        break;
      }
      if (wall !== Infinity) bolt.left = 0;
      bolt.left -= Math.hypot(bolt.vx, bolt.vy) * dt;
      bolt.x = end.x;
      bolt.y = end.y;
    }
    this.bolts = this.bolts.filter(bolt => bolt.left > 0);
  }

  protected drop(p: Point, kind: Loot['kind'], value: number, expires = Infinity) {
    this.loot.push({ x: p.x, y: p.y, value, kind, expires });
  }

  private spreadPoison(foe: Foe) {
    if (foe.poison < this.tick) return;
    const bloom = this.rank('green-midnight');
    if (!bloom.spreadRadius) return;
    const patch = this.patches.find(item => !item.spread && distance(item, foe) <= item.radius);
    if (!patch) return;
    patch.spread = true;
    const radius = bloom.spreadRadius * (this.rank('lantern-oil').areaMultiplier ?? 1);
    let spread = 0;
    for (const next of this.neighbors(foe, radius)) {
      if (next.hp <= 0 || next.state === 'arrival' || next.poison >= this.tick || distance(next, foe) > radius) continue;
      next.poisonDamage = foe.poisonDamage;
      next.poison = foe.poison;
      next.poisonNext = this.tick + ticks(.5);
      this.effect('green-midnight', 'spread', foe, { to: { x: next.x, y: next.y } });
      if (++spread === 3) break;
    }
  }

  private resolveDeaths() {
    for (const foe of this.foes) {
      if (foe.hp > 0) continue;
      if (this.death(foe)) continue;
      this.kills++;
      this.emit('kill', foe);
      this.spreadPoison(foe);
      if (foe.def.role === 'boss') {
        this.bossDefeated();
        continue;
      }
      if (foe.def.role === 'elite') this.eliteDefeated(foe);
      if (!this.campaign && foe.def.role === 'normal' && ++this.normalKills % 45 === 0 && !this.loot.some(item => item.kind === 'potion')) {
        this.drop(foe, 'potion', 18, this.tick + ticks(20));
      }
      let xp = foe.def.xp;
      if (this.normal && !this.campaign && foe.def.role === 'normal') {
        let multiplier = 1;
        for (const band of rules.normal.emberBands) {
          if (this.elapsed < band.atSec) break;
          multiplier = band.multiplier;
        }
        xp *= multiplier;
      }
      if (this.loot.length < rules.caps.xpPickups) this.drop(foe, 'ember', xp);
      else {
        const closest = this.loot.filter(item => item.kind === 'ember').reduce<Loot | undefined>((best, item) =>
          !best || distance(foe, item) < distance(foe, best) ? item : best, undefined);
        if (closest) closest.value += xp;
      }
    }
    this.foes = this.foes.filter(foe => foe.hp > 0);
  }

  protected bossDefeated() {}
  protected eliteDefeated(_foe: Foe) { void _foe; }
  protected objectives() {}

  protected gainXp(amount: number) {
    this.xpEarned += amount * this.xpMultiplier;
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
      if (gap < this.emberReach) {
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
    const ids = this.normal ? Array.from(skills.values()).filter(def => def.type !== 'evolution').map(def => def.id) : [...rules.slice.skillPool];
    const evolved = Array.from(this.build.keys(), id => skills.get(id)?.recipe?.active);
    const legal = ids.sort().filter(id => {
      const skill = skills.get(id)!;
      const rank = this.build.get(id) ?? 0;
      if (evolved.includes(id)) return false;
      if (rank) return rank < skill.maxRank;
      return count(skill.type) < (skill.type === 'active' ? rules.slots.active : rules.slots.passive);
    });
    const preserveDart = this.campaign && this.build.get('wick-dart') === 1;
    const pool = legal.filter(id => !excluded.includes(id) || preserveDart && id === 'wick-dart');
    const cards: string[] = [];
    const take = (id: string | undefined) => {
      if (!id) return;
      cards.push(id);
      pool.splice(pool.indexOf(id), 1);
    };
    const level = this.level - this.pendingLevels;
    if (!this.normal && level === 2 && !excluded.length) {
      take(pool.find(id => id === 'bog-bloom' || id === 'prism-ring'));
    }
    if (!this.normal && level >= 3) {
      take(pool.find(id => id === 'thread-lens' && !this.build.has(id)) ??
        pool.find(id => id === 'wick-dart') ??
        pool.find(id => id === 'thread-lens' && (this.build.get(id) ?? 0) < 2));
    }
    if (preserveDart) take(pool.find(id => id === 'wick-dart'));
    if (this.normal && level <= 5) {
      if (level > 2 && !cards.length) take(pool.find(id => this.build.has(id)));
      const fresh = pool.filter(id => !this.build.has(id) && (level > 2 || skills.get(id)?.type === 'active'));
      take(fresh[Math.floor(this.draftRng() * fresh.length)]);
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
    const before = this.rank(id);
    if (skill) this.build.set(id, (this.build.get(id) ?? 0) + 1);
    const after = this.rank(id);
    if (id === 'heart-husk') {
      const extra = after.maxHpBonus - (before.maxHpBonus ?? 0);
      this.player.maxHp += extra;
      this.player.hp += extra;
    }
    if (id === 'mirror-ward' && !before.charges) this.guard = after.charges;
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
