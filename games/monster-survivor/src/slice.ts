import { garden, orchard, rules, skills, waves } from './content.ts';
import { Run, angleDistance, distance, dt, heading, ticks, vector } from './sim.ts';
import type { Foe } from './sim.ts';

export const wardPoint = { x: orchard.point[0], y: orchard.point[1] };
const bossPatterns = {
  1: ['cleave', 'toll'],
  2: ['toll', 'cleave'],
} as const;

export class Slice extends Run {
  wardCharge = 0;
  wardComplete = false;
  wardLastInside = 0;
  catalysts = 0;
  boon: string | null = null;
  private pendingBoon = false;
  private bossBorn = false;
  private bossFell = false;
  private eliteBorn = false;
  private evolutionDeferred = '';

  get guards() { return this.guard; }

  protected override direct() {
    super.direct();
    const elite = waves.sliceElites[0];
    if (!this.eliteBorn && this.tick >= ticks(elite.atSec) && this.elapsed < rules.slice.waveEndSec) {
      const foe = this.spawn(elite.id, elite.hpOverride);
      if (foe) {
        this.eliteBorn = true;
        this.emit('elite', foe);
      }
    }
  }

  protected override eliteDefeated(foe: Foe) {
    this.drop(foe, 'chest', 1);
  }

  protected override bankCatalyst() {
    this.catalysts = Math.min(rules.slice.eliteCatalysts, this.catalysts + 1);
    this.emit('xp', this.player);
  }

  protected override objectives() {
    if (!this.wardComplete) {
      if (distance(this.player, wardPoint) <= orchard.radius) {
        this.wardLastInside = this.tick;
        this.wardCharge = Math.min(rules.slice.riteChargeSec, this.wardCharge + dt);
      } else if (this.tick - this.wardLastInside > ticks(5)) {
        this.wardCharge = Math.max(0, this.wardCharge - .5 * dt);
      }
      if (this.wardCharge + 1e-9 >= rules.slice.riteChargeSec) {
        this.wardComplete = true;
        this.pendingBoon = true;
        for (const foe of this.foes) {
          if (foe.def.role !== 'normal' || distance(foe, wardPoint) > 160) continue;
          this.knockFrom(foe);
        }
        this.gainXp(rules.xp.wardReward);
        this.emit('ward', wardPoint);
      }
    }
    if (!this.bossBorn && this.wardComplete && this.tick >= ticks(rules.slice.waveEndSec)) {
      this.foes = [];
      this.bolts = [];
      this.patches = [];
      const points = garden.bossSpawnCandidates.map(([x, y]) => ({ x, y }));
      const spot = points.find(point => distance(this.player, point) >= 220) ??
        points.reduce((best, point) => distance(this.player, point) > distance(this.player, best) ? point : best);
      this.spawn('warden', rules.slice.bossHp, spot);
      this.bossBorn = true;
      this.emit('boss-arrival', spot);
    }
  }

  private knockFrom(foe: Foe) {
    const dir = vector(heading(wardPoint, foe));
    const target = { x: foe.x + dir.x * 100, y: foe.y + dir.y * 100 };
    this.steer(foe, heading(foe, target), 6000, 0, 1e6);
    foe.vx = 0;
    foe.vy = 0;
  }

  protected override updateBoss(foe: Foe, range: number) {
    if (foe.phase === 1 && foe.hp <= foe.maxHp * .66) {
      foe.phase = 2;
      foe.state = 'recover';
      foe.until = this.tick + ticks(.8);
      foe.casts = 0;
      this.emit('boss-phase', foe);
    }
    if (foe.state === 'recover') {
      if (this.tick >= foe.until) foe.state = 'idle';
      return;
    }
    if (foe.state === 'idle') {
      if (range > 295) {
        this.steer(foe, heading(foe, this.player), foe.def.speed, range);
        return;
      }
      const patterns = bossPatterns[foe.phase === 1 ? 1 : 2];
      foe.attack = patterns[foe.casts % patterns.length];
      foe.casts++;
      foe.hit = false;
      const aim = heading(foe, this.player);
      foe.angle = foe.attack === 'cleave' ? aim : aim + (foe.casts % 2 ? .42 : -.42);
      foe.until = this.tick + ticks(foe.attack === 'cleave' ? .83 : 1.05);
      foe.state = 'windup';
      this.emit('telegraph', foe);
      return;
    }
    if (foe.state === 'windup') {
      if (this.tick < foe.until) return;
      foe.state = 'attack';
      foe.until = this.tick + ticks(foe.attack === 'cleave' ? .15 : 300 / 145);
      this.emit('bell', foe);
      if (foe.attack === 'cleave' && range <= 205 &&
          angleDistance(heading(foe, this.player), foe.angle) <= Math.PI * 100 / 360) this.hurt(19);
    }
    if (foe.attack === 'toll' && !foe.hit) {
      const radius = Math.max(40, 340 - (foe.until - this.tick) * 145 * dt);
      if (range >= radius - 26 && range <= radius &&
          angleDistance(heading(foe, this.player), foe.angle) > Math.PI * 52 / 360) {
        foe.hit = true;
        this.hurt(15);
      }
    }
    if (this.tick >= foe.until) {
      foe.state = 'recover';
      foe.until = this.tick + ticks(.85);
    }
  }

  protected override bossDefeated() {
    this.bossFell = true;
  }

  protected override resolveOutcome() {
    if (this.player.hp <= 0) this.result = 'hp';
    else if (this.bossFell) this.result = 'victory';
    else if (!this.wardComplete && this.tick >= ticks(rules.slice.riteDeadlineSec)) this.result = 'rite';
    else if (this.tick >= ticks(rules.slice.hardLimitSec)) this.result = 'time';
  }

  private eligible() {
    const id = rules.slice.evolutionPool[0];
    const recipe = skills.get(id)!.recipe!;
    const active = this.build.get(recipe.active) ?? 0;
    const passive = this.build.get(recipe.passive) ?? 0;
    const snapshot = `${active}:${passive}:${this.catalysts}`;
    if (active >= recipe.activeRank && passive >= recipe.passiveRank && this.catalysts >= recipe.catalysts &&
        this.evolutionDeferred !== snapshot) return { id, recipe, snapshot };
    return null;
  }

  protected override nextOffer() {
    if (this.offer) return;
    if (this.pendingBoon) {
      this.pendingBoon = false;
      this.show('boon', ['hearth', 'wind', 'gather']);
      return;
    }
    const evolution = this.eligible();
    if (evolution) {
      this.show('evolution', [evolution.id, 'later']);
      return;
    }
    super.nextOffer();
  }

  override choose(id: string) {
    if (!this.offer?.cards.includes(id)) return false;
    if (this.offer.kind === 'level') return super.choose(id);
    if (this.offer.kind === 'boon') {
      this.boon = id;
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
      const evolution = this.eligible();
      if (!evolution) return false;
      if (id === 'later') this.evolutionDeferred = evolution.snapshot;
      else {
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
