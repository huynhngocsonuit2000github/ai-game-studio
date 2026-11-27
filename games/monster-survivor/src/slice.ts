import { garden, orchard, rules, skills, waves } from './content.ts';
import { Run, angleDistance, distance, dt, heading, move, random, ticks, vector } from './sim.ts';
import type { Foe, Point } from './sim.ts';

export const wardPoint = { x: orchard.point[0], y: orchard.point[1] };
const boons = ['hearth', 'wind', 'gather'];
const bossPatterns = [
  ['cleave', 'toll'],
  ['toll', 'lanes', 'cleave'],
  ['lanes', 'cleave', 'toll'],
] as const;
const laneCenters = [-126, 0, 126];
export const laneHalfWidth = 26;
export const tollGap = Math.PI * 52 / 360;

export function bossLaneCenters(foe: Foe) {
  return laneCenters.map(offset => foe.laneOrigin + offset);
}
function laneCoord(foe: Foe, point: Point) {
  return foe.angle ? point.x - foe.x : point.y - foe.y;
}
export function inLanes(foe: Foe, point: Point) {
  return bossLaneCenters(foe).some(center => Math.abs(laneCoord(foe, point) - center) <= laneHalfWidth);
}
export function tollRings(foe: Foe, tick: number) {
  const radii: { radius: number; mask: number }[] = [];
  for (let i = 0; i < (foe.phase === 3 ? 2 : 1); i++) {
    const age = tick - foe.attackTick - i * ticks(.65);
    const radius = 40 + age * 145 * dt;
    if (age >= 0 && radius <= 341) radii.push({ radius: Math.min(340, radius), mask: 1 << i });
  }
  return radii;
}

const wardFor = (ward: (typeof garden.wards)[number]) => ({
  id: ward.id, name: ward.name, radius: ward.radius, x: ward.point[0], y: ward.point[1], charge: 0, insideAt: 0, lit: false,
});
type Ward = ReturnType<typeof wardFor>;

export class GardenRun extends Run {
  wardComplete = false;
  catalysts = 0;
  boons = new Set<string>();
  readonly wards: Ward[];
  readonly settings: typeof rules.normal | typeof rules.slice;
  private pendingBoon: Ward | null = null;
  lastWard: Ward | null = null;
  private bossBorn = false;
  private bossFell = false;
  private eliteBorn = new Set<string>();
  private evolutionDeferred = '';
  private bossRng: () => number;

  constructor(seed: number, normal = true) {
    super(seed, normal);
    this.settings = normal ? rules.normal : rules.slice;
    this.wards = (normal ? garden.wards : [orchard]).map(wardFor);
    this.bossRng = random(seed ^ 607183);
  }

  get guards() { return this.guard; }
  get wardCharge() { return this.wards[0].charge; }
  get rites() { return this.wards.filter(ward => ward.lit).length; }
  get overrun() { return this.normal && this.elapsed >= this.settings.waveEndSec && !this.wardComplete; }

  get nearestWard() {
    if (this.wardComplete) return null;
    return this.wards.filter(ward => !ward.lit).reduce<Ward | null>((best, ward) =>
      !best || distance(ward, this.player) < distance(best, this.player) ? ward : best, null);
  }

  protected override direct() {
    if (this.bossBorn) return;
    super.direct();
    if (this.overrun && this.elapsed < this.settings.riteDeadlineSec) this.spawnBand(waves.overrun);
    for (const elite of this.normal ? waves.elites : waves.sliceElites) {
      if (this.eliteBorn.has(elite.id) || this.tick < ticks(elite.atSec) || this.elapsed >= this.settings.waveEndSec) continue;
      const foe = this.spawn(elite.id, 'hpOverride' in elite ? elite.hpOverride as number : undefined);
      if (!foe) continue;
      this.eliteBorn.add(elite.id);
      this.emit('elite', foe);
    }
  }

  protected override eliteDefeated(foe: Foe) { this.drop(foe, 'chest', 1); }

  protected override bankCatalyst() {
    this.catalysts = Math.min(this.normal ? waves.elites.length : rules.slice.eliteCatalysts, this.catalysts + 1);
    this.emit('xp', this.player);
  }

  protected override objectives() {
    if (!this.wardComplete) {
      const nearest = this.nearestWard;
      for (const ward of this.wards) {
        if (ward.lit) continue;
        if (ward === nearest && distance(this.player, ward) <= ward.radius) {
          ward.insideAt = this.tick;
          ward.charge = Math.min(this.settings.riteChargeSec, ward.charge + dt);
        } else if (this.tick - ward.insideAt > ticks(5)) {
          ward.charge = Math.max(0, ward.charge - .5 * dt);
        }
        if (ward.charge + 1e-9 >= this.settings.riteChargeSec) {
          this.completeWard(ward);
          break;
        }
      }
    }
    if (!this.bossBorn && this.wardComplete && this.tick >= ticks(this.settings.waveEndSec)) {
      this.foes = [];
      this.bolts = [];
      this.patches = [];
      this.shots = [];
      this.meteors = [];
      const points = garden.bossSpawnCandidates.map(([x, y]) => ({ x, y }));
      const spot = points.find(point => distance(this.player, point) >= 220) ??
        points.reduce((best, point) => distance(this.player, point) > distance(this.player, best) ? point : best);
      this.spawn('warden', this.settings.bossHp, spot);
      this.bossBorn = true;
      this.emit('boss-arrival', spot);
    }
  }

  private completeWard(ward: Ward) {
    ward.lit = true;
    this.wardComplete = this.rites >= this.settings.ritesRequired;
    this.pendingBoon = ward;
    for (const foe of this.foes) {
      if (foe.def.role !== 'normal' || distance(foe, ward) > 160) continue;
      const direction = vector(heading(ward, foe));
      move(foe, direction.x * 100, direction.y * 100, foe.def.radius, false);
      foe.vx = 0;
      foe.vy = 0;
    }
    this.purgeShots(ward, 160);
    this.gainXp(rules.xp.wardReward);
    this.emit('ward', ward);
  }

  private walkable(target: Point, reach: number) {
    const current = { ...this.player };
    if (distance(current, target) > reach) return false;
    return !move(current, target.x - current.x, target.y - current.y, rules.player.radius, false);
  }

  private tollAngle(foe: Foe) {
    const aim = heading(foe, this.player);
    const radius = Math.max(65, Math.min(300, distance(foe, this.player)));
    const side = this.bossRng() < .5 ? 1 : -1;
    for (const offset of [.7 * side, -.7 * side, .3 * side, -.3 * side, 0]) {
      const angle = aim + offset;
      const dir = vector(angle);
      if (this.walkable({ x: foe.x + dir.x * radius, y: foe.y + dir.y * radius }, 140)) return angle;
    }
    return aim;
  }

  private lanes(foe: Foe) {
    const axis = this.bossRng() < .5 ? 0 : 1;
    for (const [direction, offset] of [[axis, 0], [axis, 32], [1 - axis, 0], [1 - axis, 32]]) {
      foe.angle = direction;
      foe.laneOrigin = offset;
      const coordinate = laneCoord(foe, this.player);
      for (const step of [0, 38, -38, 68, -68, 96, -96]) {
        const target = { x: this.player.x + (direction ? step : 0), y: this.player.y + (direction ? 0 : step) };
        if (!bossLaneCenters(foe).some(center => Math.abs(coordinate + step - center) < 32) && this.walkable(target, 100)) return;
      }
    }
    foe.laneOrigin = laneCoord(foe, this.player) + 63;
  }

  private advancePhase(foe: Foe) {
    const phase = this.normal && foe.hp <= foe.maxHp * .33 ? 3 : foe.hp <= foe.maxHp * .66 ? 2 : 1;
    if (phase <= foe.phase) return;
    foe.phase = phase;
    foe.state = 'recover';
    foe.until = this.tick + ticks(.8);
    foe.casts = 0;
    this.emit('boss-phase', foe);
    if (!this.normal) return;
    const id = phase === 3 ? 'moth' : 'seedling';
    for (let i = 0; i < 2; i++) this.spawn(id);
  }

  protected override updateBoss(foe: Foe, range: number) {
    this.advancePhase(foe);
    if (foe.state === 'recover') {
      if (this.tick >= foe.until) foe.state = 'idle';
      return;
    }
    if (foe.state === 'idle') {
      if (range > 295) {
        this.steer(foe, heading(foe, this.player), foe.def.speed, range);
        return;
      }
      const patterns = !this.normal && foe.phase === 2 ? ['toll', 'cleave'] as const : bossPatterns[foe.phase - 1];
      foe.attack = patterns[foe.casts % patterns.length];
      foe.casts++;
      foe.hit = false;
      foe.hitRings = 0;
      const aim = heading(foe, this.player);
      foe.angle = foe.attack === 'toll' ? this.normal ? this.tollAngle(foe) : aim + (foe.casts % 2 ? .42 : -.42) : aim;
      if (foe.attack === 'lanes') this.lanes(foe);
      foe.until = this.tick + ticks(foe.attack === 'cleave' ? .83 : foe.attack === 'lanes' ? 1.1 : 1.05);
      foe.state = 'windup';
      this.emit('telegraph', foe);
      return;
    }
    if (foe.state === 'windup') {
      if (this.tick < foe.until) return;
      foe.state = 'attack';
      foe.attackTick = this.tick;
      const duration = foe.attack === 'cleave' ? .15 : foe.attack === 'lanes' ? .4 : 300 / 145 + (foe.phase === 3 ? .65 : 0);
      foe.until = this.tick + ticks(duration);
      this.emit('bell', foe);
      if (foe.attack === 'cleave' && range <= 205 &&
          angleDistance(heading(foe, this.player), foe.angle) <= Math.PI * 100 / 360) this.hurt(19, 'warden-cleave');
    }
    if (foe.attack === 'lanes' && !foe.hit && inLanes(foe, this.player)) {
      foe.hit = true;
      this.hurt(17, 'warden-lanes');
    }
    if (foe.attack === 'toll' && angleDistance(heading(foe, this.player), foe.angle) > tollGap) {
      for (const ring of tollRings(foe, this.tick)) {
        if (foe.hitRings & ring.mask || range < ring.radius - 26 || range > ring.radius) continue;
        foe.hitRings |= ring.mask;
        this.hurt(15, 'warden-toll');
      }
    }
    if (this.tick >= foe.until) {
      foe.state = 'recover';
      const recovery = foe.phase === 3 ? .6 : .85;
      foe.until = this.tick + ticks(recovery * (this.normal && this.elapsed >= rules.normal.enrageSec ? .85 : 1));
    }
  }

  protected override bossDefeated() { this.bossFell = true; }

  protected override resolveOutcome() {
    if (this.player.hp <= 0) this.result = 'hp';
    else if (this.bossFell) this.result = 'victory';
    else if (!this.wardComplete && this.tick >= ticks(this.settings.riteDeadlineSec)) this.result = 'rite';
    else if (this.tick >= ticks(this.settings.hardLimitSec)) this.result = 'time';
  }

  private eligible() {
    const available = [...skills.values()].flatMap(({ id, recipe }) => {
      if (!recipe || (!this.normal && !rules.slice.evolutionPool.includes(id))) return [];
      const active = this.build.get(recipe.active) ?? 0;
      const passive = this.build.get(recipe.passive) ?? 0;
      return active >= recipe.activeRank && passive >= recipe.passiveRank && this.catalysts >= recipe.catalysts
        ? [{ id, recipe, active, passive }] : [];
    });
    const snapshot = `${this.catalysts}:${available.map(item => `${item.id}:${item.active}:${item.passive}`).join('/')}`;
    return { available: this.evolutionDeferred === snapshot ? [] : available, snapshot };
  }

  protected override nextOffer() {
    if (this.offer) return;
    if (this.pendingBoon) {
      this.lastWard = this.pendingBoon;
      this.pendingBoon = null;
      this.show('boon', boons.filter(boon => !this.boons.has(boon)));
      return;
    }
    const { available } = this.eligible();
    if (available.length) {
      this.show('evolution', [...available.map(item => item.id), 'later']);
      return;
    }
    super.nextOffer();
  }

  override choose(id: string) {
    if (!this.offer?.cards.includes(id)) return false;
    if (this.offer.kind === 'level') return super.choose(id);
    if (this.offer.kind === 'boon') {
      this.boons.add(id);
      if (id === 'hearth') {
        this.player.maxHp += 10;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 34);
      } else if (id === 'wind') {
        this.movementBonus += .08;
        this.cooldownBonus += .45;
      } else {
        this.pickupBonus += 55;
        this.xpMultiplier += .1;
      }
    } else {
      const { available, snapshot } = this.eligible();
      if (id === 'later' && available.length) this.evolutionDeferred = snapshot;
      else {
        const evolution = available.find(item => item.id === id);
        if (!evolution) return false;
        this.catalysts -= evolution.recipe.catalysts;
        this.build = new Map([...this.build].map(([skill, rank]) => skill === evolution.recipe.active
          ? [evolution.id, 1] : [skill, rank]));
      }
    }
    this.offer = null;
    this.emit('select');
    this.nextOffer();
    return true;
  }
}

// Historical S03 simulation fixture. The production entry starts Normal.
export class Slice extends GardenRun {
  constructor(seed: number) { super(seed, false); }
}
