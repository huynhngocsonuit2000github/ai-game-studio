import type { CardId, EnemyId } from './content.js';
import type { Enemy, Garden, Plant } from './simulation.js';

type UnitId = CardId | EnemyId;
type Clip = { row: number; frameCount: number; durationTicks: number; loop: boolean; reducedFrame: number };
type Unit = { asset: string; source: string; cell: [number, number]; anchorPx: [number, number];
  atlasSize: [number, number]; clips: Record<string, Clip> };
type Atlas = { units: Record<UnitId, Unit> };
export type Pose = { clip: string; age: number };

const animation = (clip: string, age: number): Pose => ({ clip, age });
const impactClips = { fern: 'fire', bramble: 'lash', orchid: 'spark' };
const windupClips = { fern: 'windup', bramble: 'windup', orchid: 'charge' };

export function plantPose(plant: Plant, game: Garden): Pose {
  const now = game.now;
  const acted = now - plant.acted;
  const hurt = now - plant.hurt;
  switch (plant.card.id) {
    case 'pitcher':
      if (plant.ready - now <= 24) return animation('gather', 24 - plant.ready + now);
      if (acted < 18) return animation('release', acted);
      break;
    case 'fern':
    case 'bramble':
    case 'orchid':
      if (plant.windup) return animation(windupClips[plant.card.id], (now - plant.windup.at) * 1.5);
      if (acted < 18) return animation(impactClips[plant.card.id], acted + 5);
      break;
    case 'moss':
      if (now - plant.placed < 18) return animation('brace', now - plant.placed);
      if (plant.mossHealing) return animation('mend', now % 36);
      break;
    case 'pod':
      if (plant.windup) return animation('burst', now - plant.windup.at);
      if (plant.ready > now) return animation('arm', (now - plant.placed) % 36);
      return animation('armed', (now - plant.ready) % 18);
  }
  if (hurt < 12) return animation('hurt', hurt);
  return animation('idle', now - plant.placed);
}

export function enemyPose(enemy: Enemy, game: Garden): Pose {
  const now = game.now;
  const id = enemy.spec.id;
  if (id === 'keeper') {
    const age = now - game.phaseAt;
    if (age < 36) return animation('phase', age);
    if (game.keeperSignal) return animation('signal', now - game.keeperSignal.at);
  }
  if (id === 'mender' && now - enemy.healed < 24) return animation('heal', now - enemy.healed);
  if (enemy.biteWindup) return animation('bite', now - enemy.biteWindup.at);
  if (now - enemy.acted < 15) return animation('bite', now - enemy.acted + 6);
  if (id === 'raincoat' && now - enemy.insulated < 18) return animation('insulated', now - enemy.insulated);
  if (id === 'porter' && now - enemy.braced < 18) return animation('brace', now - enemy.braced);
  if (now - enemy.hurt < 12) return animation('hurt', now - enemy.hurt);
  if (enemy.stunnedUntil > now || enemy.rootedUntil > now) return animation('restrained', 8);
  return animation('walk', enemy.gait);
}

export function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

let manifest: Promise<Atlas | null> | undefined;
const sheets = new Map<string, Promise<HTMLImageElement | null>>();
export function loadAtlas() {
  return manifest ??= fetch('./art/retro/motion/atlas.json').then((response) => {
    if (!response.ok) throw new Error('Motion manifest unavailable');
    return response.json() as Promise<Atlas>;
  }).catch(() => null);
}

export async function loadMotion(id: UnitId) {
  const atlas = await loadAtlas();
  const unit = atlas?.units[id];
  if (!unit) return;
  let sheet = sheets.get(unit.asset);
  if (!sheet) {
    sheet = loadImage('./art/' + unit.asset).then((image) => image.naturalWidth === unit.atlasSize[0]
      && image.naturalHeight === unit.atlasSize[1] ? image : null).catch(() => null);
    sheets.set(unit.asset, sheet);
  }
  const image = await sheet;
  if (image) return { unit, image };
}

export type Motion = NonNullable<Awaited<ReturnType<typeof loadMotion>>>;

export function frameOf(clip: Clip, age: number, reduced: boolean) {
  if (reduced) return clip.reducedFrame;
  const tick = Math.max(0, clip.loop ? age % clip.durationTicks : age);
  return Math.min(clip.frameCount - 1, Math.floor(tick * clip.frameCount / clip.durationTicks));
}

export function drawPose(ctx: CanvasRenderingContext2D, { unit, image }: Motion, pose: Pose, height: number, reduced = false) {
  const clip = unit.clips[pose.clip];
  if (!clip) return false;
  const [w, h] = unit.cell;
  const scale = height / h;
  ctx.drawImage(image, frameOf(clip, pose.age, reduced) * w, clip.row * h, w, h,
    -unit.anchorPx[0] * scale, -unit.anchorPx[1] * scale, w * scale, height);
  return true;
}
