import type { CampaignRun } from './campaign.ts';
import { heading, ticks } from './sim.ts';
import type { Point, SpellEffect } from './sim.ts';

const tau = Math.PI * 2;
const palettes: Record<string, [string, string]> = {
  'wick-dart': ['#ffc276', '#f08b42'], 'comet-thread': ['#ffc080', '#fa6e3a'],
  'prism-ring': ['#d1abff', '#9473e7'], 'crown-of-glass': ['#ede1ff', '#a089fa'],
  'bog-bloom': ['#94deac', '#32946a'], 'green-midnight': ['#d1f48c', '#56a65d'],
  foxfire: ['#a5ffff', '#3bd5dc'], 'lantern-pack': ['#c3fcff', '#55c4e9'],
  'hex-bell': ['#ffd291', '#8a83dc'], 'mirror-ward': ['#b7ffdf', '#51b7a9'],
  starfall: ['#e0c8ff', '#ad8df7'], 'lantern-burst': ['#ffe2a3', '#ff8b44'],
};
const accents: Record<string, [string, string]> = {
  'ember-lantern': ['#ffcb7c', '#f56239'], 'prism-lantern': ['#e2c3ff', '#a887ed'],
  'warden-lantern': ['#fff4d7', '#c98437'],
};
const white = '#fff8ea';

export class WeaponEffects {
  private run?: CampaignRun;
  private effects: SpellEffect[] = [];

  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  clear() { this.effects.length = 0; }

  private contour(radius: number, color: string, width = 2, dash: number[] = []) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, tau);
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private shard(x: number, y: number, reach: number, color: string, width = .46) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + reach, y);
    ctx.lineTo(x, y - reach * width);
    ctx.lineTo(x - reach * .65, y);
    ctx.lineTo(x, y + reach * width);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private star(radius: number, color: string) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * tau / 12 - Math.PI / 2;
      const r = i % 2 ? radius * .3 : radius;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private bolt(spell: string, run: CampaignRun, trail: boolean, low: boolean, motion: boolean) {
    const ctx = this.ctx;
    const fox = spell === 'foxfire' || spell === 'lantern-pack';
    const comet = spell === 'comet-thread';
    const weapon = !fox && run.weapon ? accents[run.weapon] : undefined;
    const [bright, dark] = comet || !weapon ? palettes[spell] : weapon;
    const rank = run.build.get('wick-dart') ?? 1;
    const detail = fox ? 0 : Math.min(4, Math.max(0, rank - 2) + run.weaponRank);
    const reach = trail ? (motion ? 16 + detail * 4 + (comet ? 14 : 0) : 12) : 0;
    if (reach) {
      ctx.beginPath();
      ctx.moveTo(-reach, 0);
      ctx.quadraticCurveTo(-reach * .5, fox ? -10 : -2, 1, 0);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.stroke();
      if (!low && (comet || weapon || detail > 0)) {
        for (let i = 0; i < Math.min(4, 1 + detail); i++) {
          const side = i % 2 ? -1 : 1;
          const wave = motion ? Math.sin(run.tick * .25 + i) : .8;
          ctx.beginPath();
          ctx.moveTo(-reach + i * 3, side * (3 + i));
          ctx.bezierCurveTo(-reach * .6, -side * 8 * wave, -6, side * 6, 0, 0);
          ctx.lineWidth = i === 0 ? 1.5 : 1;
          ctx.strokeStyle = i % 2 ? dark : weapon?.[0] ?? bright;
          ctx.stroke();
        }
      }
    }
    if (fox) {
      ctx.beginPath();
      ctx.moveTo(9, 0); ctx.quadraticCurveTo(1, -8, -7, -3);
      ctx.quadraticCurveTo(-2, 0, -8, 4); ctx.quadraticCurveTo(3, 8, 9, 0);
      ctx.fillStyle = bright;
      ctx.fill();
    } else if (run.weapon === 'ember-lantern') {
      const split = 3 + run.weaponRank;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-4, -split, 11, -split);
      ctx.lineTo(6, 0); ctx.lineTo(11, split);
      ctx.quadraticCurveTo(-2, split + 2, -12, 0);
      ctx.fillStyle = '#ff8c4d'; ctx.fill();
      if (!low) this.shard(-3, 0, 9, '#ffd485', .24);
    } else if (run.weapon === 'prism-lantern') {
      this.shard(0, 0, 11 + run.weaponRank, '#c099fb', .63);
      this.shard(0, -2, 7, '#f0dbff', .4);
      if (!low) this.shard(-4, 3, 6, '#9f73e2');
    } else if (run.weapon === 'warden-lantern') {
      this.contour(7, '#fbe0a0', 2.2, [7, 3]);
      this.shard(-3, 0, 10, '#fff3dd');
      if (!low && trail) this.contour(12 + run.weaponRank, '#dec28580', 1.5, [4, 5]);
    } else this.shard(0, 0, comet ? 10 : 8, bright, .45);
    this.shard(3, 0, 4, white, .54);
  }

  draw(run: CampaignRun, visible: (at: Point) => boolean, low: boolean, motion: boolean) {
    const ctx = this.ctx;
    if (this.run !== run) { this.run = run; this.clear(); }
    const lifetime = (effect: SpellEffect) => effect.kind === 'hit' ? 9 : effect.kind === 'cast' ? 7 :
      effect.kind === 'spread' ? 14 : effect.spell === 'lantern-burst' ? 26 : effect.spell === 'wick-dart' ? 11 : 19;
    this.effects = this.effects.filter(effect => run.tick - effect.tick < lifetime(effect) && visible(effect.at));
    for (const effect of run.spellEffects) {
      if (!visible(effect.at)) continue;
      if (effect.kind === 'hit' && this.effects.some(other => other.kind === 'hit' && other.spell === effect.spell &&
        effect.tick - other.tick < 3 && Math.hypot(other.at.x - effect.at.x, other.at.y - effect.at.y) < 12)) continue;
      this.effects.push(effect);
    }
    if (this.effects.length > 70) {
      const major = this.effects.filter(effect => effect.kind === 'ring' || effect.kind === 'spread').slice(-45);
      const other = this.effects.filter(effect => effect.kind === 'hit' || effect.kind === 'cast');
      this.effects = [...major, ...other.slice(-(70 - major.length))];
    }
    const midnight = run.build.has('green-midnight');
    for (const patch of run.patches) {
      if (!visible(patch)) continue;
      const [bright, dark] = palettes[midnight ? 'green-midnight' : 'bog-bloom'];
      const growth = motion ? Math.min(1, .8 + (run.tick - (patch.born ?? 0)) / 65) : 1;
      ctx.save();
      ctx.translate(patch.x, patch.y);
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const angle = tau * i / 64;
        const radius = patch.radius * (1 - .07 * (1 + Math.sin(angle * 10)));
        ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      }
      ctx.fillStyle = dark + '38';
      ctx.fill();
      ctx.strokeStyle = bright + 'a0';
      ctx.lineWidth = 2;
      if (!low) ctx.stroke();
      this.contour(patch.radius, bright + (low ? 'a0' : '50'), low ? 2 : 1, [2, 6]);
      for (let i = 0; i < (low ? 3 : 8); i++) {
        ctx.rotate(tau / (low ? 3 : 8));
        this.shard(patch.radius * .73 * growth, 0, 7, bright + 'b0');
        if (midnight && !low) this.shard(patch.radius * .55 * growth, 0, 5, white + '82');
      }
      ctx.restore();
    }
    for (const meteor of run.meteors) {
      if (!visible(meteor)) continue;
      ctx.save();
      ctx.translate(meteor.x, meteor.y);
      this.contour(meteor.radius, '#d8bfffcd', 2, [2, 7]);
      this.star(10, '#d8bfff');
      ctx.restore();
    }
    const crown = run.build.has('crown-of-glass');
    for (const blade of run.orbit) {
      if (!visible(blade)) continue;
      ctx.save();
      ctx.translate(blade.x, blade.y);
      ctx.rotate(heading(run.player, blade) + Math.PI / 2);
      ctx.beginPath();
      const radius = run.rank(crown ? 'crown-of-glass' : 'prism-ring').radius * (run.rank('lantern-oil').areaMultiplier ?? 1);
      ctx.arc(0, radius, radius, -Math.PI / 2 - .3, -Math.PI / 2 + .12);
      ctx.strokeStyle = '#b296ed8c';
      ctx.lineWidth = 2;
      ctx.stroke();
      this.shard(0, 0, 12, '#c6a5ff');
      this.shard(1, -1, 7, white);
      if (crown && !low) {
        ctx.beginPath(); ctx.arc(0, 0, 14, 3.5, 6.6);
        ctx.strokeStyle = '#efe1ff'; ctx.stroke();
      }
      ctx.restore();
    }
    let trails = low ? 6 : 12;
    for (const bolt of run.bolts) {
      if (!visible(bolt)) continue;
      ctx.save();
      ctx.translate(bolt.x, bolt.y);
      ctx.rotate(Math.atan2(bolt.vy, bolt.vx));
      this.bolt(bolt.source === 'foxfire' ? run.build.has('lantern-pack') ? 'lantern-pack' : 'foxfire' :
        bolt.comet ? 'comet-thread' : 'wick-dart', run, trails-- > 0, low, motion);
      ctx.restore();
    }
    let particles = low ? 64 : 160;
    for (const effect of this.effects) {
      const initial = palettes[effect.spell];
      if (!initial) continue;
      const main = effect.spell === 'wick-dart' || effect.spell === 'comet-thread';
      const weapon = main ? run.weapon : undefined;
      const [bright, dark] = weapon ? accents[weapon] ?? initial :
        effect.spell === 'lantern-burst' && run.weapon === 'warden-lantern' ? ['#fff1d3', '#dcae6d'] : initial;
      const age = (run.tick - effect.tick) / lifetime(effect);
      ctx.save();
      const muzzle = main && effect.kind === 'cast';
      ctx.translate(effect.at.x + (muzzle ? (run.facing.x < -.1 ? -14 : 14) : 0), effect.at.y - (muzzle ? 15 : 0));
      ctx.globalAlpha = Math.max(0, 1 - age);
      if (effect.kind === 'spread' && effect.to) {
        const dx = effect.to.x - effect.at.x;
        const dy = effect.to.y - effect.at.y;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(dx * .5 - dy * .26, dy * .5 + dx * .26, dx, dy);
        ctx.strokeStyle = bright; ctx.lineWidth = 3; ctx.stroke();
      } else if (effect.kind === 'ring') {
        const radius = effect.radius!;
        if (effect.spell === 'starfall') {
          ctx.beginPath(); ctx.moveTo(-30, -85); ctx.lineTo(0, 0);
          ctx.strokeStyle = white; ctx.lineWidth = 4; ctx.stroke();
          this.star(radius, bright);
        } else if (effect.spell === 'mirror-ward') {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = i * tau / 6;
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          }
          ctx.closePath(); ctx.strokeStyle = bright; ctx.lineWidth = 3; ctx.stroke();
        } else {
          const segmented = ['crown-of-glass', 'lantern-burst', 'hex-bell'].includes(effect.spell);
          const outward = motion ? radius * (.2 + Math.min(1, age * 2.5) * .8) : radius;
          if (!low) this.contour(radius, bright + '82', 1, segmented ? [8, 7] : []);
          this.contour(low ? radius : outward, bright, effect.spell === 'lantern-burst' ? 5 : 2.5, segmented ? [12, 6] : []);
          if (effect.spell === 'hex-bell' && !low) this.contour(Math.max(3, outward - 5), dark, 2);
          if (effect.spell === 'lantern-burst' && age < .38) {
            const spark = 12 + age * 62;
            this.contour(spark, white, 3);
          }
          if (effect.spell === 'lantern-pack' || effect.spell === 'lantern-burst') {
            const count = Math.min(particles, low ? 4 : 9);
            particles -= count;
            for (let i = 0; i < count; i++) {
              ctx.save();
              ctx.rotate(effect.spell === 'lantern-pack' ? (effect.angle ?? 0) + (i - count / 2) * .21 : i * tau / count);
              this.shard(outward, 0, 6, bright);
              ctx.restore();
            }
          }
        }
      } else {
        const cast = effect.kind === 'cast';
        ctx.rotate(effect.angle ?? (effect.tick * .618) % tau);
        this.shard(cast ? 12 : 0, 0, cast ? 12 : 8, bright);
        this.shard(cast ? 14 : 0, 0, cast ? 7 : 4, white);
        if (weapon === 'warden-lantern') {
          const r = 7 + age * (motion ? 16 : 7);
          this.contour(r, '#fff1d3', 2, [6, 4]);
          if (!low) this.contour(r + 4 + run.weaponRank, '#c9944a', 1, [5, 5]);
        }
        if (!cast && effect.spell === 'lantern-burst') this.contour(7 + age * 12, bright, 2);
        const count = Math.min(particles, cast ? 0 : low || !motion ? 2 : weapon === 'prism-lantern' ? 5 : 4);
        particles -= count;
        for (let i = 0; i < count; i++) {
          ctx.save();
          ctx.rotate(weapon === 'prism-lantern' ? i * tau / count : (i - 1.5) * (weapon === 'ember-lantern' ? .53 : 1.1));
          this.shard(7 + (motion ? age * 20 : 5), 0, weapon === 'warden-lantern' ? 4.5 : 3.5, i % 2 ? dark : bright);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  guard(point: Point, count: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.beginPath();
    ctx.moveTo(-22, -7); ctx.lineTo(0, -22); ctx.lineTo(22, -7);
    ctx.lineTo(16, 15); ctx.lineTo(0, 23); ctx.lineTo(-16, 15); ctx.closePath();
    ctx.fillStyle = '#7cd8b625'; ctx.fill();
    ctx.strokeStyle = '#aef4d6'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < count; i++) this.shard((i - (count - 1) / 2) * 8, 24, 3.5, '#bbffe3');
    ctx.restore();
  }
}

export const pickupLift = (age: number) => age < ticks(.36) ? Math.sin(age / ticks(.36) * Math.PI) * 19 : 0;
