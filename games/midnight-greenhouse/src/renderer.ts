import { COLUMNS, HZ, LANES } from './content.js';
import type { CardId, Content, EnemyId } from './content.js';
import type { Garden, Effect } from './simulation.js';

export function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

export async function loadArena(content: Content) {
  const board = await loadImage('./art/' + content.arena.boardAsset);
  const images = new Map(await Promise.all(Object.entries(content.sprites).map(async ([id, sprite]) =>
    [id, await loadImage('./art/' + sprite.asset)] as const)));
  return { board, images };
}

export class Painter {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private left: number;
  private tile: number;
  private edges: number[];
  private feet: number[];

  constructor(canvas: HTMLCanvasElement, private content: Content, private art: Awaited<ReturnType<typeof loadArena>>) {
    const { artSize, xPlantSpan, visualRowEdges, feetY } = content.arena;
    [this.width, this.height] = artSize;
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.left = xPlantSpan[0] * this.width;
    this.tile = (xPlantSpan[1] - xPlantSpan[0]) * this.width / COLUMNS;
    this.edges = visualRowEdges.map((edge) => edge * this.height);
    this.feet = feetY.map((foot) => foot * this.height);
  }

  private x(tile: number) { return this.left + tile * this.tile; }

  private sprite(id: CardId | EnemyId, x: number, lane: number, stamp: number, motion: boolean,
    acted: number, hurt: number, hostile: boolean, rooted = false) {
    const context = this.ctx;
    const sprite = this.content.sprites[id];
    const image = this.art.images.get(id);
    if (!image) return;
    const foot = this.feet[lane];
    const scale = (this.edges[lane + 1] - this.edges[lane]) * (id === 'keeper' ? 1.18 : hostile ? 0.83 : 0.74) / sprite.size[1];
    const phase = stamp * (id === 'courier' ? 0.42 : 0.19) + x;
    const stride = motion && !rooted ? Math.sin(phase) * (hostile ? 3 : 1.7) : 0;
    const impulse = motion ? Math.max(0, 1 - (stamp - acted) / 9) : 0;
    const impact = stamp - hurt < 5;
    context.save();
    context.translate(this.x(x), foot);
    context.fillStyle = '#070f12a0';
    context.beginPath();
    context.ellipse(0, -1, sprite.size[0] * scale * 0.39, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.translate((hostile ? -9 : 6) * impulse, stride);
    if (motion) context.rotate(stride * 0.009 + impulse * (hostile ? -0.095 : 0.07));
    if (impact) context.shadowColor = '#ffc37c';
    context.shadowBlur = impact ? 13 : 0;
    context.drawImage(image, -sprite.anchorPx[0] * scale, -sprite.anchorPx[1] * scale,
      sprite.size[0] * scale, sprite.size[1] * scale);
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

  private effect(effect: Effect, now: number, motion: boolean) {
    if (effect.lane < 0) return;
    const ctx = this.ctx;
    const age = (now - effect.at) / HZ;
    const y = this.feet[effect.lane];
    const x = this.x(effect.x);
    if (effect.kind === 'warning') return;
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
    }
    if (age > 0.17) return;
    if (effect.kind === 'shock' && effect.targets) {
      const points: [number, number][] = [[x, y - 73]];
      for (const hit of effect.targets) {
        const tx = this.x(hit);
        const [previous] = points[points.length - 1];
        points.push([previous + (tx - previous) * 0.36, y - 100], [previous + (tx - previous) * 0.72, y - 56], [tx, y - 82]);
      }
      this.line(points, '#81ebea99', 17);
      this.line(points, '#fff4b2', 5);
    } else if (effect.kind === 'root') {
      const tx = this.x(effect.targets?.[0] ?? effect.x);
      this.line([[x, y - 23], [tx - 22, y - 10], [tx, y - 34], [tx + 16, y - 14]], '#c5ee98', 5);
    } else if (effect.kind === 'plant' || effect.kind === 'impact') {
      ctx.strokeStyle = effect.kind === 'plant' ? '#c9f3a4' : '#ffdbb2';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y - (effect.kind === 'plant' ? 6 : 70), 17 + age * 80, 6 + age * 21, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  draw(game: Garden, reduced: boolean) {
    const ctx = this.ctx;
    const motion = !reduced;
    ctx.drawImage(this.art.board, 0, 0);
    const upcoming = game.nextThreat;
    for (let lane = 0; lane < LANES; lane++) {
      const top = this.edges[lane], height = this.edges[lane + 1] - top;
      const wet = game.wet === lane;
      const warning = upcoming?.lane === lane && upcoming.at - game.now <= 6 * HZ;
      ctx.fillStyle = wet ? '#166a7570' : '#101b2538';
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
          arming: unit.card.id === 'pod' && unit.ready > game.now,
          id: unit.card.id, x: unit.x, acted: unit.acted, hurt: unit.hurt, ratio: unit.hp / unit.card.hp, hostile: false, rooted: false,
        })),
        ...game.enemies.filter((unit) => unit.lane === lane).map((unit) => ({
          arming: false, id: unit.spec.id, x: unit.x + (unit.id % 3 - 1) * 0.075, acted: unit.acted,
          hurt: unit.hurt, ratio: unit.hp / unit.spec.hp, hostile: true, rooted: unit.rootedUntil > game.now,
        })),
      ].sort((a, b) => a.x - b.x);
      for (const unit of units) {
        this.sprite(unit.id, unit.x, lane, game.now, motion, unit.acted, unit.hurt, unit.hostile, unit.rooted);
        if (unit.rooted) this.line([[this.x(unit.x) - 22, this.feet[lane]], [this.x(unit.x) + 22, this.feet[lane]]], '#d5f5a3', 5);
        if (unit.id !== 'keeper') this.health(unit.x, lane, unit.ratio, unit.hostile, unit.id === 'raincoat');
        if (unit.arming) {
          ctx.fillStyle = '#ffce86';
          ctx.beginPath();
          ctx.arc(this.x(unit.x), this.feet[lane] - 104, motion ? 4 + 2 * Math.sin(game.now / 5) : 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    for (const shot of game.shots) {
      const t = (game.now - shot.fired) / (shot.at - shot.fired);
      const x = this.x(shot.from + (shot.target.x - shot.from) * t);
      const y = this.feet[shot.target.lane] - 66 - Math.sin(t * Math.PI) * 61;
      ctx.fillStyle = '#e4efad';
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 6, -t, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const effect of game.effects) this.effect(effect, game.now, motion);
  }
}
