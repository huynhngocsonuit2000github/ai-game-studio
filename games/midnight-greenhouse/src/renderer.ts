import { COLUMNS, HZ, LANES } from './content.js';
import type { CardId, Content, EnemyId } from './content.js';
import type { Garden, Effect } from './simulation.js';

import { bodyMotion, drawPose, enemyPose, loadImage, loadMotion, plantPose } from './motion.js';
import type { Motion, Pose } from './motion.js';

export async function loadArena(content: Content) {
  const images = new Map<string, HTMLImageElement>();
  const motion = new Map<string, Motion>();
  const [board] = await Promise.all([
    loadImage('./art/' + content.arena.boardAsset),
    ...Object.entries(content.sprites).map(async ([id, sprite]) => {
      const [still, animation] = await Promise.allSettled([
        loadImage('./art/' + sprite.asset), loadMotion(id as CardId | EnemyId),
      ]);
      if (still.status === 'fulfilled') images.set(id, still.value);
      if (animation.status === 'fulfilled' && animation.value) motion.set(id, animation.value);
      else console.warn('Greenhouse animation unavailable:', id);
    }),
  ]);
  return { board, images, motion };
}

export class Painter {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private left: number;
  private tile: number;
  private edges: number[];
  private feet: number[];
  private canvas: HTMLCanvasElement;
  private observer: ResizeObserver;
  private visualAspect = 1;
  private boxWidth = 0;
  private boxHeight = 0;
  private dprQuery?: MediaQueryList;
  private lastDraw?: () => void;

  constructor(canvas: HTMLCanvasElement, private content: Content, private art: Awaited<ReturnType<typeof loadArena>>) {
    const { artSize, xPlantSpan, visualRowEdges, feetY } = content.arena;
    [this.width, this.height] = artSize;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    ctx.setTransform(canvas.width / this.width, 0, 0, canvas.height / this.height, 0, 0);
    this.left = xPlantSpan[0] * this.width;
    this.tile = (xPlantSpan[1] - xPlantSpan[0]) * this.width / COLUMNS;
    this.edges = visualRowEdges.map((edge) => edge * this.height);
    this.feet = feetY.map((foot) => foot * this.height);
    this.observer = new ResizeObserver(([entry]) => {
      if (!(entry.contentRect.width > 0 && entry.contentRect.height > 0)) return;
      this.boxWidth = entry.contentRect.width;
      this.boxHeight = entry.contentRect.height;
      this.lastDraw?.();
    });
    this.observer.observe(canvas);
    this.watchDpr();
  }

  private watchDpr = () => {
    this.dprQuery?.removeEventListener('change', this.watchDpr);
    this.dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    this.dprQuery.addEventListener('change', this.watchDpr);
    this.lastDraw?.();
  };

  dispose() {
    this.observer.disconnect();
    this.dprQuery?.removeEventListener('change', this.watchDpr);
    this.lastDraw = undefined;
  }

  private fitCanvas() {
    const width = this.boxWidth || this.canvas.clientWidth || this.width;
    const height = this.boxHeight || this.canvas.clientHeight || this.height;
    const dpr = window.devicePixelRatio || 1;
    const budget = Math.sqrt(6_000_000 / (width * height));
    const pixelRatio = Math.min(dpr, 2, budget);
    const targetWidth = Math.max(1, Math.floor(width * pixelRatio));
    const targetHeight = Math.max(1, Math.floor(height * pixelRatio));
    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.ctx.setTransform(targetWidth / this.width, 0, 0, targetHeight / this.height, 0, 0);
    }
    this.visualAspect = (height / this.height) / (width / this.width);
  }

  private x(tile: number) { return this.left + tile * this.tile; }

  private sprite(id: CardId | EnemyId, x: number, lane: number, pose: Pose, reduced: boolean, hostile: boolean) {
    const context = this.ctx;
    const sprite = this.content.sprites[id];
    const image = this.art.images.get(id);
    const frames = this.art.motion.get(id);
    if (!sprite || (!image && !frames)) return;
    const row = this.edges[lane + 1] - this.edges[lane];
    const size = id === 'keeper' ? 1.03 : hostile ? 0.9 : 0.85;
    const rowHeight = row * size;
    const largest = Math.max(1, sprite.size[0] / sprite.size[1]);
    const visibleHeight = Math.min(rowHeight, this.tile * (id === 'keeper' ? 1.28 : 0.96) / (this.visualAspect * largest));
    const height = visibleHeight / (id === 'keeper' ? 0.64 : 0.67);
    const scale = visibleHeight / sprite.size[1];
    context.save();
    context.translate(this.x(x), this.feet[lane]);
    context.scale(this.visualAspect, 1);
    const movement = reduced ? undefined : bodyMotion(id, pose);
    const lift = -(movement?.y ?? 0);
    context.fillStyle = lift > .08 ? '#2c251932' : '#2c25194b';
    context.beginPath();
    context.ellipse(0, 0, sprite.size[0] * scale * (.36 - lift * .5), 7 - lift * 12, 0, 0, Math.PI * 2);
    context.fill();
    if (pose.clip === 'fall') context.globalAlpha = Math.min(1, (45 - pose.age) / 13);
    if (movement) {
      const { x, y, lean, stretch } = movement;
      // The shear bends the upper body while keeping the atlas foot registration in place.
      context.transform(1 - stretch * .38, 0, -lean, 1 + stretch, x * visibleHeight, y * visibleHeight);
    }
    if ((!frames || !drawPose(context, frames, pose, height, reduced)) && image) {
      context.drawImage(image, -sprite.anchorPx[0] * scale, -sprite.anchorPx[1] * scale,
        sprite.size[0] * scale, sprite.size[1] * scale);
    }
    context.restore();
  }

  private health(x: number, lane: number, ratio: number, hostile: boolean, immune = false) {
    if (ratio >= 1 && !immune) return;
    const ctx = this.ctx;
    const cx = this.x(x), y = this.feet[lane] - (hostile ? 147 : 9);
    ctx.fillStyle = '#071116';
    ctx.fillRect(cx - 26, y, 52, 9);
    ctx.fillStyle = hostile ? '#ffc19d' : '#b8e894';
    ctx.fillRect(cx - 24, y + 2, 48 * ratio, 5);
    if (!immune) return;
    ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = '#fff0c4';
    ctx.textAlign = 'center';
    ctx.fillText('ϟ̸', cx, y - 5);
  }

  private line(points: [number, number][], color: string, width: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  private sparks(x: number, y: number, progress: number, radius: number, color: string, count = 6) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = .94 * (1 - progress);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + .24;
      const spread = radius * (.31 + progress * .86) * (i % 2 ? .65 : 1);
      const length = radius * .28 * (1 - progress) + 3;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      ctx.moveTo(x + dx * spread, y + dy * spread * .72);
      ctx.lineTo(x + dx * (spread + length), y + dy * (spread + length) * .72);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  private lash(x: number, tx: number, y: number, progress: number) {
    const ctx = this.ctx;
    const span = tx - x;
    const bend = Math.sin(Math.PI * progress) * 34;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + span * .18, y - 66);
    ctx.bezierCurveTo(x + span * .46, y - 125 - bend, tx - span * .21, y - 96 + bend, tx, y - 48);
    ctx.lineWidth = 13;
    ctx.strokeStyle = '#234f32';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d6ed91';
    ctx.stroke();
    ctx.restore();
  }

  private effect(effect: Effect, now: number, motion: boolean) {
    if (effect.lane < 0) return;
    const ctx = this.ctx;
    const age = (now - effect.at) / HZ;
    const y = this.feet[effect.lane];
    const x = this.x(effect.x);
    if (effect.kind === 'warning') return;
    if (effect.kind === 'bell' && age < 1.05) {
      const right = this.x(COLUMNS);
      const pos = x + (right - x) * Math.min(1, 0.14 + age * 1.35);
      ctx.fillStyle = '#f6ca695b';
      ctx.fillRect(this.left, this.edges[effect.lane], right - this.left, this.edges[effect.lane + 1] - this.edges[effect.lane]);
      if (motion) this.line([[pos - 32, y - 104], [pos, y - 56], [pos - 36, y + 11]], '#925234', 8);
    }
    if (effect.kind === 'income' || effect.kind === 'heal') {
      if (age > 0.95) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (0.95 - age) * 4);
      ctx.font = 'bold 25px system-ui';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#102023';
      ctx.fillStyle = effect.kind === 'heal' ? '#bdf3ac' : '#ffe8ab';
      const height = y - 107 - (motion ? age * 34 : 0);
      const target = this.x(effect.targets?.[0] ?? effect.x);
      if (effect.kind === 'heal' && effect.targets && age < 0.45) {
        this.line([[x, y - 65], [(x + target) / 2, y - 96], [target, y - 60]], '#4c8448', 7);
        this.line([[x, y - 65], [(x + target) / 2, y - 96], [target, y - 60]], '#d4f1a0', 3);
        if (motion) this.sparks(target, y - 66, age / .45, 46, '#e7faa6');
      }
      const label = effect.value === undefined ? '+' : '+' + Math.round(effect.value);
      ctx.strokeText(label, target, height);
      ctx.fillText(label, target, height);
      ctx.restore();
      return;
    }
    if (effect.kind === 'breach' && age < 0.65) {
      ctx.fillStyle = 'rgba(241,105,71,' + (0.4 * (1 - age / 0.65)) + ')';
      ctx.fillRect(this.left - 26, this.edges[effect.lane], 73, this.edges[effect.lane + 1] - this.edges[effect.lane]);
    }
    if (effect.kind === 'pod' && age <= 0.42) {
      const spread = motion ? Math.min(1, 0.35 + age * 3) : 1;
      ctx.strokeStyle = '#ffe5a9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y - 32, this.tile * 1.35 * spread, 31 * spread, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (motion) this.sparks(x, y - 69, age / .42, 97, '#fff1a0', 9);
    }
    if (effect.kind === 'insulated' && age < 0.55) {
      ctx.save();
      ctx.fillStyle = '#fff3cb';
      ctx.strokeStyle = '#3c3651';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + 19, y - 101, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px system-ui';
      ctx.fillStyle = '#3c3651';
      ctx.fillText('ϟ̸', x + 19, y - 95);
      ctx.restore();
    }
    if (motion && effect.kind === 'fern' && age < .22) this.sparks(x + 48, y - 90, age / .22, 29, '#f7ffbf', 5);
    if (motion && effect.kind === 'impact' && age < .20) this.sparks(x, y - 78, age / .20, 39, '#ffe09e', 5);
    if (effect.kind === 'bite' && age < .23 && effect.targets) {
      const target = this.x(effect.targets[0]);
      // The contact marks only appear after the simulation lands a bite.
      this.line([[target + 31, y - 94], [target + 8, y - 65]], '#fff1ce', 7);
      this.line([[target + 47, y - 80], [target + 25, y - 56]], '#ffcf9d', 5);
      if (motion) this.sparks(target + 20, y - 71, age / .23, 34, '#ffe1af');
    }
    if (motion && effect.kind === 'root' && age < .29 && effect.targets) this.lash(x, this.x(effect.targets[0]), y, age / .29);
    if (motion && effect.kind === 'phase' && age < .54) this.sparks(x, y - 89, age / .54, 99, '#f7cbff', 10);
    if (age > 0.17) return;
    if (effect.kind === 'shock' && effect.targets) {
      const points: [number, number][] = [[x, y - 73]];
      for (const hit of effect.targets) {
        const tx = this.x(hit);
        const [previous] = points[points.length - 1];
        const bend = motion ? Math.sin(age * 38 + hit) * 24 : 0;
        points.push([previous + (tx - previous) * 0.36, y - 100 + bend], [previous + (tx - previous) * 0.72, y - 56 - bend], [tx, y - 82]);
      }
      this.line(points, '#81ebea99', 17);
      this.line(points, '#fff4b2', 5);
    } else if (effect.kind === 'root') {
      const tx = this.x(effect.targets?.[0] ?? effect.x);
      this.line([[x, y - 23], [tx - 22, y - 10], [tx, y - 34], [tx + 16, y - 14]], '#c5ee98', 5);
    } else if (effect.kind === 'shield-chip') {
      this.line([[x - 34, y - 72], [x - 50, y - 88], [x - 61, y - 81]], '#ffb82c', 7);
      this.line([[x - 34, y - 72], [x - 53, y - 58]], '#fff0ad', 5);
    } else if (effect.kind === 'plant' || effect.kind === 'impact') {
      ctx.strokeStyle = effect.kind === 'plant' ? '#c9f3a4' : '#ffdbb2';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y - (effect.kind === 'plant' ? 6 : 70), 17 + (motion ? age * 80 : 6),
        6 + (motion ? age * 21 : 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  draw(game: Garden, reduced: boolean, aftermath = 0, ghost?: { id: CardId; lane: number; col: number }, fraction = 0) {
    this.lastDraw = () => this.draw(game, reduced, aftermath, ghost, fraction);
    this.fitCanvas();
    const ctx = this.ctx;
    const motion = !reduced;
    ctx.drawImage(this.art.board, 0, 0, this.width, this.height);
    const upcoming = game.nextThreat;
    const first = game.threats[0];
    const kickoff = game.now < first.at && game.wave === 0 && game.plants.length === 0;
    for (let lane = 0; lane < LANES; lane++) {
      const top = this.edges[lane], height = this.edges[lane + 1] - top;
      const wet = game.wet === lane;
      const warning = (kickoff && first.lane === lane) || (upcoming?.lane === lane && upcoming.at - game.now <= 6 * HZ);
      ctx.fillStyle = wet ? '#4a98ad48' : kickoff && first.lane === lane ? '#fef0a342' : '#fae6ad0a';
      ctx.fillRect(this.left, top, this.tile * COLUMNS, height);
      ctx.strokeStyle = wet ? '#a5fbf17c' : '#fce7b145';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.left, top, this.tile * COLUMNS, height);
      for (let col = 1; col < COLUMNS; col++) {
        this.line([[this.x(col), top + 4], [this.x(col), top + height - 4]], '#e9f1da32', 1);
      }
      if (wet) {
        const offset = motion ? (game.now * 6) % 76 : 0;
        for (let ripple = -1; ripple < 15; ripple++) {
          const px = this.left + ripple * 76 + offset;
          if (px < this.left || px + 17 > this.x(COLUMNS)) continue;
          this.line([[px, top + height - 12], [px + 9, top + height - 8], [px + 17, top + height - 12]], '#b8fff0a0', 2);
        }
      }
      const valve = game.valveState(lane);
      const closed = valve.opensAt > game.now;
      if (closed || Number.isFinite(valve.closesAt)) {
        ctx.save();
        const extent = this.tile * COLUMNS;
        ctx.beginPath();
        ctx.rect(this.left, top, extent, height);
        ctx.clip();
        ctx.fillStyle = closed ? '#661e254d' : '#7c541f3b';
        ctx.fillRect(this.left, top, extent, height);
        for (let offset = -height; offset < extent; offset += 50) {
          const stripe = this.left + offset;
          this.line([[stripe, top + height], [stripe + height, top]], closed ? '#ff817d5e' : '#ffdc845c', closed ? 6 : 3);
        }
        ctx.restore();
      }
      if (warning) {
        const right = this.x(COLUMNS);
        ctx.fillStyle = '#622a22a6';
        ctx.fillRect(right + 7, top + 8, 81, height - 16);
        ctx.font = 'bold 39px system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe1a0';
        ctx.fillText('!', right + 47, top + height * 0.62);
      }
      const units = [
        ...game.plants.filter((unit) => unit.lane === lane).map((unit) => ({
          id: unit.card.id, x: unit.x, pose: plantPose(unit, game), ratio: unit.hp / unit.card.hp, hostile: false,
          held: false, arming: unit.card.id === 'pod',
        })),
        ...game.enemies.filter((unit) => unit.lane === lane).map((unit) => ({
          id: unit.spec.id,
          x: unit.x + (motion && unit.moving && unit.previousX !== undefined ? (unit.previousX - unit.x) * (1 - fraction) : 0)
            + (unit.id % 3 - 1) * 0.075,
          pose: enemyPose(unit, game),
          ratio: unit.hp / unit.spec.hp, hostile: true, arming: false,
          held: unit.rootedUntil > game.now || unit.stunnedUntil > game.now,
        })),
      ].sort((a, b) => a.x - b.x);
      for (const fallen of game.fallen) {
        const age = game.now - fallen.at + aftermath + fraction;
        if (fallen.lane !== lane || age >= (fallen.clip === 'burst' ? 18 : 45)) continue;
        this.sprite(fallen.id, fallen.x, lane, { clip: fallen.clip, age }, reduced,
          !game.cards.has(fallen.id as CardId));
      }
      if (ghost?.lane === lane) {
        ctx.save();
        ctx.globalAlpha = 0.48;
        this.sprite(ghost.id, ghost.col + 0.5, lane, { clip: 'idle', age: 0 }, true, false);
        ctx.restore();
      }
      for (const unit of units) {
        const pose = { ...unit.pose, age: unit.pose.age + fraction };
        this.sprite(unit.id, unit.x, lane, pose, reduced, unit.hostile);
        const x = this.x(unit.x), y = this.feet[lane];
        if (unit.held) this.line([[x - 22, y], [x + 22, y]], '#efe9a2', 5);
        if (unit.id !== 'keeper') this.health(unit.x, lane, unit.ratio, unit.hostile, unit.id === 'raincoat');
        if (unit.id === 'moss' && unit.ratio <= 0.65) {
          this.line([[x - 23, y - 35], [x - 9, y - 42], [x - 4, y - 28], [x + 10, y - 38]],
            unit.ratio <= 0.30 ? '#a43d2c' : '#785732', 5);
        }
        if (unit.arming) {
          ctx.fillStyle = unit.pose.clip === 'arm' ? '#f5b84f' : '#b5482d';
          ctx.beginPath();
          ctx.arc(x, y - 106, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    for (const shot of game.shots) {
      const elapsed = game.now - shot.fired + (motion ? fraction : 0);
      const lifetime = shot.at - shot.fired;
      const trail = motion ? Math.min(3, Math.floor(elapsed / 1.6)) : 0;
      for (let step = trail; step >= 0; step--) {
        const t = Math.min(1, (elapsed - step * 1.6) / lifetime);
        const x = this.x(shot.from + (shot.target.x - shot.from) * t);
        const y = this.feet[shot.target.lane] - 66 - Math.sin(t * Math.PI) * 61;
        ctx.fillStyle = step === 0 ? '#e9ffb8' : '#e7ff8c85';
        ctx.beginPath();
        ctx.ellipse(x, y, 12 - step * 2.2, 7 - step * 1.5, t - .5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const effect of game.effects) this.effect(effect, game.now + (motion ? fraction + aftermath : 0), motion);
  }
}
