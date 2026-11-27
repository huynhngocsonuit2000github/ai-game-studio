import { enemies, rules } from './content.ts';
import { campaignHash, gear, items, layouts, point } from './campaign-content.ts';
import type { Stage, Stats } from './campaign-content.ts';
import type { Encounter, Pack } from './campaign-encounters.ts';
import { beetle, burrow, mend } from './kin-enemies.ts';
import { stops } from './kin-maps.ts';
import { tierRules } from './kin-save.ts';
import { nightmarePressure, stageForTier } from './kin-difficulty.ts';
import type { KinLoadout, Tier } from './kin-save.ts';
import { name, t } from './locale.ts';
import { GardenRun } from './slice.ts';
import { angleDistance, distance, dt, heading, outsideSolids, random, solidHit, ticks, vector } from './sim.ts';
import type { Foe, HitKind, Input, Point } from './sim.ts';

type Group = Point & Encounter & {
  key: string; objective: string; kind: 'patrol' | 'nest' | 'defense' | 'leader';
  state: 'waiting' | 'active' | 'done'; ids: Set<number>; wave: number; next: number;
  lit?: boolean; primary?: number; leaderSpawned: boolean;
};
type DropKind = 'gold' | 'gear' | 'heart' | 'magnet' | 'power-charm';
export type CampaignDrop = Point & { kind: DropKind; gold: number; item?: string; born: number };
type Poison = Point & { radius: number; due: number; expires: number };
type VenomLane = { style?: string; from: Point; to: Point; due: number; expires: number; width: number };

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
  readonly tier: Tier;
  readonly kin: KinLoadout;
  treats = 0;
  rescued = false;
  readonly sites;
  lightTicks = 0;
  private lighting?: Group;
  readonly mendLinks = new Map<number, { target: number; due: number }>();
  readonly burrows = new Map<number, Point & { due: number }>();
  private foeTimers = new Map<number, number>();
  private nightmareBeat = false;
  private nextAshLane = 0;
  petAt = 0;
  petCue?: { from: Point; to: Point; until: number };
  owlMark?: { id: number; until: number };
  brand?: { id: number; until: number };
  engravingAt = 0;
  wardGuard = 0;
  private wardUntil = 0;
  private echo?: { from: Point; due: number };
  kinCue?: { from: Point; to: Point; until: number; radius?: number };
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
    tier: Tier = 'normal', kin: KinLoadout = {},
  ) {
    super(seed ^ campaignHash(stage.id));
    this.stage = stageForTier(stage, tier);
    this.tier = tier;
    this.kin = { ...kin };
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
    this.sites = (stops[stage.id] ?? []).map(site => ({ ...site, ...point(site.at), open: false }));
    this.petAt = ticks(this.kin.pet === 'ember-fox' ? 5 : this.kin.pet === 'moon-owl' ? this.kin.bond === 3 ? 7 : 8 : 0);
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
    for (const sweep of this.stage.sweeps) {
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
    if (this.exitOpen) return t('Reach the exit and confirm');
    if (this.wardenGuards.size) return t('Break the Warden’s guard · {0} left', this.wardenGuards.size) + ' left';
    const groups = this.activeGroups;
    const phase = t('Phase {0}/{1}', this.objectiveIndex + 1, this.stage.sweeps.length);
    const active = groups.find(group => group.state === 'active');
    if (!active) return phase + ' · ' + name(this.stage.sweeps[this.objectiveIndex].label);
    if (this.lantern && active.kind === 'defense') {
      const assault = active.recoveryAfter ? (active.wave > active.recoveryAfter ? 'Assault 2' : 'Assault 1') : 'Ambush';
      return `${phase} · ${t(assault)} · ${Math.ceil(this.lantern.hp)} HP`;
    }
    if (this.waymarkReady(active)) return phase + ' · ' + t('Light the waymark');
    if (active.leaderSpawned || active.nestHp && active.wave === active.waves.length) return phase + ' · ' + t('Defeat the target');
    return phase + ' · ' + t('Wave {0}/{1}', active.wave, active.waves.length);
  }
  get canInteract() {
    if (this.exitOpen && this.reachable(this.exit)) return 'Exit';
    if (this.activeGroups.some(group => this.waymarkReady(group) && this.reachable(group))) return 'Light waymark';
    const site = this.sites.find(site => !site.open && this.reachable(site));
    if (site) return site.kind === 'cage' ? 'Open rescue cage' : 'Collect cache';
    return this.chests.some(chest => this.chestReady(chest) && this.reachable(chest)) ? 'Open chest' : '';
  }
  private waymarkReady(group: Group) {
    return group.waymark && !group.lit && group.state === 'active' && !group.ids.size && group.wave === group.waves.length;
  }

  chestReady(chest: typeof this.chests[number]) { return !chest.open && (!chest.after || this.cleared.has(chest.after)); }

  protected override movementScale() {
    return this.tick < this.slowUntil ? 1 - .32 * (1 - this.kit.slowReductionPercent / 100) : 1;
  }

  protected override hurt(amount: number, source = 'hazard') {
    const reduction = source === 'bog-brewer-shot' ? this.kit.projectileReductionPercent :
      enemies.has(source) ? this.kit.contactReductionPercent : 0;
    const scale = this.stage.order === 1 ? .66 : this.stage.order === 2 ? .73 : .82;
    super.hurt(Math.max(1, Math.round(amount * scale * tierRules[this.tier].damage * (1 - reduction / 100))), source);
  }

  protected override absorb(amount: number) {
    if (this.wardGuard && this.tick < this.wardUntil) {
      const blocked = Math.min(amount, this.wardGuard);
      this.wardGuard -= blocked;
      amount -= blocked;
      this.emit('shield', this.player);
    }
    if (amount > 0 && this.kin.pet === 'moss-turtle' && this.tick >= this.petAt) {
      const bond = this.kin.bond ?? 1;
      amount -= Math.min(amount, 12 + 6 * bond);
      this.petAt = this.tick + ticks(bond === 3 ? 12 : 14);
      this.petCue = { from: this.petPosition, to: { ...this.player }, until: this.tick + ticks(.65) };
      this.emit('shield', this.player);
    }
    return amount;
  }

  protected override dartSplash(radius: number, damage: number) {
    return this.kin.engraving === 'refraction' && this.build.get('wick-dart') === 2
      ? { radius: radius + 18, damage: damage * 1.10 } : { radius, damage };
  }

  protected override hit(foe: Foe, amount: number, source: string, at?: Point, angle?: number, kind: HitKind = 'hero') {
    if (foe.def.role === 'boss' && this.wardenGuards.size) return 0;
    const hero = kind !== 'pet' && kind !== 'engraving';
    const direct = kind === 'direct';
    let multiplier = hero && this.tick < this.powerUntil ? 1.18 : 1;
    if (hero && this.owlMark?.id === foe.id && this.owlMark.until > this.tick) multiplier *= 1.15;
    const brand = this.kin.engraving === 'searing-brand' && direct;
    if (brand && this.brand?.id === foe.id && this.brand.until > this.tick) multiplier *= 1.16;
    const origin = angle === undefined ? heading(foe, this.player) : angle + Math.PI;
    if (foe.def.id === 'bulwark-beetle' && foe.state !== 'recover' && angleDistance(foe.angle, origin) <= beetle.arc) multiplier *= beetle.frontalDamage;
    if (foe.def.id === 'eclipse-warden' && foe.phase < 3) {
      const threshold = Math.floor(foe.maxHp * (foe.phase === 1 ? .66 : .33));
      if (foe.hp <= threshold) return 0;
    }
    const damage = super.hit(foe, amount * multiplier, source, at, angle, kind);
    if (!damage) return 0;
    if (foe.def.id === 'eclipse-warden' && foe.phase < 3) {
      foe.hp = Math.max(foe.hp, Math.floor(foe.maxHp * (foe.phase === 1 ? .66 : .33)));
    }
    if (brand) {
      this.brand = { id: foe.id, until: this.tick + ticks(2.5) };
      this.showKinCue(foe, foe, 25);
    }
    if (!direct || this.tick < this.engravingAt) return damage;
    if (this.kin.engraving === 'cinder-chain' && source === 'wick-dart' && foe.hp <= 0) {
      this.engravingAt = this.tick + ticks(.6);
      this.showKinCue(foe, foe, 52);
      for (const other of this.neighbors(foe, 52)) {
        if (other !== foe && distance(other, foe) <= 52) this.hit(other, damage * .35, 'cinder-chain', other, undefined, 'engraving');
      }
    }
    if (this.kin.engraving === 'ricochet') {
      const [other] = this.targets(foe, 115, candidate => candidate !== foe);
      if (other) {
        this.engravingAt = this.tick + ticks(.45);
        this.showKinCue(foe, other);
        this.hit(other, damage * .35, 'ricochet', other, undefined, 'engraving');
      }
    }
    return damage;
  }

  private showKinCue(from: Point, to: Point, radius?: number) {
    this.kinCue = { from: { ...from }, to: { ...to }, radius, until: this.tick + ticks(.42) };
  }

  private targets(from: Point, radius: number, eligible: (foe: Foe) => boolean) {
    return [...this.neighbors(from, radius)].filter(foe => foe.hp > 0 && !foe.hidden && foe.state !== 'arrival' &&
      distance(foe, from) <= radius && eligible(foe) && solidHit(from, foe, 0, this.arena) === Infinity)
      .sort((a, b) => distance(a, from) - distance(b, from) || a.id - b.id);
  }

  get petPosition(): Point {
    return { x: this.player.x - this.facing.x * 29 - this.facing.y * 16, y: this.player.y - this.facing.y * 29 + this.facing.x * 16 };
  }

  private petAction() {
    if (this.tick < this.petAt) return;
    const pet = this.kin.pet;
    if (pet !== 'ember-fox' && pet !== 'moon-owl') return;
    const from = this.petPosition;
    const bond = this.kin.bond ?? 1;
    const choices = this.targets(from, pet === 'ember-fox' ? 185 : 340,
      foe => !this.isNest(foe) && !(foe.def.role === 'boss' && this.wardenGuards.size));
    if (pet === 'ember-fox' && choices.length) {
      const limit = bond === 3 ? 3 : bond;
      const first = choices[0];
      const aim = heading(from, first);
      const targets = choices.filter(foe => foe === first || angleDistance(heading(from, foe), aim) < .24).slice(0, limit);
      for (const foe of targets) this.hit(foe, bond === 3 ? 22 : 18, pet, foe, aim, 'pet');
      this.petAt = this.tick + ticks(5);
      this.petCue = { from, to: { ...targets[targets.length - 1] }, until: this.tick + ticks(.48) };
      this.emit('cast', from);
    } else if (pet === 'moon-owl' && choices.length) {
      const foe = choices.find(foe => foe.def.role !== 'normal') ?? choices[0];
      this.owlMark = { id: foe.id, until: this.tick + ticks(bond >= 2 ? 4 : 3) };
      this.petAt = this.tick + ticks(bond === 3 ? 7 : 8);
      this.petCue = { from, to: { ...foe }, until: this.tick + ticks(.65) };
      this.emit('ward', from);
    }
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
        if (this.foes.length >= rules.caps.normalEnemies + 8) break;
        if (id === 'moth-shaman' && this.foes.filter(foe => foe.def.id === id && foe.hp > 0).length >= mend.cap) break;
        const hp = id === 'seedling' ? [20, 29, 31, 35, 38, 38, 42, 45][this.stage.order - 1]
          : id === 'moth' && this.stage.order === 2 ? 30 : def.hp;
        const foe = this.spawn(id, Math.round(hp * tierRules[this.tier].hp), spot);
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
    const foe = this.spawn(id, Math.round((group.nestHp ?? def.hp * (group.hpScale ?? 1)) * tierRules[this.tier].leaderHp), group)!;
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
    this.emit(def.role === 'boss' ? 'boss-arrival' : 'elite', foe);
  }

  private venomLane(width = 28, style?: string) {
    const p = this.player;
    const horizontal = this.laneSide > 0;
    this.laneSide *= -1;
    const from = horizontal ? { x: p.x - 250, y: p.y } : { x: p.x, y: p.y - 210 };
    const to = horizontal ? { x: p.x + 250, y: p.y } : { x: p.x, y: p.y + 210 };
    const due = this.tick + ticks(style ? 1.4 : 1.2);
    this.venomLanes.push({ from, to, due, expires: due + ticks(1.45), width, style });
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
        const pressure = nightmarePressure(this.stage);
        if (this.tier === 'nightmare' && !this.nightmareBeat && group.key === pressure.encounter && group.wave === group.waves.length - 1) {
          this.nightmareBeat = true;
          group.next = this.tick + ticks(this.stage.id === 'ash-mine' ? 6.4 : 5.3);
          if (this.stage.id === 'ash-mine') this.nextAshLane = this.tick + ticks(3.2);
          if (pressure.hazard === 'lane') this.venomLane(pressure.width, this.stage.id);
          else this.poison(this.player, pressure.width, 1.35);
          continue;
        }
        if (group.wave < group.waves.length) this.startWave(group);
        else if (!group.leaderSpawned && (group.enemy || group.nestHp)) this.spawnLeader(group);
      }
      if (group.nestHp && group.primary && group.ids.has(group.primary) && distance(this.player, group) < 290) {
        group.next = this.tick + ticks(4.1);
        if (this.stage.order === 2) this.venomLane();
        else this.poison(this.player, 49, 1.05);
      }
    }
    if (this.nextAshLane && this.tick >= this.nextAshLane) {
      this.nextAshLane = 0;
      this.venomLane(nightmarePressure(this.stage).width, 'ash-mine');
    }
    for (const lane of this.venomLanes) {
      if (lane.style !== 'mistwood') continue;
      const shift = this.tick < lane.due ? 0 : .55;
      lane.from.y += shift;
      lane.to.y += shift;
    }
    const marsh = this.stage.order === 2 && groups.some(group => group.state === 'active') && !this.exitOpen;
    if (marsh && this.tick >= this.nextLane) {
      this.nextLane = this.tick + ticks(8);
      if (!this.venomLanes.length) this.venomLane();
    }
    this.pools = this.pools.filter(pool => pool.expires > this.tick);
    this.venomLanes = this.venomLanes.filter(lane => lane.expires > this.tick);
  }

  protected override patterns(foe: Foe): readonly Foe['attack'][] | undefined {
    if (foe.def.id === 'fog-keeper') return ['cleave'];
    if (foe.def.id === 'furnace-overseer') return ['lanes'];
    if (foe.def.id === 'eclipse-warden') return foe.phase === 3 ? ['lanes', 'cleave'] : ['lanes'];
  }

  protected override lanes(foe: Foe) {
    if (this.stage.order < 7) super.lanes(foe);
    else {
      foe.angle = this.stage.order === 7 && foe.casts % 2 ? 1 : 0;
      foe.laneOrigin = 0;
    }
  }

  protected override advancePhase(foe: Foe) {
    if (this.stage.order <= 5 || this.stage.order === 8) super.advancePhase(foe);
  }

  protected override updateBoss(foe: Foe, range: number) {
    if (this.stage.order === 8 && this.wardenGuards.size) {
      foe.until = this.tick + ticks(.55);
      return;
    }
    const phase = foe.phase;
    const attack = foe.state === 'attack';
    super.updateBoss(foe, range);
    if (this.stage.order === 8 && foe.phase !== phase) {
      this.dropRecovery(foe);
      if (foe.phase === 2) {
        const start = this.foes.length;
        this.spawnPack(foe, { 'bulwark-beetle': 1, 'moth-shaman': 1, moth: 7 }, 150, 250);
        for (const guard of this.foes.slice(start)) this.wardenGuards.add(guard.id);
      }
    } else if (foe.phase !== phase) {
      this.dropRecovery(foe, 'heart');
      const start = this.foes.length;
      this.spawnPack(foe, foe.phase === 2 ? { moth: 10, scarab: 6, bottle: 4 } : { moth: 12, scarab: 5, bells: 7, bottle: 4 },
        165, 315);
      for (const guard of this.foes.slice(start)) this.wardenGuards.add(guard.id);
    } else if (foe.phase === 3 && attack && foe.state === 'recover' && foe.attack === 'lanes') {
      // A shorter pause queues the cleave. The completed lane attack has ended before its tell begins.
      foe.until = this.tick + ticks(.4);
    } else if (attack && foe.state === 'recover' && this.stage.order >= 6) {
      foe.until = this.tick + ticks(this.stage.order === 8 ? 1.7 : 2.1);
      if (this.stage.order === 8 && this.tier === 'nightmare' && foe.attack === 'cleave') {
        this.venomLane(27, 'eclipse-temple');
        foe.until = this.tick + ticks(3.8);
      }
    }
  }

  private dropRecovery(at: Point, kind: 'heart' | 'power-charm' = 'heart') {
    const spot = this.findSpawn(at, 10, 0, 78) ?? at;
    this.addDrop({ ...spot, kind, gold: 0, born: this.tick });
  }

  private shaman(foe: Foe) {
    const link = this.mendLinks.get(foe.id);
    if (link) {
      const ally = this.foes.find(other => other.id === link.target && other.hp > 0 && !other.hidden);
      if (!ally || distance(ally, foe) > mend.radius) this.mendLinks.delete(foe.id);
      else if (this.tick >= link.due) {
        ally.hp = Math.min(ally.maxHp, ally.hp + mend.amount);
        this.mendLinks.delete(foe.id);
        this.emit('ward', ally);
      }
      return true;
    }
    if (this.tick >= (this.foeTimers.get(foe.id) ?? 0)) {
      const [ally] = this.targets(foe, mend.radius,
        other => other !== foe && other.def.role === 'normal' && other.hp < other.maxHp && !this.isNest(other));
      if (ally) {
        this.mendLinks.set(foe.id, { target: ally.id, due: this.tick + ticks(mend.tell) });
        this.foeTimers.set(foe.id, this.tick + ticks(mend.cooldown));
        this.emit('telegraph', foe);
        return true;
      }
    }
    return false;
  }

  private burrower(foe: Foe) {
    const spot = this.burrows.get(foe.id);
    if (spot) {
      if (this.tick < spot.due) return true;
      this.burrows.delete(foe.id);
      foe.hidden = false;
      foe.x = spot.x;
      foe.y = spot.y;
      if (distance(this.player, spot) <= burrow.radius) this.hurt(burrow.damage, 'ash-burrower');
      this.emit('bell', spot);
      return true;
    }
    if (this.tick < (this.foeTimers.get(foe.id) ?? 0) || distance(foe, this.player) > burrow.range) return false;
    const from = this.player;
    const headingToHero = heading(foe, from);
    for (const angle of [headingToHero, headingToHero + .7, headingToHero - .7, headingToHero + Math.PI]) {
      const direction = vector(angle);
      const target = { x: from.x + direction.x * 42, y: from.y + direction.y * 42 };
      if (target.x < 75 || target.y < 75 || target.x > this.arena.width - 75 || target.y > this.arena.height - 75 ||
          !outsideSolids(target, foe.def.radius, this.arena) || solidHit(from, target, foe.def.radius, this.arena) !== Infinity ||
          [this.exit, ...this.sites, ...this.chests, ...this.groups].some(site => distance(target, site) < burrow.radius + 20)) continue;
      this.burrows.set(foe.id, { ...target, due: this.tick + ticks(burrow.tell) });
      this.foeTimers.set(foe.id, this.tick + ticks(burrow.cooldown));
      foe.hidden = true;
      this.emit('telegraph', target);
      return true;
    }
    return false;
  }

  protected override foeAction(foe: Foe) {
    if (foe.def.id === 'moth-shaman' && this.shaman(foe)) return true;
    if (foe.def.id === 'ash-burrower' && this.burrower(foe)) return true;
    if (foe.def.id === 'bulwark-beetle' && foe.state === 'idle') foe.angle = heading(foe, this.player);
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
    if (this.tick >= this.wardUntil) this.wardGuard = 0;
    this.petAction();
    if (this.echo && this.tick >= this.echo.due) {
      const from = this.echo.from;
      this.echo = undefined;
      const radius = this.burstRadius * .72;
      this.showKinCue(from, from, radius);
      this.burstHit(from, radius, .30, 'aftertoll', 'engraving');
    }
    if (this.lighting) {
      if (!this.reachable(this.lighting)) {
        this.lighting = undefined;
        this.lightTicks = 0;
      } else if (++this.lightTicks >= ticks(2.5)) {
        this.lighting.lit = true;
        this.emit('ward', this.lighting);
        this.lighting = undefined;
        this.lightTicks = 0;
      }
    }
    if (input.burst && this.burstReady) {
      this.charge = 0;
      this.effect('lantern-burst', 'ring', this.player, { radius: this.burstRadius });
      this.emit('lantern-burst', this.player);
      const valid = this.burstHit(this.player, this.burstRadius, 1, 'lantern-burst', 'burst');
      if (valid && this.kin.engraving === 'aftertoll') {
        this.engravingAt = this.tick + ticks(.45);
        this.echo = { from: { ...this.player }, due: this.engravingAt };
      }
      if (valid && this.kin.engraving === 'shelter-bell') {
        this.wardGuard = 12;
        this.wardUntil = this.tick + ticks(3);
        this.showKinCue(this.player, this.player, 32);
      }
    }
    if (!input.interact) return;
    if (this.exitOpen && this.reachable(this.exit)) {
      this.result = 'victory';
      return;
    }
    const waymark = this.activeGroups.find(group => this.waymarkReady(group) && this.reachable(group));
    if (waymark) {
      this.lighting = waymark;
      return;
    }
    const site = this.sites.find(site => !site.open && this.reachable(site));
    if (site) {
      site.open = true;
      this.treats = Math.min(2, this.treats + site.treats);
      if (site.kind === 'cage') this.rescued = true;
      this.emit(site.kind === 'cage' ? 'rescue' : 'cache', site);
      return;
    }
    const chest = this.chests.find(candidate => this.chestReady(candidate) && this.reachable(candidate));
    if (!chest) return;
    chest.open = true;
    if (this.tier === 'normal') {
      this.dropGear(chest, gear.chests.pools[chest.pool], chest.id);
      this.addDrop({ x: chest.x + 18, y: chest.y, kind: 'gold', gold: economy.chestBonusGold, born: this.tick });
    } else this.addDrop({ ...chest, kind: 'heart', gold: 0, born: this.tick });
    this.emit('select', chest);
  }

  private burstHit(from: Point, radius: number, fraction: number, source: string, kind: 'burst' | 'engraving') {
    const burst = balance.lanternBurst;
    let confirmed = false;
    for (const foe of this.neighbors(from, radius)) {
      if (distance(from, foe) > radius) continue;
      const scale = foe.def.role === 'boss' ? burst.bossDamageMultiplier : foe.def.role === 'elite' ? burst.eliteDamageMultiplier : 1;
      if (!this.hit(foe, (burst.damage + this.kit.burstDamageAdd) * scale * fraction, source, foe, undefined, kind)) continue;
      if (foe.hp <= 0) this.burstKills.add(foe.id);
      confirmed = true;
    }
    return confirmed;
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
    this.mendLinks.delete(foe.id);
    this.burrows.delete(foe.id);
    this.foeTimers.delete(foe.id);
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
    if (drop > 0 && this.tier === 'normal') {
      this.goldDropped += drop;
      this.addDrop({ x: foe.x, y: foe.y, kind: 'gold', gold: drop, born: this.tick });
    }
    if (!this.burstKills.delete(foe.id) && foe.lastHit !== 'pet' && foe.lastHit !== 'engraving') {
      const burst = balance.lanternBurst;
      this.charge = Math.min(burst.chargeMax, this.charge + (leader ? burst.eliteKillCharge : burst.normalKillCharge));
    }
    if (leader) {
      if (this.stage.chests[0] && this.tier === 'normal') {
        const pool = gear.chests.pools[this.stage.chests[0].pool];
        const offset = { x: foe.x - 16, y: foe.y };
        this.dropGear(outsideSolids(offset, rules.player.radius, this.arena) ? offset : foe,
          pool, tracked ? leaderLootSeed[tracked.key] ?? tracked.key : foe.def.id);
      }
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
      if (group.waymark && !group.lit) continue;
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
