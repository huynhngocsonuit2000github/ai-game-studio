import type { EnemySpec, Level, Marker, Rect } from './level.ts';

export const STEP_MS = 1000 / 60;
const STEP = 1 / 60;
const HALF_WIDTH = 16;
const HEIGHT = 54;
const GRAVITY = 1400;
const RUN = 250;
const COYOTE_MS = 100;
const BUFFER_MS = 120;
const DAMAGE_TICKS = 54;
const RECOVERY_TICKS = 39;

type Phase = 'playing' | 'recovering' | 'cleared';

export interface Input {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly pressedJump: boolean;
}

export interface Result {
  readonly ticks: number;
  readonly fireflies: number;
  readonly deaths: number;
  readonly flawless: boolean;
}

type SessionEvent = 'jump' | 'land' | 'stomp' | 'seedCollected' | 'fireflyCollected' |
  'healthChanged' | 'lanternLit' | 'gateOpened' | 'fall' | 'respawn' | 'levelCleared';

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  grounded: boolean;
}

interface Enemy {
  spec: EnemySpec;
  x: number;
  y: number;
  direction: -1 | 1;
  defeated: boolean;
  turnTicks: number;
  dipping: boolean;
  warning: boolean;
}

function approach(value: number, target: number, distance: number) {
  return value < target ? Math.min(target, value + distance) : Math.max(target, value - distance);
}

function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

function near(player: Rect, marker: Marker, radius: number) {
  return overlaps(player, { x: marker.x - radius, y: marker.y - radius, width: radius * 2, height: radius * 2 });
}

function actorAt(marker: Marker): Player {
  return { x: marker.x, y: marker.y, vx: 0, vy: 0, facing: 1, grounded: true };
}

function enemyAt(spec: EnemySpec): Enemy {
  return { spec, x: spec.x, y: spec.y, direction: -1, defeated: false, turnTicks: 0, dipping: false, warning: false };
}

export class Session {
  readonly level: Level;
  readonly seeds = new Set<string>();
  readonly fireflies = new Set<string>();
  player: Player;
  enemies: Enemy[];
  phase: Phase = 'playing';
  hearts = 3;
  deaths = 0;
  ticks = 0;
  damageTicks = 0;
  checkpoint = false;
  result: Result | null = null;
  private recoveryTicks = 0;
  private enemyTicks = 0;
  private groundedAt = 0;
  private jumpUntil = -1;
  private variableJump = false;
  private events: SessionEvent[] = [];

  constructor(level: Level) {
    this.level = level;
    this.player = actorAt(level.spawn);
    this.enemies = level.enemies.map(enemyAt);
  }

  get gateOpen() {
    return this.seeds.size === this.level.seeds.length;
  }

  get atGate() {
    return near(this.body, { ...this.level.goal, y: this.level.goal.y - 40 }, 39);
  }

  private get body(): Rect {
    return { x: this.player.x - HALF_WIDTH, y: this.player.y - HEIGHT, width: HALF_WIDTH * 2, height: HEIGHT };
  }

  step(input: Input): readonly SessionEvent[] {
    this.events = [];
    if (this.phase === 'cleared') return this.events;
    this.ticks++;
    if (this.phase === 'recovering') {
      if (--this.recoveryTicks === 0) this.respawn();
      return this.events;
    }

    this.damageTicks = Math.max(0, this.damageTicks - 1);
    this.updateEnemies();
    const previousFeet = this.player.y;
    this.move(input);
    if (this.player.y >= this.level.killY) {
      this.recover();
      this.events.push('fall');
      return this.events;
    }

    const contact = this.checkEnemies(previousFeet);
    this.collect();
    if (contact !== undefined) this.hurt(contact);
    const bramble = this.level.hazards.find((hazard) => overlaps(this.body, hazard));
    if (bramble) this.hurt(bramble.x + bramble.width / 2);

    if (this.phase === 'playing' && this.gateOpen && this.atGate) {
      this.phase = 'cleared';
      this.result = Object.freeze({
        ticks: this.ticks, fireflies: this.fireflies.size, deaths: this.deaths, flawless: this.deaths === 0,
      });
      this.events.push('levelCleared');
    }
    return this.events;
  }

  private move(input: Input) {
    const player = this.player;
    const now = this.ticks * STEP_MS;
    if (player.grounded) this.groundedAt = now;
    if (input.pressedJump) this.jumpUntil = now + BUFFER_MS;
    const direction = Number(input.right) - Number(input.left);
    if (this.damageTicks <= DAMAGE_TICKS - 8) {
      const acceleration = player.grounded ? (direction ? 2000 : 2400) : 1650;
      player.vx = approach(player.vx, direction * RUN, acceleration * STEP);
      if (direction) player.facing = direction > 0 ? 1 : -1;
    }

    if (now <= this.jumpUntil && now - this.groundedAt <= COYOTE_MS + 0.001) {
      this.jumpUntil = -1;
      this.groundedAt = -Infinity;
      player.vy = -510;
      player.grounded = false;
      this.variableJump = true;
      this.events.push('jump');
    }
    if (this.variableJump && !input.jump) {
      player.vy = Math.max(player.vy, -265);
      this.variableJump = false;
    }

    player.x = Math.max(HALF_WIDTH, Math.min(this.level.width - HALF_WIDTH, player.x + player.vx * STEP));
    for (const solid of this.level.solids) {
      if (!overlaps(this.body, solid)) continue;
      if (player.vx > 0) player.x = solid.x - HALF_WIDTH;
      if (player.vx < 0) player.x = solid.x + solid.width + HALF_WIDTH;
      player.vx = 0;
    }

    const wasGrounded = player.grounded;
    const previousY = player.y;
    const previousVelocity = player.vy;
    player.vy = Math.min(720, player.vy + GRAVITY * STEP);
    player.y += (previousVelocity + player.vy) * STEP / 2;
    player.grounded = false;

    for (const solid of this.level.solids) {
      if (player.x + HALF_WIDTH <= solid.x || player.x - HALF_WIDTH >= solid.x + solid.width) continue;
      if (previousY <= solid.y && player.y >= solid.y) {
        player.y = solid.y;
        player.vy = 0;
        player.grounded = true;
        this.variableJump = false;
      }
      const bottom = solid.y + solid.height;
      if (previousY - HEIGHT >= bottom && player.y - HEIGHT < bottom) {
        player.y = bottom + HEIGHT;
        player.vy = 0;
        this.variableJump = false;
      }
    }
    if (player.grounded && !wasGrounded) this.events.push('land');
  }

  private updateEnemies() {
    this.enemyTicks++;
    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;
      const spec = enemy.spec;
      if (spec.type === 'beetle') {
        if (enemy.turnTicks > 0) {
          if (--enemy.turnTicks === 0) enemy.direction = enemy.direction === 1 ? -1 : 1;
          continue;
        }
        enemy.x += enemy.direction * 60 * STEP;
        if (enemy.x <= spec.left || enemy.x >= spec.right) {
          enemy.x = Math.max(spec.left, Math.min(spec.right, enemy.x));
          enemy.turnTicks = 11;
        }
      } else {
        const phase = (this.enemyTicks / 192 + spec.phaseOffset) % 1;
        const angle = phase * Math.PI * 2;
        enemy.x = spec.x + 48 * Math.sin(angle);
        enemy.y = spec.y - 20 * Math.cos(angle);
        enemy.direction = Math.cos(angle) >= 0 ? 1 : -1;
        enemy.warning = phase > 0.15 && phase <= 0.28;
        enemy.dipping = phase > 0.28 && phase < 0.57;
      }
    }
  }

  private checkEnemies(previousFeet: number): number | undefined {
    let contact: number | undefined;
    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;
      const beetle = enemy.spec.type === 'beetle';
      const bounds = beetle
        ? { x: enemy.x - 23, y: enemy.y - 35, width: 46, height: 35 }
        : { x: enemy.x - 22, y: enemy.y - 17, width: 44, height: 34 };
      if (!overlaps(this.body, bounds)) continue;
      if (beetle && previousFeet <= bounds.y + 3 && this.player.vy > 0) {
        enemy.defeated = true;
        this.player.y = bounds.y;
        this.player.vy = -365;
        this.player.grounded = false;
        this.groundedAt = -Infinity;
        this.variableJump = false;
        this.events.push('stomp');
        return undefined;
      }
      contact ??= enemy.x;
    }
    return contact;
  }

  private collect() {
    const wasOpen = this.gateOpen;
    for (const seed of this.level.seeds) {
      if (!this.seeds.has(seed.id) && near(this.body, seed, 13)) {
        this.seeds.add(seed.id);
        this.events.push('seedCollected');
      }
    }
    for (const item of this.level.fireflies) {
      if (!this.fireflies.has(item.id) && near(this.body, item, 11)) {
        this.fireflies.add(item.id);
        this.events.push('fireflyCollected');
      }
    }
    if (!this.checkpoint && near(this.body, { ...this.level.checkpoint, y: this.level.checkpoint.y - 27 }, 25)) {
      this.checkpoint = true;
      this.events.push('lanternLit');
    }
    if (!wasOpen && this.gateOpen) this.events.push('gateOpened');
  }

  private hurt(x: number) {
    if (this.damageTicks || this.phase !== 'playing') return;
    this.hearts--;
    this.damageTicks = DAMAGE_TICKS;
    this.events.push('healthChanged');
    if (this.hearts === 0) {
      this.recover();
    } else {
      this.player.vx = this.player.x < x ? -180 : 180;
      this.player.vy = -220;
      this.player.grounded = false;
      this.groundedAt = -Infinity;
      this.variableJump = false;
    }
  }

  private recover() {
    this.deaths++;
    this.phase = 'recovering';
    this.recoveryTicks = RECOVERY_TICKS;
  }

  private respawn() {
    this.player = actorAt(this.checkpoint ? this.level.checkpoint : this.level.spawn);
    this.enemies = this.level.enemies.map(enemyAt);
    this.enemyTicks = 0;
    this.damageTicks = 0;
    this.hearts = 3;
    this.jumpUntil = -1;
    this.groundedAt = this.ticks * STEP_MS;
    this.variableJump = false;
    this.phase = 'playing';
    this.events.push('respawn');
  }
}
