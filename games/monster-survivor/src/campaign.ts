import { enemies, rules } from './content.ts';
import { campaignHash, gear, items, layouts, point, safetyTimeout } from './campaign-content.ts';
import type { Pack, Stage, Stats } from './campaign-content.ts';
import { GardenRun } from './slice.ts';
import { distance, dt, heading, outsideSolids, random, solidHit, ticks, vector } from './sim.ts';
import type { Foe, Input, Point } from './sim.ts';

type Group = Point & {
  key: string; objective: string; label: string; kind: 'patrol' | 'nest' | 'defense' | 'leader';
  pack?: Pack; enemy?: string; health?: number; waves?: Pack[]; waveDelay?: number; hazardDelay?: number;
  state: 'waiting' | 'active' | 'done'; ids: Set<number>; wave: number; next: number;
};
type DropKind = 'gold' | 'gear' | 'heart' | 'magnet' | 'power-charm';
export type CampaignDrop = Point & { kind: DropKind; gold: number; item?: string; born: number };
type Poison = Point & { radius: number; due: number; expires: number };

const economy = gear.earnedGold;
const balance = gear.combat;
const activation = 190;
const interactReach = 57;
const nestDef = { ...enemies.get('seedling')!, radius: 24 };

export class CampaignRun extends GardenRun {
  override readonly campaign = true;
  readonly stage: Stage;
  readonly kit: Stats;
  readonly weapon: string | undefined;
  readonly weaponRank: number;
  readonly layout;
  private readonly owned: ReadonlySet<string>;
  readonly groups: Group[] = [];
  readonly chests;
  readonly exit;
  readonly pending = { gold: 0, gear: [] as string[] };
  drops: CampaignDrop[] = [];
  pools: Poison[] = [];
  charge = balance.lanternBurst.chargeInitial;
  lantern?: Point & { hp: number; maxHp: number };
  lanternLost = false;
  goldDropped = 0;
  private localRng: () => number;
  private firstGroup = false;
  private ambientAt = ticks(17);
  private magnetUntil = 0;
  private powerUntil = 0;
  private slowUntil = 0;
  private burstKills = new Set<number>();
  private nests = new Set<number>();
  private keepers = new Set<number>();
  private defenseAttack = new Map<number, number>();
  private cleared = new Set<string>();
  private objectiveIndex = 0;
  private nextBoostAt = 15;

  constructor(
    stage: Stage, seed: number, kit: Stats,
    weapon: string | undefined, weaponRank: number, owned: ReadonlySet<string>,
  ) {
    super(seed ^ campaignHash(stage.id));
    this.stage = stage;
    this.kit = kit;
    this.weapon = weapon;
    this.weaponRank = weaponRank;
    this.owned = owned;
    this.layout = layouts[stage.id];
    this.arena = {
      width: stage.size[0], height: stage.size[1],
      blockers: this.layout.props.map(([x, y, r, sprite]) => ({ x, y, r, sprite })),
    };
    this.localRng = random(this.seed ^ 346079);
    this.exit = point(stage.exit);
    this.chests = stage.chests.map(chest => ({ ...chest, ...point(chest.at), open: false }));
    Object.assign(this.player, point(stage.start));
    this.player.maxHp += kit.maxHpAdd;
    this.player.hp = this.player.maxHp;
    this.movementBonus = kit.moveSpeedPercent / 100;
    this.speedCap = balance.caps.moveSpeedPercent / 100;
    this.cooldownBonus = kit.dashCooldownReductionSec;
    this.pickupBonus = kit.pickupRadiusAddPx;
    this.spellSpeed = 1 - kit.spellCooldownReductionPercent / 100;
    this.mainDamage = kit.flatMainDamage;
    this.splashAdd = kit.splashRadiusAddPx;
    const add = (objective: string, anchor: number[], label: string, detail: Pick<Group, 'kind' | 'pack' | 'enemy' | 'health' | 'waves' | 'waveDelay' | 'hazardDelay'>) => {
      this.groups.push({ ...point(anchor), ...detail, objective, key: objective + '-' + this.groups.length,
        label, state: 'waiting', ids: new Set(), wave: 0, next: 0 });
    };
    for (const objective of stage.objectives) {
      switch (objective.kind) {
        case 'clear-patrols':
          objective.anchors.forEach((anchor, index) => add(objective.id, anchor, 'Patrol ' + (index + 1), { kind: 'patrol', pack: objective.packs[index] }));
          break;
        case 'destroy-nests':
          objective.anchors.forEach((anchor, index) => add(objective.id, anchor, 'Venom Nest ' + (index + 1),
            { kind: 'nest', pack: objective.guard, health: objective.hp, hazardDelay: objective.hazardSec }));
          break;
        case 'defend-lantern':
          add(objective.id, objective.anchor, 'Defend the lantern', { kind: 'defense', health: objective.lanternHp,
            waves: objective.waves, waveDelay: objective.nextWaveAfterClearSec });
          break;
        case 'hunt-elites':
        case 'defeat-arena-leader':
          for (const hunt of objective.kind === 'hunt-elites' ? objective.hunts : [objective]) {
            const def = enemies.get(hunt.enemy)!;
            add(objective.id, hunt.anchor, hunt.enemy === 'bottle' ? 'Marsh Keeper' : def.name,
              { kind: 'leader', enemy: hunt.enemy, health: Math.round(def.hp * hunt.hpScale), pack: hunt.adds });
          }
          break;
      }
    }
  }

  override get xpGoal() {
    const n = this.level - 1;
    return n === 0 ? 10 : 13 + 3 * n + Math.floor(.13 * n * n);
  }

  override skillRank(id: string, rank: number) {
    const data = super.skillRank(id, rank);
    if (id !== 'wick-dart' || !rank) return data;
    const starter = balance.starterWickDart;
    const splash = balance.wickDartRankTwo;
    return rank === 1 ? { ...data, damage: starter.damage, intervalSec: starter.intervalSec } :
      { ...data, damage: rank === 2 ? splash.damage : Math.max(25, data.damage), intervalSec: Math.min(starter.intervalSec, data.intervalSec),
        splashRadius: splash.splashRadiusPx, splashFraction: splash.splashFraction };
  }

  isNest(foe: Foe) { return this.nests.has(foe.id); }

  get burstReady() { return this.charge >= balance.lanternBurst.chargeMax; }
  get burstRadius() { return balance.lanternBurst.radiusPx + this.kit.burstRadiusAddPx; }
  get exitOpen() { return this.objectiveIndex >= this.stage.objectives.length; }
  get activeObjective() { return this.stage.objectives[this.objectiveIndex]?.id; }
  get activeGroups() { return this.groups.filter(group => group.objective === this.activeObjective); }
  get objectivePoint() {
    return this.exitOpen ? this.exit : this.activeGroups.filter(group => group.state !== 'done')
      .reduce<Group | undefined>((best, group) => !best || distance(group, this.player) < distance(best, this.player) ? group : best, undefined);
  }
  get objectiveText() {
    if (this.exitOpen) return 'Reach the exit and confirm';
    const groups = this.activeGroups;
    if (this.lantern && groups[0].kind === 'defense') {
      const { wave, waves, next } = groups[0];
      const countdown = next > this.tick ? ' · Next in ' + Math.ceil((next - this.tick) * dt) + ' s' : '';
      return `Wave ${wave}/${waves!.length} · ${Math.ceil(this.lantern.hp)} HP${countdown}`;
    }
    return `${groups.filter(group => group.state === 'done').length}/${groups.length} · ${groups.some(group => group.state === 'active') ? 'Fight' : 'Approach'}`;
  }
  get canInteract() {
    if (this.exitOpen && this.reachable(this.exit)) return 'Exit';
    return this.chests.some(chest => this.chestReady(chest) && this.reachable(chest)) ? 'Open chest' : '';
  }
  chestReady(chest: typeof this.chests[number]) { return !chest.open && (!chest.after || this.cleared.has(chest.after)); }

  protected override movementScale() {
    return this.tick < this.slowUntil ? 1 - .32 * (1 - this.kit.slowReductionPercent / 100) : 1;
  }

  protected override hurt(amount: number, source = 'hazard') {
    const reduction = source === 'bog-brewer-shot' ? this.kit.projectileReductionPercent :
      enemies.has(source) ? this.kit.contactReductionPercent : 0;
    const scale = this.stage.order === 1 ? .72 : this.stage.order === 2 ? .79 : .87;
    super.hurt(Math.max(1, Math.round(amount * scale * (1 - reduction / 100))), source);
  }

  protected override hit(foe: Foe, amount: number, source: string, at?: Point, angle?: number) {
    super.hit(foe, amount * (this.tick < this.powerUntil ? 1.18 : 1), source, at, angle);
  }

  private reachable(at: Point) {
    return distance(at, this.player) <= interactReach && solidHit(this.player, at, 0, this.arena) === Infinity;
  }

  private findSpawn(at: Point, radius: number, minimum: number, reach: number) {
    for (let i = 0; i < 36; i++) {
      const angle = this.localRng() * Math.PI * 2;
      const direction = vector(angle);
      const gap = reach * (.62 + this.localRng() * .38);
      const margin = 40 + radius;
      const candidate = {
        x: Math.min(this.arena.width - margin, Math.max(margin, at.x + direction.x * gap)),
        y: Math.min(this.arena.height - margin, Math.max(margin, at.y + direction.y * gap)),
      };
      if (distance(candidate, this.player) >= minimum && outsideSolids(candidate, radius, this.arena)) return candidate;
    }
    return undefined;
  }

  private spawnPack(at: Point, pack: Pack, minimum: number, reach: number, group?: Group) {
    for (const [id, count] of Object.entries(pack)) {
      const def = enemies.get(id)!;
      for (let index = 0; index < count; index++) {
        const spot = this.findSpawn(at, def.radius, minimum, reach);
        if (!spot) continue;
        const hp = id === 'seedling' ? [20, 29, 31, 35, 38][this.stage.order - 1]
          : id === 'moth' && this.stage.order === 2 ? 30 : def.hp;
        const foe = this.spawn(id, hp, spot);
        if (foe && group) group.ids.add(foe.id);
      }
    }
  }

  private activate(group: Group) {
    group.state = 'active';
    if (group.kind === 'defense') {
      this.lantern = { x: group.x, y: group.y, hp: group.health!, maxHp: group.health! };
      group.next = this.tick;
    }
    if (group.pack) this.spawnPack(group, group.pack, 115, group.kind === 'leader' ? 175 : 145, group.kind === 'patrol' ? group : undefined);
    if (group.kind === 'nest' || group.kind === 'leader') {
      const foe = this.spawn(group.enemy ?? 'seedling', group.health, group)!;
      group.ids.add(foe.id);
      if (group.kind === 'nest') {
        foe.def = nestDef;
        this.nests.add(foe.id);
        group.next = this.tick + ticks(2);
      } else if (group.enemy === 'bottle') {
        foe.def = { ...foe.def, name: 'Marsh Keeper', role: 'elite', radius: 24 };
        foe.state = 'arrival';
        foe.until = this.tick + ticks(1);
        this.keepers.add(foe.id);
      }
      if (group.kind === 'leader') this.emit(group.enemy === 'warden' ? 'boss-arrival' : 'elite', foe);
    }
  }

  private poison(at: Point, radius: number, delay: number) {
    const due = this.tick + ticks(delay);
    if (this.pools.length >= 6) this.pools.shift();
    this.pools.push({ ...at, radius, due, expires: due + ticks(3.8) });
    this.emit('telegraph', at);
  }

  protected override direct() {
    if (!this.firstGroup) {
      this.firstGroup = true;
      const start = { x: this.player.x + 198, y: this.player.y };
      this.spawnPack(start, { seedling: 8 }, 128, 90);
    }
    const alive = this.foes.filter(foe => foe.def.role === 'normal').length;
    const current = this.stage.objectives[this.objectiveIndex];
    const ambientCap = current?.kind === 'clear-patrols' ? current.ambientNormalCap : 15;
    if (!this.exitOpen && !this.boss && !this.activeGroups.some(group => group.kind === 'leader' && group.state === 'active') &&
        this.tick >= this.ambientAt && alive < ambientCap) {
      this.ambientAt = this.tick + ticks(this.stage.order === 1 ? 8 : 6);
      const foe = this.stage.order > 1 && this.localRng() < .55 ? 'moth' : 'seedling';
      this.spawnPack(this.player, { [foe]: Math.min(5, ambientCap - alive) }, 225, 350);
    }
    for (const group of this.activeGroups) {
      if (group.state === 'waiting' && distance(this.player, group) <= activation) this.activate(group);
      if (group.state !== 'active') continue;
      if (group.kind === 'nest' && this.tick >= group.next && distance(this.player, group) < 270) {
        group.next = this.tick + ticks(5);
        this.poison({ x: this.player.x + this.facing.x * 30, y: this.player.y + this.facing.y * 30 }, 57, group.hazardDelay!);
      }
      if (group.kind === 'defense' && !group.ids.size && group.wave < group.waves!.length && this.tick >= group.next) {
        this.spawnPack(group, group.waves![group.wave], 145, 275, group);
        group.wave++;
      }
    }
    this.pools = this.pools.filter(pool => pool.expires > this.tick);
  }

  protected override foeAction(foe: Foe) {
    if (this.nests.has(foe.id)) return true;
    if (this.keepers.has(foe.id)) {
      const def = foe.def.behavior;
      const range = distance(foe, this.player);
      if (foe.state === 'windup' && this.tick >= foe.until) {
        foe.state = 'recover';
        foe.until = this.tick + ticks(2.25);
        for (const offset of [-.24, 0, .24]) {
          if (this.shots.length >= rules.caps.hostileShots) break;
          const dir = vector(foe.angle + offset);
          this.shots.push({ x: foe.x, y: foe.y, vx: dir.x * 145, vy: dir.y * 145, damage: 13, until: this.tick + ticks(3) });
        }
        const direction = vector(foe.angle);
        for (const ahead of [10, 112]) this.poison({ x: this.player.x + this.facing.x * ahead - direction.y * ahead / 3,
          y: this.player.y + this.facing.y * ahead + direction.x * ahead / 3 }, 52, 1.2);
      } else if (foe.state === 'recover' && this.tick >= foe.until) foe.state = 'idle';
      else if (foe.state === 'idle' && range > 260) this.steer(foe, heading(foe, this.player), foe.def.speed, range);
      else if (foe.state === 'idle') {
        foe.angle = heading(foe, this.player);
        foe.state = 'windup';
        foe.until = this.tick + ticks(def.telegraph! + .25);
        this.emit('telegraph', foe);
      }
      if (range < foe.def.radius + rules.player.radius) this.hurt(14, 'bottle');
      return true;
    }
    const defense = this.activeGroups.find(group => group.kind === 'defense' && group.ids.has(foe.id));
    if (!defense || !this.lantern) return false;
    const gap = distance(foe, this.lantern);
    if (gap > foe.def.radius + 20) this.steer(foe, heading(foe, this.lantern), foe.def.speed * .86, gap);
    else if (this.tick >= (this.defenseAttack.get(foe.id) ?? 0)) {
      this.lantern.hp = Math.max(0, this.lantern.hp - (foe.def.contactDamage > 10 ? 4 : 2));
      this.defenseAttack.set(foe.id, this.tick + ticks(1.25));
      this.emit('hurt', this.lantern);
    }
    if (distance(foe, this.player) <= foe.def.radius + rules.player.radius) this.hurt(foe.def.contactDamage, foe.def.id);
    return true;
  }

  protected override action(input: Input) {
    for (const pool of this.pools) {
      if (pool.due > this.tick || distance(this.player, pool) > pool.radius) continue;
      this.hurt(10, 'venom-pool');
      this.slowUntil = this.tick + ticks(.45);
    }
    if (this.player.hp <= 0 || this.lantern?.hp === 0 || this.tick >= ticks(safetyTimeout)) return;
    if (input.burst && this.burstReady) {
      const burst = balance.lanternBurst;
      this.charge = 0;
      this.effect('lantern-burst', 'ring', this.player, { radius: this.burstRadius });
      this.emit('lantern-burst', this.player);
      for (const foe of this.neighbors(this.player, this.burstRadius)) {
        if (distance(this.player, foe) > this.burstRadius) continue;
        const alive = foe.hp > 0;
        const scale = foe.def.role === 'boss' ? burst.bossDamageMultiplier : foe.def.role === 'elite' ? burst.eliteDamageMultiplier : 1;
        this.hit(foe, (burst.damage + this.kit.burstDamageAdd) * scale, 'lantern-burst');
        if (alive && foe.hp <= 0) this.burstKills.add(foe.id);
      }
    }
    if (!input.interact) return;
    if (this.exitOpen && this.reachable(this.exit)) {
      this.result = 'victory';
      return;
    }
    const chest = this.chests.find(candidate => this.chestReady(candidate) && this.reachable(candidate));
    if (!chest) return;
    chest.open = true;
    this.dropGear(chest, gear.chests.pools[chest.pool], chest.id);
    this.addDrop({ x: chest.x + 18, y: chest.y, kind: 'gold', gold: economy.chestBonusGold, born: this.tick });
    this.emit('select', chest);
  }

  private dropGear(at: Point, pool: string[], source: string) {
    const existing = new Set([...this.owned, ...this.pending.gear]);
    const sorted = [...pool].sort();
    const unseen = sorted.filter(id => !existing.has(id));
    const options = unseen.length ? unseen : sorted;
    const roll = random(this.seed ^ campaignHash(source));
    const item = options[Math.floor(roll() * options.length)];
    this.addDrop({ ...at, kind: 'gear', item, gold: 0, born: this.tick });
  }

  private addDrop(drop: CampaignDrop) {
    if (drop.kind === 'gold') {
      const coins = this.drops.filter(item => item.kind === 'gold');
      const nearby = coins.find(item => distance(item, drop) < 31);
      const merge = nearby ?? (coins.length >= 22 ? coins.reduce((a, b) => distance(a, drop) < distance(b, drop) ? a : b) : undefined);
      if (merge) { merge.gold += drop.gold; return; }
    } else if (drop.kind !== 'gear' && this.drops.filter(item => item.kind === drop.kind).length >= 3) return;
    this.drops.push(drop);
  }

  protected override death(foe: Foe) {
    if (this.nests.delete(foe.id)) {
      this.groups.find(group => group.ids.has(foe.id))?.ids.delete(foe.id);
      this.gainXp(12);
      this.emit('ward', foe);
      return true;
    }
    this.defenseAttack.delete(foe.id);
    const tracked = this.groups.find(group => group.ids.has(foe.id));
    if (tracked) {
      tracked.ids.delete(foe.id);
      if (tracked.kind === 'defense' && !tracked.ids.size) tracked.next = this.tick + ticks(tracked.waveDelay!);
    }
    const leader = foe.def.role !== 'normal';
    const drop = Math.min(leader ? economy.eliteKill : economy.normalKill, this.stage.enemyGoldCap - this.goldDropped);
    if (drop > 0) {
      this.goldDropped += drop;
      this.addDrop({ x: foe.x, y: foe.y, kind: 'gold', gold: drop, born: this.tick });
    }
    if (!this.burstKills.delete(foe.id)) {
      const burst = balance.lanternBurst;
      this.charge = Math.min(burst.chargeMax, this.charge + (leader ? burst.eliteKillCharge : burst.normalKillCharge));
    }
    if (leader) {
      const pool = gear.chests.pools[this.stage.chests[0].pool];
      this.dropGear({ x: foe.x - 16, y: foe.y }, pool, tracked?.key ?? foe.def.id);
      if (foe.def.role === 'boss') this.drop(foe, 'chest', 1);
      this.keepers.delete(foe.id);
    } else if (this.kills >= this.nextBoostAt) {
      const booster = (['heart', 'magnet', 'power-charm'] as const)[Math.floor(this.nextBoostAt / 15 - 1) % 3];
      this.addDrop({ x: foe.x + 12, y: foe.y, kind: booster, gold: 0, born: this.tick });
      this.nextBoostAt += 15;
    }
    return false;
  }

  protected override objectives() {
    this.drops = this.drops.filter(drop => {
      const gap = distance(drop, this.player);
      if (drop.kind === 'gold') {
        if (gap < 18) {
          this.pending.gold += drop.gold;
          this.emit('xp', drop);
          return false;
        }
        const reach = this.tick < this.magnetUntil ? 220 : Math.min(balance.caps.pickupRadiusPx, economy.pickupRadiusPx + this.kit.pickupRadiusAddPx);
        if (gap <= reach && solidHit(drop, this.player, 0, this.arena) === Infinity) {
          const direction = vector(heading(drop, this.player));
          drop.x += direction.x * 360 * dt;
          drop.y += direction.y * 360 * dt;
        }
        return true;
      }
      if (gap >= 25 || this.tick - drop.born < ticks(.22)) return true;
      if (drop.kind === 'gear') {
        this.pending.gear.push(drop.item!);
        this.emit('loot:' + items.get(drop.item!)!.name, drop);
      } else if (drop.kind === 'heart') {
        if (this.player.hp >= this.player.maxHp) return true;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
        this.emit('loot:Heart · +20 HP max', drop);
      } else if (drop.kind === 'magnet') {
        this.magnetUntil = this.tick + ticks(2);
        this.emit('loot:Magnet · 2 s', drop);
      } else {
        this.powerUntil = this.tick + ticks(12);
        this.emit('loot:Power Charm · +18% damage', drop);
      }
      return false;
    });
    const groups = this.activeGroups;
    if (!groups.length || this.lantern?.hp === 0 && groups[0].kind === 'defense') return;
    for (const group of groups) {
      if (group.state !== 'active') continue;
      if (group.ids.size || group.kind === 'defense' && group.wave < group.waves!.length) continue;
      group.state = 'done';
      this.gainXp(5);
    }
    if (groups.every(group => group.state === 'done')) {
      this.cleared.add(this.activeObjective!);
      this.objectiveIndex++;
      if (this.exitOpen) this.emit('exit-open', this.exit);
    }
  }

  override get emberReach() { return this.tick < this.magnetUntil ? 220 : super.emberReach; }

  protected override resolveOutcome() {
    if (this.result) return;
    if (this.player.hp <= 0) this.result = 'hp';
    else if (this.lantern?.hp === 0 && this.activeGroups.some(group => group.kind === 'defense')) {
      this.lanternLost = true;
      this.result = 'rite';
    } else if (this.tick >= ticks(safetyTimeout)) this.result = 'time';
  }
}
