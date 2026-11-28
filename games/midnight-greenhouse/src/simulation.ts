import { COLUMNS, HZ, LANES, ticks } from './content.js';
import type { Card, CardId, Content, EnemyId, Hostile } from './content.js';

export type Command = { kind: 'plant'; card: CardId; lane: number; col: number }
  | { kind: 'remove'; lane: number; col: number }
  | { kind: 'water'; lane: number }
  | { kind: 'collect'; id?: number };
export type Cue = 'plant' | 'fern' | 'root' | 'shock' | 'water' | 'warning' | 'breach' | 'victory' | 'defeat' | 'pod' | 'valve-lock' | 'collect' | 'shield-chip' | 'bell' | 'unlock';
export type Effect = {
  kind: Cue | 'income' | 'impact' | 'bite' | 'heal' | 'phase' | 'keeper-down' | 'insulated';
  at: number;
  lane: number;
  x: number;
  targets?: number[];
  value?: number;
};
export type Plant = {
  card: Card; lane: number; col: number; x: number; hp: number;
  ready: number; acted: number; hurt: number; placed: number; lastDamage?: number;
  windup?: { at: number; fires: number }; mossHealing: boolean;
};
export type Enemy = {
  id: number; spec: Hostile; lane: number; x: number; hp: number;
  previousX?: number; spawnedAt?: number; lastDamage?: number;
  rootedUntil: number; biteAt: number; acted: number; hurt: number;
  healAt?: number; healed: number; slowedUntil?: number; stunnedUntil: number;
  gait: number; moving: boolean; braced: number; insulated: number;
  biteWindup?: { at: number; fires: number; target: Plant };
};
type Spawn = { at: number; lane: number; spec: Hostile };
type Threat = { at: number; lane: number; spec: Hostile; count: number; wave: number };
export type Drop = { id: number; lane: number; x: number; value: number; created: number; expires: number; elite: boolean };
export type Fallen = { id: CardId | EnemyId; lane: number; x: number; at: number; clip: 'fall' | 'burst' };
const ambientCells = [[1, 1.5], [2, 3.5], [0, 2.5], [3, 4.5], [1, 5.5], [0, 4.5], [2, 1.5], [3, 2.5]];
const windupTicks = { fern: 12, bramble: 8, orchid: 15 };
type Shot = { at: number; from: number; fired: number; target: Enemy; damage: number };

type ValveSource = 'pump' | 'keeper';
type ValveEvent = { source: ValveSource; lane: number; at: number; closeAt: number; opensAt: number };

export class Garden {
  readonly plants: Plant[] = [];
  readonly enemies: Enemy[] = [];
  readonly effects: Effect[] = [];
  readonly shots: Shot[] = [];
  readonly threats: Threat[] = [];
  readonly cards: Map<CardId, Card>;
  readonly prep: number;
  readonly drops: Drop[] = [];
  readonly fallen: Fallen[] = [];
  private nextDropId = 0;
  private ambientCount = 0;
  private nextAmbient: number;
  bell: number;
  phaseAt = -Infinity;
  readonly spawns: Spawn[] = [];
  readonly placementReady = new Map<CardId, number>();
  private readonly faults: ValveEvent[];
  private readonly closures: ValveEvent[] = [];
  private valveWarnings: ValveEvent[] = [];
  private nextFault = 0;
  private nextKeeperWarning = Infinity;
  keeperPhase: 1 | 2 = 1;
  private commands: Command[] = [];
  private waveWarned = 0;
  private spawned = 0;
  private nextEnemyId = 0;
  now = 0;
  wave = 0;
  stock: number;
  core: number;
  wet: number | null = null;
  waterReady = 0;
  firstBreach: number | null = null;
  lastBreach: number | null = null;
  bestChain = 0;
  result: 'victory' | 'defeat' | null = null;
  feedback = '';

  constructor(readonly content: Content) {
    this.prep = ticks(content.preparationSeconds);
    this.faults = content.level.faults.map<ValveEvent>((fault) => {
      const closeAt = this.prep + ticks(fault.atSeconds);
      return { source: 'pump', lane: fault.lane - 1, at: closeAt - ticks(fault.warningSeconds),
        closeAt, opensAt: closeAt + ticks(fault.closedSeconds) };
    }).sort((a, b) => a.at - b.at);
    this.nextAmbient = this.prep + ticks(content.drops.ambientFirstSeconds);
    this.bell = content.bell.charges;
    this.stock = content.level.startingStock;
    this.core = content.level.coreHealth;
    this.cards = new Map(content.cards.map((card) => [card.id, card]));
    const hostiles = new Map(content.hostiles.map((spec) => [spec.id, spec]));
    for (const wave of content.level.waves) {
      for (const group of wave.groups) {
        const spec = hostiles.get(group.enemy);
        if (!spec) throw new Error('Unknown enemy: ' + group.enemy);
        const at = this.prep + ticks(wave.atSeconds + group.offsetSeconds);
        this.threats.push({ at, lane: group.lane - 1, spec, count: group.count, wave: wave.number });
        for (let i = 0; i < group.count; i++) {
          this.spawns.push({ at: at + ticks(i * group.gapSeconds), lane: group.lane - 1, spec });
        }
      }
    }
    this.threats.sort((a, b) => a.at - b.at);
    this.spawns.sort((a, b) => a.at - b.at);
  }

  get nextThreat() {
    return this.threats.find(({ at }) => at > this.now);
  }

  get keeper() {
    return this.enemies.find((enemy) => enemy.spec.id === 'keeper' && enemy.hp > 0);
  }

  valveState(lane: number) {
    const closed = this.closures.filter((event) => event.lane === lane);
    const warned = this.valveWarnings.filter((event) => event.lane === lane);
    return {
      opensAt: Math.max(0, ...closed.map((event) => event.opensAt)),
      closesAt: Math.min(Infinity, ...warned.map((event) => event.closeAt)),
      sources: [...new Set([...closed, ...warned].map((event) => event.source))],
    };
  }

  private warn(event: ValveEvent) {
    this.valveWarnings.push(event);
    this.effect('warning', event.lane, 0);
  }

  private updateValves() {
    while (this.faults[this.nextFault]?.at <= this.now) this.warn(this.faults[this.nextFault++]);
    if (this.now >= this.nextKeeperWarning) this.warnKeeper();
    for (let i = this.closures.length - 1; i >= 0; i--) {
      if (this.closures[i].opensAt <= this.now) this.closures.splice(i, 1);
    }
    this.valveWarnings = this.valveWarnings.filter((event) => {
      if (event.closeAt > this.now) return true;
      this.closures.push(event);
      if (this.wet === event.lane) this.wet = null;
      this.effect('valve-lock', event.lane, 0);
      if (event.source === 'keeper') this.nextKeeperWarning = this.now + ticks(this.keeperPhase === 1 ? 25 : 19);
      return false;
    });
  }

  private warnKeeper() {
    this.nextKeeperWarning = Infinity;
    const keeper = this.keeper;
    if (!keeper) return;
    const closeAt = this.now + ticks(2.4);
    this.warn({ source: 'keeper', lane: this.wet ?? keeper.lane, at: this.now,
      closeAt, opensAt: closeAt + ticks(10) });
  }

  queue(command: Command) {
    if (!this.result) this.commands.push(command);
  }

  cardStatus(id: CardId) {
    const card = this.cards.get(id);
    const unlock = this.content.level.cardUnlocks[id];
    if (!card) return 'Hạt giống chưa mở.';
    if (unlock && this.waveWarned < unlock.wave) return `Mở khi báo đợt ${unlock.wave}.`;
    if (id === 'pitcher' && this.plants.filter((plant) => plant.card.id === 'pitcher').length >= this.content.drops.maxPitchers)
      return `Đã đủ ${this.content.drops.maxPitchers} Bình Hứng.`;
    if ((this.placementReady.get(id) ?? 0) > this.now) return 'Hạt giống đang hồi.';
    if (this.stock < card.cost) return 'Chưa đủ Ánh Hạt.';
    return '';
  }

  get keeperSignal() {
    return this.valveWarnings.find(({ source }) => source === 'keeper');
  }

  check(command: Command) {
    if (this.result) return 'Không thể thao tác lúc này.';
    if (command.kind === 'collect') return '';
    if (!Number.isInteger(command.lane) || command.lane < 0 || command.lane >= LANES) return 'Không thể thao tác lúc này.';
    if (command.kind === 'water') {
      if (!this.content.level.waterEnabled) return 'Sân Mưa chưa dùng van.';
      if (this.valveState(command.lane).opensAt > this.now) return 'Van luống này đang đóng.';
      if (this.wet === command.lane) return 'Luống này đang có nước.';
      if (this.now < this.waterReady) return 'Van đang hồi. Hãy chờ một chút.';
      return '';
    }
    if (!Number.isInteger(command.col) || command.col < 0 || command.col >= COLUMNS) return 'Ô nằm ngoài luống.';
    const existing = this.plants.find((plant) => plant.lane === command.lane && plant.col === command.col);
    if (command.kind === 'remove') return existing ? '' : 'Ô này chưa có cây.';
    if (existing) return 'Ô này đã có cây.';
    if (this.enemies.some((enemy) => enemy.lane === command.lane && Math.abs(enemy.x - (command.col + 0.5)) <= 0.5)) return 'Địch đang chiếm ô.';
    return this.cardStatus(command.card);
  }

  private effect(kind: Effect['kind'], lane: number, x: number, targets?: number[], value?: number) {
    this.effects.push({ kind, at: this.now, lane, x, targets, value });
  }

  private apply(command: Command) {
    this.feedback = this.check(command);
    if (this.feedback) return;
    if (command.kind === 'collect') {
      this.collect(command.id);
      return;
    }
    if (command.kind === 'water') {
      this.wet = command.lane;
      this.waterReady = this.now + ticks(this.content.rerouteCooldownSeconds);
      this.effect('water', command.lane, 0);
      return;
    }
    const x = command.col + 0.5;
    if (command.kind === 'remove') {
      const index = this.plants.findIndex((plant) => plant.lane === command.lane && plant.col === command.col);
      const [plant] = this.plants.splice(index, 1);
      this.pay(Math.floor(plant.card.cost / 4), command.lane, x);
      return;
    }
    const card = this.cards.get(command.card);
    if (!card) return;
    this.stock -= card.cost;
    this.placementReady.set(card.id, this.now + ticks(card.placementCooldownSeconds));
    const ready = card.id === 'pitcher' ? Math.max(this.now, this.prep) + ticks(card.payoutSeconds)
      : this.now + ('armSeconds' in card ? ticks(card.armSeconds) : 0);
    this.plants.push({ card, lane: command.lane, col: command.col, x, hp: card.hp, ready, acted: -HZ, hurt: -HZ, placed: this.now, mossHealing: false });
    this.effect('plant', command.lane, x);
  }

  private pay(value: number, lane: number, x: number) {
    if (!value) return;
    this.stock += value;
    this.effect('income', lane, x, undefined, value);
  }

  private drop(value: number, lane: number, x: number, elite = false) {
    const rules = this.content.drops;
    if (elite && this.drops.filter((drop) => drop.elite).length >= rules.maxEliteOnField) return;
    if (this.drops.length >= rules.maxOnField) {
      if (!elite) this.pay(value, lane, x);
      return;
    }
    this.drops.push({ id: this.nextDropId++, lane, x: Math.max(0.45, Math.min(7.55, x)), value,
      created: this.now, expires: this.now + ticks(rules.autoCreditSeconds), elite });
  }

  private collect(id?: number, expiredOnly = false) {
    let total = 0;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      if ((id !== undefined && drop.id !== id) || (expiredOnly && drop.expires > this.now)) continue;
      this.drops.splice(i, 1);
      this.pay(drop.value, drop.lane, drop.x);
      total += drop.value;
    }
    if (total) this.effect('collect', -1, 0, undefined, total);
  }

  private fall(id: CardId | EnemyId, lane: number, x: number, clip: Fallen['clip'] = 'fall') {
    if (this.fallen.length >= 40) this.fallen.shift();
    this.fallen.push({ id, lane, x, at: this.now, clip });
  }

  private schedule() {
    for (const wave of this.content.level.waves) {
      const at = this.prep + ticks(wave.atSeconds);
      if (at <= this.now) this.wave = wave.number;
      if (wave.number <= this.waveWarned || this.now < at - ticks(wave.announceLeadSeconds)) continue;
      this.waveWarned = wave.number;
      if (Object.values(this.content.level.cardUnlocks).some(({ wave: number }) => number === wave.number))
        this.effect('unlock', -1, 0);
      for (const lane of new Set(wave.groups.filter((group) => group.offsetSeconds <= 12).map((group) => group.lane - 1))) {
        this.effect('warning', lane, 8.45);
      }
    }
    while (this.spawns[this.spawned]?.at <= this.now) {
      const { lane, spec } = this.spawns[this.spawned++];
      if (spec.id === 'keeper') this.nextKeeperWarning = this.now + ticks(11);
      if (this.spawned === 1 || this.threats.some((item) => item.at === this.now && item.lane === lane && item.spec.id === 'courier')) {
        this.effect('warning', lane, 8.45);
      }
      this.enemies.push({ id: this.nextEnemyId++, spec, lane, x: 8.45, hp: spec.hp,
        spawnedAt: this.now, rootedUntil: 0, biteAt: 0, acted: -HZ, hurt: -HZ, healed: -HZ, braced: -HZ,
        insulated: -HZ, stunnedUntil: 0, gait: 0, moving: false });
    }
  }

  private move(enemy: Enemy) {
    enemy.previousX = enemy.x;
    enemy.moving = false;
    if (enemy.stunnedUntil > this.now) { enemy.biteWindup = undefined; return; }
    const phaseTwo = enemy.spec.id === 'keeper' && this.keeperPhase === 2;
    const speed = enemy.spec.speedTilesPerSecond * (phaseTwo ? 1.2 : 1) * ((enemy.slowedUntil ?? 0) > this.now ? 0.75 : 1);
    const proposed = enemy.x - (enemy.rootedUntil > this.now ? 0 : speed / HZ);
    let blocker: Plant | undefined;
    for (const plant of this.plants) {
      const edge = plant.x + 0.42;
      if (plant.hp <= 0 || plant.lane !== enemy.lane || plant.x > enemy.x || edge < proposed) continue;
      if (!blocker || plant.x > blocker.x) blocker = plant;
    }
    if (!blocker) {
      enemy.biteWindup = undefined;
      enemy.moving = proposed < enemy.x;
      if (enemy.moving) enemy.gait += ((enemy.slowedUntil ?? 0) > this.now ? 0.75 : phaseTwo ? 1.2 : 1);
      enemy.x = proposed;
      return;
    }
    enemy.x = Math.min(enemy.x, blocker.x + 0.42);
    if (enemy.biteAt > this.now) return;
    if (enemy.biteWindup?.target !== blocker) {
      enemy.biteWindup = { at: this.now, fires: this.now + 6, target: blocker };
      return;
    }
    if (enemy.biteWindup.fires > this.now) return;
    enemy.biteWindup = undefined;
    enemy.biteAt = this.now + ticks(enemy.spec.biteSeconds);
    enemy.acted = this.now;
    blocker.hurt = this.now;
    blocker.lastDamage = enemy.spec.biteDamage * (phaseTwo ? 1.25 : 1);
    blocker.hp -= blocker.lastDamage;
    this.effect('bite', enemy.lane, enemy.x, [blocker.x]);
  }

  private heal(enemy: Enemy) {
    if (enemy.stunnedUntil > this.now || enemy.spec.id !== 'mender' || (enemy.healAt ?? 0) > this.now) return;
    const ally = this.enemies.filter((unit) => unit !== enemy && unit.spec.id !== 'keeper' && unit.hp > 0
      && unit.hp < unit.spec.hp && unit.lane === enemy.lane && Math.abs(unit.x - enemy.x) <= 1.75)
      .sort((a, b) => a.hp / a.spec.hp - b.hp / b.spec.hp || a.id - b.id)[0];
    if (!ally) return;
    const recovered = Math.min(22, ally.spec.hp - ally.hp);
    ally.hp += recovered;
    enemy.healAt = this.now + ticks(6);
    enemy.healed = this.now;
    this.effect('heal', enemy.lane, enemy.x, [ally.x], recovered);
  }

  private damage(target: Enemy, amount: number, frontal = false) {
    if (target.hp <= 0) return;
    const applied = Math.min(target.hp, amount);
    target.hp -= amount;
    target.hurt = this.now;
    target.lastDamage = amount;
    this.effect('impact', target.lane, target.x, undefined, applied);
    if (frontal && target.spec.id === 'porter') {
      target.braced = this.now;
      this.effect('shield-chip', target.lane, target.x);
    }
  }

  private act(plant: Plant) {
    if (plant.hp <= 0 || plant.ready > this.now) return;
    const { card, lane, x } = plant;
    if (card.id === 'pitcher') {
      this.drop(card.payout, lane, x);
      plant.ready = this.now + ticks(card.payoutSeconds);
      plant.acted = this.now;
      return;
    }
    if (card.id === 'moss') {
      plant.mossHealing = this.wet === lane && this.now - plant.hurt >= ticks(card.regenDelaySeconds) && plant.hp < card.hp;
      if (plant.mossHealing) {
        plant.hp = Math.min(card.hp, plant.hp + card.wetHealPerSecond / HZ);
        if (this.now % HZ === 0) this.effect('heal', lane, x, [x]);
      }
      return;
    }
    if (card.id === 'pod') {
      const nearby = this.enemies.filter((enemy) => enemy.hp > 0 && enemy.lane === lane && Math.abs(enemy.x - x) <= card.blastRadius);
      if (!nearby.some((enemy) => Math.abs(enemy.x - x) <= card.triggerRadius)) { plant.windup = undefined; return; }
      if (!plant.windup) { plant.windup = { at: this.now, fires: this.now + 5 }; return; }
      if (plant.windup.fires > this.now) return;
      nearby.forEach((enemy) => this.damage(enemy, card.damage));
      plant.hp = 0;
      this.effect('pod', lane, x);
      this.fall(card.id, lane, x, 'burst');
      return;
    }
    const targets = this.enemies.filter((enemy) => enemy.hp > 0 && enemy.lane === lane && enemy.x >= x
      && (card.id !== 'orchid' || enemy.spec.id !== 'raincoat'))
      .sort((a, b) => a.x - b.x || a.id - b.id);
    const target = card.id === 'fern' ? targets.find((unit) =>
      unit.hp > this.shots.reduce((reserved, shot) => reserved + (shot.target === unit ? shot.damage : 0), 0))
      : targets[0];
    if (!target || target.x - x > card.rangeTiles) {
      plant.windup = undefined;
      if (card.id === 'orchid') {
        const coat = this.enemies.find((enemy) => enemy.spec.id === 'raincoat' && enemy.hp > 0
          && enemy.lane === lane && enemy.x >= x && enemy.x - x <= card.rangeTiles);
        if (coat && this.now - coat.insulated >= ticks(card.cooldownSeconds)) {
          coat.insulated = this.now;
          this.effect('insulated', lane, coat.x);
        }
      }
      return;
    }
    if (!plant.windup) {
      plant.windup = { at: this.now, fires: this.now + windupTicks[card.id] };
      return;
    }
    if (plant.windup.fires > this.now) return;
    plant.ready = plant.windup.at + ticks(card.cooldownSeconds);
    plant.windup = undefined;
    plant.acted = this.now;
    if (card.id === 'fern') {
      this.shots.push({ at: this.now + ticks(card.flightSeconds), from: x, fired: this.now, target, damage: card.damage });
      this.effect('fern', lane, x);
    } else if (card.id === 'bramble') {
      this.damage(target, card.damage * (target.spec.id === 'porter' ? 0.45 : 1), true);
      if (target.spec.id === 'keeper') target.slowedUntil = this.now + HZ;
      else target.rootedUntil = Math.max(target.rootedUntil, this.now + ticks(card.rootSeconds));
      this.effect('root', lane, x, [target.x]);
    } else {
      this.damage(target, card.damage);
      const hit = [target.x];
      const extra = this.wet === lane ? card.wetAdditionalTargets : card.dryAdditionalTargets;
      for (const next of targets.slice(1, extra + 1)) {
        if (next.x - hit[hit.length - 1] > card.jumpRangeTiles) break;
        this.damage(next, card.jumpDamage[hit.length - 1]);
        hit.push(next.x);
      }
      for (const insulated of this.enemies) {
        if (insulated.spec.id === 'raincoat' && insulated.lane === lane && insulated.hp > 0
          && insulated.x >= x && insulated.x <= hit.at(-1)! + card.jumpRangeTiles) insulated.insulated = this.now;
      }
      this.bestChain = Math.max(this.bestChain, hit.length);
      this.effect('shock', lane, x, hit);
    }
  }

  step() {
    if (this.result) return;
    this.now++;
    for (const command of this.commands.splice(0)) this.apply(command);
    while (this.effects[0] && this.now - this.effects[0].at > HZ * 1.2) this.effects.shift();
    while (this.fallen[0] && this.now - this.fallen[0].at >= 45) this.fallen.shift();
    this.collect(undefined, true);
    if (this.now < this.prep) return;
    if (this.now >= this.nextAmbient) {
      const [lane, x] = ambientCells[this.ambientCount % ambientCells.length];
      const rules = this.content.drops;
      this.drop(this.ambientCount < rules.openingAmbientPayouts ? rules.openingAmbientValue : rules.ambientValue, lane, x);
      this.ambientCount++;
      this.nextAmbient += ticks(rules.ambientEverySeconds);
    }
    this.updateValves();
    this.schedule();
    for (const enemy of this.enemies) this.move(enemy);
    for (const enemy of this.enemies) this.heal(enemy);
    for (const plant of this.plants) this.act(plant);
    while (this.shots[0]?.at <= this.now) {
      const shot = this.shots.shift();
      if (shot && this.enemies.includes(shot.target)) this.damage(shot.target, shot.damage);
    }
    for (let i = 0; i < this.plants.length;) {
      if (this.plants[i].hp <= 0) {
        const [plant] = this.plants.splice(i, 1);
        if (plant.card.id !== 'pod' || !this.fallen.some((unit) => unit.id === 'pod' && unit.clip === 'burst'
          && unit.lane === plant.lane && unit.x === plant.x && unit.at === this.now)) this.fall(plant.card.id, plant.lane, plant.x);
      }
      else i++;
    }
    for (let i = 0; i < this.enemies.length;) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) {
        if (enemy.spec.id === 'keeper') {
          this.nextKeeperWarning = Infinity;
          this.valveWarnings = this.valveWarnings.filter((event) => event.source !== 'keeper');
          for (let j = this.closures.length - 1; j >= 0; j--) {
            if (this.closures[j].source === 'keeper') this.closures.splice(j, 1);
          }
          this.effect('keeper-down', enemy.lane, enemy.x);
        }
        this.fall(enemy.spec.id, enemy.lane, enemy.x);
        if (this.content.drops.eliteIds.includes(enemy.spec.id))
          this.drop(this.content.drops.eliteValue, enemy.lane, enemy.x, true);
      } else if (enemy.x <= -0.35 && (enemy.stunnedUntil <= this.now || enemy.spec.id === 'keeper')) {
        if (this.bell > 0 && enemy.spec.id !== 'keeper') {
          this.bell--;
          const until = this.now + ticks(this.content.bell.ordinaryLaneStunSeconds);
          for (const other of this.enemies) {
            // Enemies already over the line still resolve this tick, in spawn order.
            if (other.lane === enemy.lane && other.spec.id !== 'keeper' && other.x > -0.35) other.stunnedUntil = until;
          }
          this.fall(enemy.spec.id, enemy.lane, enemy.x);
          this.effect('bell', enemy.lane, -0.35);
          this.enemies.splice(i, 1);
          continue;
        }
        this.firstBreach ??= enemy.lane;
        this.lastBreach = enemy.lane;
        this.core = Math.max(0, this.core - enemy.spec.coreDamage);
        this.effect('breach', enemy.lane, -0.35);
      } else {
        i++;
        continue;
      }
      this.enemies.splice(i, 1);
    }
    const keeper = this.keeper;
    if (keeper && this.keeperPhase === 1 && keeper.hp <= keeper.spec.hp * 0.55) {
      this.keeperPhase = 2;
      this.phaseAt = this.now;
      this.effect('phase', keeper.lane, keeper.x);
      if (!this.valveWarnings.some((event) => event.source === 'keeper')) this.warnKeeper();
    }
    if (this.core === 0) this.result = 'defeat';
    else if (this.spawned === this.spawns.length && this.enemies.length === 0) this.result = 'victory';
    if (this.result) this.effect(this.result, 0, 0);
  }
}
