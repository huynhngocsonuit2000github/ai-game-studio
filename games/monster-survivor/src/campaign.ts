import { enemies, rules } from './content.ts';
import { campaignHash, gear, items, layouts, point } from './campaign-content.ts';
import type { Stage, Stats } from './campaign-content.ts';
import type { Encounter, Pack } from './campaign-encounters.ts';
import { GardenRun } from './slice.ts';
import { distance, dt, heading, outsideSolids, random, solidHit, ticks, vector } from './sim.ts';
import type { Foe, Input, Point } from './sim.ts';

type Group = Point & Encounter & {
  key: string; objective: string; kind: 'patrol' | 'nest' | 'defense' | 'leader';
  state: 'waiting' | 'active' | 'done'; ids: Set<number>; wave: number; next: number;
  primary?: number; leaderSpawned: boolean;
};
type DropKind = 'gold' | 'gear' | 'heart' | 'magnet' | 'power-charm';
export type CampaignDrop = Point & { kind: DropKind; gold: number; item?: string; born: number };
type Poison = Point & { radius: number; due: number; expires: number };
type VenomLane = { from: Point; to: Point; due: number; expires: number; width: number };

const economy = gear.earnedGold;
const balance = gear.combat;
const activation = 190;
const interactReach = 57;
const leaderLootSeed: Record<string, string> = {
  thornback: 'thornback-3', keeper: 'marsh-keeper-3', 'crypt-bell': 'crypt-bell-1',
  'north-key': 'two-keys-0', 'south-key': 'two-keys-1', warden: 'hollow-warden-2',
};
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
  venomLanes: VenomLane[] = [];
  private nextLane = 0;
  private laneSide = 1;
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
  private thornbacks = new Set<number>();
  readonly wardenGuards = new Set<number>();
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
    for (const sweep of stage.sweeps) {
      for (const encounter of sweep.encounters) {
        const kind = encounter.defenseHp ? 'defense' : encounter.nestHp ? 'nest' : encounter.enemy ? 'leader' : 'patrol';
        this.groups.push({ ...encounter, ...point(encounter.at), kind, objective: sweep.id, key: encounter.id,
          state: 'waiting', ids: new Set(), wave: 0, next: 0, leaderSpawned: false });
      }
    }
  }

  override get xpGoal() {
    const n = this.level - 1;
    return n === 0 ? 10 : 14 + 4 * n + Math.floor(.46 * n * n);
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
  get exitOpen() { return this.objectiveIndex >= this.stage.sweeps.length; }
  get activeObjective() { return this.stage.sweeps[this.objectiveIndex]?.id; }
  get activeGroups() { return this.groups.filter(group => group.objective === this.activeObjective); }
  get objectivePoint() {
    if (this.exitOpen) return this.exit;
    const groups = this.activeGroups;
    return groups.find(group => group.state === 'active') ?? groups.filter(group => group.state === 'waiting')
      .reduce<Group | undefined>((best, group) => !best || distance(group, this.player) < distance(best, this.player) ? group : best, undefined);
  }
  get objectiveText() {
    if (this.exitOpen) return 'Reach the exit and confirm';
    if (this.wardenGuards.size) return 'Break the Warden’s guard · ' + this.wardenGuards.size + ' left';
    const groups = this.activeGroups;
    const phase = `Phase ${this.objectiveIndex + 1}/${this.stage.sweeps.length}`;
    const active = groups.find(group => group.state === 'active');
    if (!active) return phase + ' · ' + this.stage.sweeps[this.objectiveIndex].label;
    if (this.lantern && active.kind === 'defense') {
      const assault = active.recoveryAfter ? (active.wave > active.recoveryAfter ? 'Assault 2' : 'Assault 1') : 'Ambush';
      return `${phase} · ${assault} · ${Math.ceil(this.lantern.hp)} HP`;
    }
    if (active.leaderSpawned || active.nestHp && active.wave === active.waves.length) return phase + ' · Defeat the target';
    return `${phase} · Wave ${active.wave}/${active.waves.length}`;
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
    const scale = this.stage.order === 1 ? .66 : this.stage.order === 2 ? .73 : .82;
    super.hurt(Math.max(1, Math.round(amount * scale * (1 - reduction / 100))), source);
  }

  protected override hit(foe: Foe, amount: number, source: string, at?: Point, angle?: number) {
    if (foe.def.role === 'boss' && this.wardenGuards.size) return;
    super.hit(foe, amount * (this.tick < this.powerUntil ? 1.18 : 1), source, at, angle);
  }

  private reachable(at: Point) {
    return distance(at, this.player) <= interactReach && solidHit(this.player, at, 0, this.arena) === Infinity;
  }

  private findSpawn(at: Point, radius: number, minimum: number, reach: number, flank?: number) {
    for (let i = 0; i < 36; i++) {
      const roll = this.localRng();
      const angle = flank === undefined ? roll * Math.PI * 2 : flank + (roll - .5) * (i < 22 ? 1.4 : Math.PI * 2);
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

  private spawnPack(at: Point, pack: Pack, minimum: number, reach: number, group?: Group, flank?: number) {
    for (const [id, count] of Object.entries(pack)) {
      const def = enemies.get(id)!;
      for (let index = 0; index < count; index++) {
        const spot = this.findSpawn(at, def.radius, minimum, reach, flank);
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
    group.next = this.tick;
    if (group.defenseHp) {
      this.lantern = { x: group.x, y: group.y, hp: group.defenseHp, maxHp: group.defenseHp };
    }
  }

  private startWave(group: Group) {
    const wave = group.waves[group.wave++];
    this.spawnPack(group, wave.pack, group.defenseHp ? 145 : 115,
      wave.reach ?? (group.defenseHp ? 260 : 195), group, wave.flank);
  }

  private spawnLeader(group: Group) {
    const id = group.enemy ?? 'seedling';
    const def = enemies.get(id)!;
    const foe = this.spawn(id, group.nestHp ?? Math.round(def.hp * (group.hpScale ?? 1)), group)!;
    group.ids.add(foe.id);
    group.primary = foe.id;
    group.leaderSpawned = true;
    if (group.nestHp) {
      foe.def = nestDef;
      this.nests.add(foe.id);
      group.next = this.tick + ticks(1.6);
      return;
    }
    if (id === 'bottle') {
      foe.def = { ...foe.def, name: 'Marsh Keeper', role: 'elite', radius: 24 };
      foe.state = 'arrival';
      foe.until = this.tick + ticks(1);
      this.keepers.add(foe.id);
    }
    if (id === 'thornback') this.thornbacks.add(foe.id);
    this.emit(id === 'warden' ? 'boss-arrival' : 'elite', foe);
  }

  private venomLane() {
    const p = this.player;
    const horizontal = this.laneSide > 0;
    this.laneSide *= -1;
    const from = horizontal ? { x: p.x - 250, y: p.y } : { x: p.x, y: p.y - 210 };
    const to = horizontal ? { x: p.x + 250, y: p.y } : { x: p.x, y: p.y + 210 };
    const due = this.tick + ticks(1.2);
    this.venomLanes.push({ from, to, due, expires: due + ticks(1.45), width: 28 });
    this.emit('telegraph', p);
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
    const groups = this.activeGroups;
    if (!this.exitOpen && !this.boss && !groups.some(group => group.leaderSpawned && group.enemy && group.state === 'active') &&
        this.tick >= this.ambientAt && alive < this.stage.ambientCap) {
      this.ambientAt = this.tick + ticks(this.stage.ambientSec);
      const id = this.stage.order > 1 && this.localRng() < .55 ? 'moth' : 'seedling';
      const number = this.stage.order <= 2 ? 6 : 7;
      this.spawnPack(this.player, { [id]: Math.min(number, this.stage.ambientCap - alive) }, 225, 350);
    }
    const choice = this.stage.sweeps[this.objectiveIndex]?.chooseCrossing;
    for (const group of groups) {
      if (group.state === 'waiting' && !groups.some(other => other.state === 'active') && distance(this.player, group) <= activation) {
        this.activate(group);
        if (choice) for (const other of groups) if (other !== group) other.state = 'done';
      }
      if (group.state !== 'active' || this.tick < group.next) continue;
      if (!group.ids.size) {
        if (group.wave < group.waves.length) this.startWave(group);
        else if (!group.leaderSpawned && (group.enemy || group.nestHp)) this.spawnLeader(group);
      }
      if (group.nestHp && group.primary && group.ids.has(group.primary) && distance(this.player, group) < 290) {
        group.next = this.tick + ticks(4.1);
        if (this.stage.order === 2) this.venomLane();
        else this.poison(this.player, 49, 1.05);
      }
    }
    const marsh = this.stage.order === 2 && groups.some(group => group.state === 'active') && !this.exitOpen;
    if (marsh && this.tick >= this.nextLane) {
      this.nextLane = this.tick + ticks(8);
      if (!this.venomLanes.length) this.venomLane();
    }
    this.pools = this.pools.filter(pool => pool.expires > this.tick);
    this.venomLanes = this.venomLanes.filter(lane => lane.expires > this.tick);
  }

  protected override updateBoss(foe: Foe, range: number) {
    const phase = foe.phase;
    const attack = foe.state === 'attack';
    super.updateBoss(foe, range);
    if (foe.phase !== phase) {
      this.dropRecovery(foe, 'heart');
      const start = this.foes.length;
      this.spawnPack(foe, foe.phase === 2 ? { moth: 10, scarab: 6, bottle: 4 } : { moth: 12, scarab: 5, bells: 7, bottle: 4 },
        165, 315);
      for (const guard of this.foes.slice(start)) this.wardenGuards.add(guard.id);
    } else if (foe.phase === 3 && attack && foe.state === 'recover' && foe.attack === 'lanes') {
      // A shorter pause queues the cleave. The completed lane attack has ended before its tell begins.
      foe.until = this.tick + ticks(.4);
    }
  }

  private dropRecovery(at: Point, kind: 'heart' | 'power-charm' = 'heart') {
    const spot = this.findSpawn(at, 10, 0, 78) ?? at;
    this.addDrop({ ...spot, kind, gold: 0, born: this.tick });
  }

  protected override foeAction(foe: Foe) {
    if (this.nests.has(foe.id)) return true;
    if (this.thornbacks.has(foe.id) && this.stage.order === 1 && foe.hp < foe.maxHp * .56) {
      if (foe.state === 'recover' && this.tick >= foe.until) {
        const fast = ++foe.casts % 2 === 1;
        foe.def = { ...foe.def, behavior: { ai: 'charge',
          windup: fast ? .78 : 1.06, chargeSpeed: fast ? 337 : 232,
          chargeSec: fast ? .43 : .7, triggerRange: fast ? 210 : 260, recovery: fast ? 1.25 : 1.1,
        } };
      }
    }
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

  inVenomLane(lane: VenomLane, at: Point) {
    return at.x >= lane.from.x - lane.width && at.x <= lane.to.x + lane.width &&
      at.y >= lane.from.y - lane.width && at.y <= lane.to.y + lane.width;
  }

  protected override action(input: Input) {
    for (const pool of this.pools) {
      if (pool.due > this.tick || distance(this.player, pool) > pool.radius) continue;
      this.hurt(10, 'venom-pool');
      this.slowUntil = this.tick + ticks(.45);
    }
    for (const lane of this.venomLanes) {
      if (this.tick < lane.due || !this.inVenomLane(lane, this.player)) continue;
      this.hurt(9, 'venom-lane');
      this.slowUntil = this.tick + ticks(.35);
    }
    if (this.player.hp <= 0 || this.lantern?.hp === 0 || this.tick >= ticks(this.stage.safetyTimeout)) return;
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
    if (this.wardenGuards.delete(foe.id) && !this.wardenGuards.size) this.emit('ward', foe);
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
      if (!tracked.ids.size && tracked.wave < tracked.waves.length) {
        const rest = tracked.recoveryAfter === tracked.wave;
        tracked.next = this.tick + ticks(rest ? 4 : tracked.kind === 'defense' ? 1.2 : 0);
        if (rest) {
          this.dropRecovery(tracked);
          if (this.lantern) this.lantern.hp = Math.min(this.lantern.maxHp, this.lantern.hp + 38);
        }
      }
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
      const offset = { x: foe.x - 16, y: foe.y };
      this.dropGear(outsideSolids(offset, rules.player.radius, this.arena) ? offset : foe,
        pool, tracked ? leaderLootSeed[tracked.key] ?? tracked.key : foe.def.id);
      if (foe.def.role === 'boss') this.drop(foe, 'chest', 1);
      this.keepers.delete(foe.id);
      this.thornbacks.delete(foe.id);
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
      if (group.ids.size || group.wave < group.waves.length || !group.leaderSpawned && (group.nestHp || group.enemy)) continue;
      group.state = 'done';
      this.gainXp(5);
    }
    if (groups.every(group => group.state === 'done')) {
      this.cleared.add(this.activeObjective!);
      this.objectiveIndex++;
      this.venomLanes.length = 0;
      if (this.exitOpen) this.emit('exit-open', this.exit);
      else {
        this.addDrop({ ...this.player, kind: 'heart', gold: 0, born: this.tick });
        this.emit('ward', this.player);
      }
    }
  }

  override get emberReach() { return this.tick < this.magnetUntil ? 220 : super.emberReach; }

  protected override resolveOutcome() {
    if (this.result) return;
    if (this.player.hp <= 0) this.result = 'hp';
    else if (this.lantern?.hp === 0 && this.activeGroups.some(group => group.kind === 'defense')) {
      this.lanternLost = true;
      this.result = 'rite';
    } else if (this.tick >= ticks(this.stage.safetyTimeout)) this.result = 'time';
  }
}
