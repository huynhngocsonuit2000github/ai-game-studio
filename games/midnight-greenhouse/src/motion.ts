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

// Time is counted in simulation ticks. Offsets are relative to the visible sprite height.
const stride = {
  walker: { cycle: 24, lift: .105, lean: .14 },
  courier: { cycle: 15, lift: .21, lean: .28 },
  porter: { cycle: 30, lift: .045, lean: .14 },
  raincoat: { cycle: 24, lift: .085, lean: .11 },
  mender: { cycle: 30, lift: .14, lean: .18 },
  keeper: { cycle: 36, lift: .06, lean: .17 },
};
const windup = {
  fern: { duration: 18, lean: .30, squash: .18 },
  bramble: { duration: 12, lean: .40, squash: .10 },
  orchid: { duration: 22.5, lean: .18, squash: .21 },
};
const lunge = { fern: .46, bramble: .68, orchid: .29 };
const idleSway = { fern: .16, pitcher: .14, bramble: .12, orchid: .19, moss: .06, pod: .10 };
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const settle = (age: number, duration: number) => (1 - clamp(age / duration)) ** 2;
const wave = (age: number, duration: number) => Math.sin(clamp(age / duration) * Math.PI);

export function bodyMotion(id: UnitId, { clip, age }: Pose) {
  let x = 0, y = 0, lean = 0, stretch = 0;
  switch (clip) {
    case 'idle': {
      const sway = idleSway[id as CardId] ?? .09;
      lean = Math.sin(age * .16) * sway;
      stretch = Math.sin(age * .24 + 1) * (.035 + sway * .42);
      break;
    }
    case 'walk': {
      const gait = stride[id as EnemyId];
      if (!gait) break;
      const step = Math.sin(age * 2 * Math.PI / gait.cycle);
      const airborne = Math.abs(step);
      lean = gait.lean * (step - (id === 'courier' ? .75 : .22));
      y = -gait.lift * airborne;
      stretch = (airborne - .42) * (id === 'porter' || id === 'keeper' ? .16 : .25);
      break;
    }
    case 'windup':
    case 'charge': {
      const profile = windup[id as keyof typeof windup];
      if (!profile) break;
      const load = ease(clamp(age / profile.duration));
      lean = -profile.lean * load;
      stretch = -profile.squash * load;
      break;
    }
    case 'fire':
    case 'lash':
    case 'spark': {
      // Atlas release starts partway into its row so it meets the end of the windup.
      const released = age - 5;
      const snap = settle(released, 14);
      lean = (lunge[id as keyof typeof lunge] ?? .29) * snap - .16 * wave(released - 5, 14);
      stretch = .25 * snap - .11 * wave(released - 6, 12);
      break;
    }
    case 'bite': {
      const prep = age < 6 ? ease(clamp(age / 6)) : 0;
      const snap = age >= 6 ? settle(age - 6, 14) : 0;
      x = -.13 * snap;
      lean = .27 * prep - (id === 'keeper' ? .65 : .55) * snap;
      stretch = -.17 * prep + .22 * snap;
      break;
    }
    case 'gather':
      lean = -.22 * ease(clamp(age / 24));
      stretch = -.19 * ease(clamp(age / 24));
      break;
    case 'release':
      lean = .31 * settle(age, 17);
      stretch = .30 * settle(age, 16) - .09 * wave(age - 6, 10);
      break;
    case 'mend':
    case 'heal':
      lean = (id === 'mender' ? -.27 : .12) * wave(age, 24);
      stretch = .22 * wave(age, 26);
      break;
    case 'arm':
    case 'armed':
      lean = Math.sin(age * (clip === 'armed' ? .42 : .56)) * .14;
      stretch = Math.sin(age * .39) * .15 - .07;
      break;
    case 'brace':
    case 'insulated':
      lean = -.29 * settle(age, 17);
      stretch = -.22 * settle(age, 17);
      break;
    case 'signal':
    case 'phase': {
      const rise = wave(age, clip === 'phase' ? 36 : 72);
      lean = -.33 * rise + .13 * Math.sin(age * .29) * rise;
      stretch = .32 * rise;
      y = -.09 * rise;
      break;
    }
    case 'hurt': {
      const knock = settle(age, 11);
      lean = (id in stride ? 1 : -1) * (.43 * knock - .12 * wave(age - 4, 10));
      stretch = -.18 * knock;
      break;
    }
    case 'restrained':
      lean = .11 * Math.sin(age * .38);
      stretch = -.10 + .045 * Math.sin(age * .48);
      break;
    case 'fall': {
      const fall = ease(clamp(age / 20));
      x = (id in stride ? 1 : -1) * fall * .16;
      lean = (id in stride ? 1 : -1) * fall * .60;
      stretch = -.55 * fall;
      break;
    }
    case 'burst':
      stretch = .27 * settle(age, 11);
      break;
  }
  return { x, y, lean, stretch };
}

export function plantPose(plant: Plant, game: Garden): Pose {
  const now = game.now;
  const acted = now - plant.acted;
  const hurt = now - plant.hurt;
  switch (plant.card.id) {
    case 'pitcher':
      if (acted < 18) return animation('release', acted);
      if (plant.ready - now <= 24) return animation('gather', 24 - plant.ready + now);
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
      if (plant.windup) return animation('arm', 21 + (now - plant.windup.at) * 2);
      if (plant.ready > now) return animation('arm', now - plant.placed);
      return animation('armed', now - plant.ready);
  }
  if (hurt < 12) return animation('hurt', hurt);
  return animation('idle', now - plant.placed + plant.col * 4 + plant.lane * 7);
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
  if (enemy.stunnedUntil > now || enemy.rootedUntil > now || !enemy.moving) return animation('restrained', now + enemy.id * 7);
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
  }).catch(() => {
    manifest = undefined;
    return null;
  });
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
  if (sheets.get(unit.asset) === sheet) sheets.delete(unit.asset);
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
