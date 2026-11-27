import { actors, garden, height, icons, orchard, viewHeight, viewWidth, width, world } from './content.ts';
import { camera, distance, random, vector } from './sim.ts';
import type { Cue, Point, Run } from './sim.ts';
import { bossLaneCenters, laneHalfWidth, tollGap, tollRings } from './slice.ts';
import type { GardenRun } from './slice.ts';
import actorsUrl from '../assets/runtime/atlases/actors.png?url';
import worldUrl from '../assets/runtime/atlases/world.png?url';
import iconsUrl from '../assets/runtime/atlases/skills.png?url';
import groundUrl from '../assets/runtime/art/garden-ground.webp?url';

type Frame = { x: number; y: number; w: number; h: number; pivot: number[]; displayMaxPx: number };
function load(url: string) {
  const img = new Image();
  img.src = url;
  return img.decode().then(() => img);
}

export async function loadArt() {
  const [actor, props, icon, ground] = await Promise.all([actorsUrl, worldUrl, iconsUrl, groundUrl].map(load));
  return { actor, props, icon, ground };
}

export function skillIcon(id: string) {
  const frame = (icons.frames as Record<string, Frame>)[id];
  if (!frame) return '';
  const scale = 42 / Math.max(frame.w, frame.h);
  const image = icons as typeof icons & { width?: number; height?: number; size?: number[] };
  const [w, h] = image.size ?? [image.width ?? 576, image.height ?? 384];
  return `<span class="skill-icon" aria-hidden="true" style="width:${frame.w * scale}px;height:${frame.h * scale}px;background-image:url('${iconsUrl}');background-size:${w * scale}px ${h * scale}px;background-position:-${frame.x * scale}px -${frame.y * scale}px"></span>`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private decor: (Point & { sprite: string })[] = [];
  private effects: (Cue & { until: number })[] = [];
  private run?: Run;
  private ground = document.createElement('canvas');
  motion = true;
  numbers = true;
  contrast = false;
  dawnScarf = false;

  constructor(private canvas: HTMLCanvasElement, private art: Awaited<ReturnType<typeof loadArt>>) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ground.width = width;
    this.ground.height = height;
    const ctx = this.ground.getContext('2d')!;
    ctx.fillStyle = ctx.createPattern(art.ground, 'repeat')!;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#0d181c19';
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    ctx.rect(35, 35, width - 70, height - 70);
    ctx.strokeStyle = '#ac997476';
    ctx.lineWidth = 5;
    ctx.stroke();
    for (const r of [96, 132, 170]) {
      ctx.beginPath();
      ctx.arc(1200, 650, r, 0, 2 * Math.PI);
      ctx.strokeStyle = '#b0ae8040';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private sprite(sheet: 'actor' | 'props', name: string, p: Point, scale = 1, flip = false, bob = 0) {
    const frame = ((sheet === 'actor' ? actors.frames : world.frames) as Record<string, Frame>)[name];
    if (!frame) return;
    const ctx = this.ctx;
    const factor = frame.displayMaxPx / Math.max(frame.w, frame.h) * scale;
    const w = frame.w * factor;
    const h = frame.h * factor;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(this.art[sheet], frame.x, frame.y, frame.w, frame.h, -w * frame.pivot[0], -h * frame.pivot[1] + bob, w, h);
    ctx.restore();
  }

  private ring(p: Point, radius: number, color: string, fill?: string, dash = false) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.setLineDash(dash ? [6, 6] : []);
    ctx.strokeStyle = color;
    ctx.lineWidth = this.contrast ? 3 : 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private hazard(p: Point, angle: number, half: number, radius: number, inner = 0, active = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.arc(0, 0, radius, angle - half, angle + half);
    if (inner) ctx.arc(0, 0, inner, angle + half, angle - half, true);
    else ctx.lineTo(0, 0);
    ctx.closePath();
    this.strokeHazard(active);
    ctx.restore();
  }

  private strokeHazard(active: boolean) {
    const ctx = this.ctx;
    ctx.fillStyle = active ? '#e15c3a65' : '#ad412c38';
    ctx.fill();
    ctx.strokeStyle = this.contrast ? '#ffe7ce' : '#ff9a66';
    ctx.lineWidth = active ? 3 : 2;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    for (let stripe = -560; stripe < 560; stripe += 13) {
      ctx.moveTo(stripe - 350, -350);
      ctx.lineTo(stripe + 350, 350);
    }
    ctx.globalAlpha = active ? .55 : .26;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  draw(run: GardenRun, cues: Cue[]) {
    const ctx = this.ctx;
    const v = camera(run.player);
    const dpr = Math.min(devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.5 : 2);
    const w = Math.round(viewWidth * dpr);
    const h = Math.round(viewHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, -v.x * dpr, -v.y * dpr);
    ctx.drawImage(this.ground, v.x, v.y, viewWidth, viewHeight, v.x, v.y, viewWidth, viewHeight);
    if (this.run !== run) {
      this.run = run;
      this.effects = [];
      const rng = random(run.seed ^ 884144);
      this.decor = [];
      for (let i = 0; i < garden.seedDecorCount; i++) {
        const p = { x: 60 + rng() * (width - 120), y: 60 + rng() * (height - 120) };
        if (distance(p, { x: orchard.point[0], y: orchard.point[1] }) > 94 &&
            distance(p, { x: 1200, y: 650 }) > 155) this.decor.push({ ...p, sprite: i % 2 ? 'stones' : 'mushrooms' });
      }
    }
    const visible = (p: Point) => p.x > v.x - 155 && p.x < v.x + viewWidth + 155 && p.y > v.y - 155 && p.y < v.y + viewHeight + 155;
    const entities: { y: number; draw: () => void }[] = [];
    for (const item of [...this.decor, ...garden.blockers]) {
      if (visible(item)) entities.push({ y: item.y, draw: () => this.sprite('props', item.sprite, item) });
    }
    for (const ward of run.wards) {
      if (!visible(ward)) continue;
      const disabled = run.wardComplete && !ward.lit;
      const outline = ward.lit ? '#f7c574ac' : disabled ? '#717b78a0' : '#79caba';
      this.ring(ward, ward.radius, outline, ward.lit ? '#edaf4032' : disabled ? '#14232130' : '#31b9a125', !ward.lit);
      if (ward.charge && !ward.lit && !disabled) {
        ctx.beginPath();
        ctx.arc(ward.x, ward.y, ward.radius + 4, -Math.PI / 2, -Math.PI / 2 + ward.charge / run.settings.riteChargeSec * Math.PI * 2);
        ctx.strokeStyle = '#ffe29a';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      entities.push({ y: ward.y, draw: () => {
        ctx.globalAlpha = disabled ? .55 : 1;
        this.sprite('actor', 'ward', ward, 1.18);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.font = '600 13px system-ui';
        ctx.strokeStyle = '#121819';
        ctx.lineWidth = 4;
        ctx.strokeText(ward.name, ward.x, ward.y + 28);
        ctx.fillStyle = '#e7e7cf';
        ctx.fillText(ward.name, ward.x, ward.y + 28);
      } });
    }
    for (const item of run.loot) if (visible(item)) this.sprite('props', item.kind, item, 1, false, this.motion ? Math.sin(run.elapsed * 5 + item.x) * 3 : 0);
    for (const patch of run.patches) this.ring(patch, patch.radius, '#87d999a0', '#4ed88134', true);
    for (const foe of run.foes) {
      const boss = foe.def.role === 'boss';
      if (foe.state === 'arrival') this.ring(foe, boss ? 88 : 35, '#f9c68e', '#f09b5440', true);
      if (foe.state === 'windup' || (boss && foe.state === 'attack')) {
        if (boss && foe.attack === 'cleave') this.hazard(foe, foe.angle, Math.PI * 100 / 360, 205, 0, foe.state === 'attack');
        else if (boss && foe.attack === 'lanes') {
          ctx.save();
          ctx.translate(foe.x, foe.y);
          for (const center of bossLaneCenters(foe)) {
            ctx.beginPath();
            if (foe.angle) ctx.rect(center - laneHalfWidth, -height, laneHalfWidth * 2, height * 2);
            else ctx.rect(-width, center - laneHalfWidth, width * 2, laneHalfWidth * 2);
            this.strokeHazard(foe.state === 'attack');
          }
          ctx.restore();
        } else if (boss && foe.state === 'windup') this.hazard(foe, foe.angle + Math.PI, Math.PI - tollGap, 340, 40);
        else if (boss) {
          for (const { radius } of tollRings(foe, run.tick)) {
            this.hazard(foe, foe.angle + Math.PI, Math.PI - tollGap, radius, radius - 26, true);
          }
        } else if (visible(foe) && foe.def.behavior.ai === 'pulse') {
          this.hazard(foe, 0, Math.PI, foe.echo ? foe.def.behavior.echoRadius! : foe.def.behavior.pulseRadius!);
        } else if (visible(foe)) {
          const dir = vector(foe.angle);
          ctx.save();
          ctx.translate(foe.x, foe.y);
          ctx.rotate(foe.angle);
          ctx.beginPath();
          ctx.rect(0, -foe.def.radius, 112, foe.def.radius * 2);
          this.strokeHazard(false);
          ctx.restore();
          this.ring({ x: foe.x + dir.x * 112, y: foe.y + dir.y * 112 }, 5, '#ffab73');
        }
      }
      if (!visible(foe)) continue;
      entities.push({ y: foe.y, draw: () => {
        const scale = foe.def.role === 'elite' ? 1.46 : 1;
        if (foe.def.role === 'elite' || foe.spark > run.tick) this.ring(foe, foe.def.radius * .8, '#ffc66dc4', '#38281e84');
        if (foe.poison >= run.tick) this.ring(foe, foe.def.radius * .72, '#91ff9eab');
        this.sprite('actor', foe.def.sprite, foe, scale, foe.vx < -.5, this.motion ? Math.sin(run.elapsed * 11 + foe.id) * (boss ? 2 : 3) : 0);
        if (foe.def.role === 'elite') {
          ctx.fillStyle = '#141918';
          ctx.fillRect(foe.x - 24, foe.y + 9, 48, 4);
          ctx.fillStyle = '#f3ba71';
          ctx.fillRect(foe.x - 24, foe.y + 9, 48 * foe.hp / foe.maxHp, 4);
        }
      } });
    }
    const p = run.player;
    const light = ctx.createRadialGradient(p.x + 8, p.y - 8, 8, p.x + 8, p.y - 8, 114);
    light.addColorStop(0, '#edbd7940');
    light.addColorStop(.42, '#b6804330');
    light.addColorStop(1, '#bc893d00');
    ctx.fillStyle = light;
    ctx.fillRect(p.x - 106, p.y - 122, 228, 228);
    entities.push({ y: p.y, draw: () => {
      this.ring(p, 16, '#ffe6a5', '#f1aa5640');
      if (run.guards) this.ring(p, 21, '#96d8fc', '#5fbded30');
      if (run.tick < run.dashUntil) this.ring(p, 28, '#8cf8e1', '#74f7d535');
      ctx.globalAlpha = run.tick < run.grace && this.motion && Math.floor(run.tick / 3) % 2 ? .54 : 1;
      this.sprite('actor', 'wick', p, 1.13, run.facing.x < -.1, 0);
      if (this.dawnScarf) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (run.facing.x < -.1) ctx.scale(-1, 1);
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#ffcb70';
        ctx.beginPath();
        ctx.moveTo(-12, -27);
        ctx.quadraticCurveTo(-4, -21, 7, -26);
        ctx.lineTo(11, -21);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } });
    for (const entity of entities.sort((a, b) => a.y - b.y)) entity.draw();
    for (const p of run.familiars) this.sprite('actor', 'foxfire', p, 1, false);
    for (const shot of run.shots) if (visible(shot)) this.ring(shot, 5, '#ffab85', '#c64f35');
    for (const meteor of run.meteors) if (visible(meteor)) this.ring(meteor, meteor.radius, '#ffe4a3', '#ffc96b30', true);
    for (const blade of run.orbit) {
      this.ring(blade, 8, '#c5aaff', '#b192f8d4');
      this.ring(blade, 12, '#bea2ff74');
    }
    for (const bolt of run.bolts) {
      ctx.beginPath();
      ctx.moveTo(bolt.x - bolt.vx * .036, bolt.y - bolt.vy * .036);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.lineWidth = bolt.comet ? 4 : 2;
      ctx.strokeStyle = bolt.comet ? '#ffe3a3' : bolt.source === 'foxfire' ? '#8fe7e2' : '#eebc71';
      ctx.stroke();
      this.ring(bolt, 3.25, '#ffdf9f', '#fff3ca');
    }
    this.effects = this.effects.filter(cue => cue.until > run.tick);
    for (const cue of cues) {
      if (cue.point && ['kill', 'hurt', 'ward', 'dash', 'impact', 'glass'].includes(cue.id)) {
        this.effects.push({ ...cue, until: run.tick + (cue.damage ? 31 : 25) });
      }
    }
    this.effects = this.effects.slice(-30);
    for (const cue of this.effects) {
      const progress = 1 - (cue.until - run.tick) / (cue.damage ? 31 : 25);
      ctx.globalAlpha = 1 - progress;
      if (cue.damage && this.numbers) {
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#101a17';
        ctx.lineWidth = 3;
        const y = cue.point!.y - 23 - (this.motion ? progress * 16 : 0);
        ctx.strokeText(String(cue.damage), cue.point!.x, y);
        ctx.fillStyle = '#ffe1a6';
        ctx.fillText(String(cue.damage), cue.point!.x, y);
      } else if (cue.id !== 'impact' && (this.motion || cue.id === 'hurt')) {
        this.ring(cue.point!, 12 + progress * (cue.id === 'ward' ? 95 : 25), cue.id === 'hurt' ? '#ff8d71' : '#f3d085');
      }
      ctx.globalAlpha = 1;
    }
  }
}
