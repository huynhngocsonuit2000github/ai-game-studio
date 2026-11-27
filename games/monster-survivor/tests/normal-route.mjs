import { GardenRun, bossLaneCenters, inLanes } from '../src/slice.ts';
import { angleDistance, distance, heading, ticks, vector, move } from '../src/sim.ts';

const directions = [-1, 0, 1].flatMap(x => [-1, 0, 1].map(y => ({ x, y })));
const center = { x: 1190, y: 880 };
const recipes = {
  'comet-thread': ['wick-dart', 'thread-lens', 'prism-ring', 'starfall'],
  'crown-of-glass': ['prism-ring', 'lantern-oil', 'wick-dart', 'hex-bell'],
  'green-midnight': ['bog-bloom', 'root-charm', 'wick-dart', 'hex-bell'],
  'lantern-pack': ['foxfire', 'gale-laces', 'wick-dart', 'mirror-ward'],
};
export const families = Object.keys(recipes);

export function draft(run, family) {
  const offer = run.offer;
  if (offer.kind === 'boon') {
    const preference = run.player.hp <= 75 ? 'hearth' : run.rites === 1 ? 'gather' : 'wind';
    return offer.cards.includes(preference) ? preference : offer.cards[0];
  }
  if (offer.kind === 'evolution') return offer.cards.includes(family) ? family : 'later';
  const [act, passive, ...support] = recipes[family];
  const activeRank = run.build.get(act) ?? 0;
  const passRank = run.build.get(passive) ?? 0;
  const priorities = [
    ...run.player.hp < 85 ? ['patch', 'heart-husk', 'mirror-ward'] : [],
    ...activeRank < 5 && !run.build.has(family) ? [act] : [],
    ...passRank < 2 ? [passive] : [],
    ...support, 'heart-husk', 'wick-dart', 'thread-lens', 'mirror-ward',
    'starfall', 'prism-ring', 'bog-bloom', passive, 'hex-bell', 'foxfire',
  ];
  if (offer.level === 2) {
    const first = [act, 'prism-ring', 'bog-bloom', 'starfall', 'foxfire', 'hex-bell', 'mirror-ward']
      .find(id => id !== 'wick-dart' && offer.cards.includes(id));
    if (first) return first;
  }
  return priorities.find(id => offer.cards.includes(id)) ?? offer.cards[0];
}

export function steer(run) {
  const p = run.player;
  const boss = run.boss;
  const nearby = run.foes.filter(f => f.state !== 'arrival' && distance(f, p) < 250);
  const ward = run.nearestWard;
  const dist = (item) => distance(item, p);
  const loot = run.loot.filter(l => (l.kind !== 'potion' || p.hp < p.maxHp - 4) && dist(l) < 500)
    .sort((a,b) => dist(a) - dist(b)).slice(0, 12);
  const chest = loot.find(l => l.kind === 'chest');
  const potion = loot.find(l => l.kind === 'potion');
  const nearest = nearby.sort((a,b) => dist(a) - dist(b))[0];
  let target = p;
  if (boss) {
    const near = run.build.has('prism-ring') || run.build.has('crown-of-glass') || run.build.has('hex-bell');
    const desire = near ? 118 : 235;
    const from = heading(boss, p);
    const angle = (boss.attack === 'toll' && ['windup', 'attack'].includes(boss.state)) ? boss.angle : from + .22;
    const gap = vector(angle);
    target = { x: boss.x + gap.x * desire, y: boss.y + gap.y * desire };
  } else if (ward && run.elapsed >= (run.rites ? 432 : 142)) {
    target = ward;
  } else if (chest || potion) {
    target = chest ?? potion;
  } else if (loot.length) {
    target = loot[0];
  } else if (run.elite && dist(run.elite) < 740) {
    target = run.elite;
  } else if (nearest) {
    target = nearest;
  } else if (run.foes.length) {
    target = run.foes.reduce((a,b) => dist(a) < dist(b) ? a : b);
  } else if (distance(p, center) > 150) {
    target = center;
  }
  let best = directions[4];
  let bestValue = -Infinity;
  for (const direction of directions) {
    const length = Math.hypot(direction.x, direction.y) || 1;
    const ahead = { ...p };
    const stopped = move(ahead, direction.x * 56 / length, direction.y * 56 / length, 13);
    let value = -distance(ahead, target) * .5;
    if (stopped) value -= 10;
    if (ward === target && distance(ward, ahead) < ward.radius - 12) value += 35;
    if (ward && ward !== target && distance(ward, ahead) < 97) value -= 96;
    for (const foe of nearby) {
      const predicted = { x: foe.x + foe.vx * .18, y: foe.y + foe.vy * .18 };
      const gap = Math.min(distance(ahead, foe), distance(ahead, predicted)) - foe.def.radius;
      value -= Math.max(0, 78 - gap) * (gap < 19 ? 2.8 : .62);
      if (foe.def.behavior.ai === 'charge' && ['windup','attack'].includes(foe.state)) {
        const aim = vector(foe.angle);
        const dx = ahead.x - foe.x;
        const dy = ahead.y - foe.y;
        const along = dx * aim.x + dy * aim.y;
        if (along > -15 && along < 153 && Math.abs(dx * aim.y - dy * aim.x) < foe.def.radius + 17) value -= 66;
      }
      if (foe.state === 'windup' && foe.def.behavior.ai === 'pulse') {
        const radius = foe.echo ? foe.def.behavior.echoRadius : foe.def.behavior.pulseRadius;
        if (distance(foe, ahead) <= radius) value -= 38;
      }
    }
    for (const shot of run.shots) {
      const dx = ahead.x - shot.x;
      const dy = ahead.y - shot.y;
      const t = Math.min(.5, Math.max(0, (dx * shot.vx + dy * shot.vy) / (shot.vx ** 2 + shot.vy ** 2)));
      if (Math.hypot(dx - t * shot.vx, dy - t * shot.vy) < 29) value -= 60;
    }
    if (boss && ['windup', 'attack'].includes(boss.state)) {
      const d = distance(ahead, boss);
      const angle = angleDistance(heading(boss, ahead), boss.angle);
      if (boss.attack === 'cleave' && d < 215 && angle < Math.PI * 105 / 360) value -= 140;
      if (boss.attack === 'toll' && d < 345 && angle > Math.PI * 48 / 360) value -= 140;
      if (boss.attack === 'lanes') {
        const coordinate = boss.angle ? ahead.x - boss.x : ahead.y - boss.y;
        if (bossLaneCenters(boss).some(center => Math.abs(center - coordinate) < 32)) value -= 140;
      }
    }
    if (boss && !inLanes(boss, ahead)) value += .2;
    if (!direction.x && !direction.y) value += p === target ? 3 : -2;
    if (value > bestValue) {
      bestValue = value;
      best = direction;
    }
  }
  let danger = nearby.some(foe => foe.def.role !== 'boss' && distance(foe, p) < foe.def.radius + 29);
  if (boss?.state === 'windup' && boss.attack === 'cleave' && boss.until - run.tick < 30 &&
      distance(boss, p) < 208 && angleDistance(heading(boss, p), boss.angle) < Math.PI * 100 / 360) {
    const endpoint = { ...p };
    const magnitude = Math.hypot(best.x, best.y) || 1;
    move(endpoint, best.x * 180 / magnitude, best.y * 180 / magnitude, 13, false);
    danger ||= distance(boss, endpoint) > 205 || angleDistance(heading(boss, endpoint), boss.angle) > Math.PI * 100 / 360;
  }
  return { ...best, dash: Boolean(danger && run.tick >= run.dashReady && (best.x || best.y) && (target !== ward || p.hp < 45)) };
}

export function simulate(seed, family) {
  const run = new GardenRun(seed);
  const observed = { firstLevel: null, waveLevel: null, peakFoes: 0, peakShots: 0, rites: [], elites: [], evolutions: [], phases: new Set(), attacks: new Set(), seen: new Set() };
  let direction = steer(run);
  while (!run.result && run.tick <= ticks(930)) {
    if (run.offer) {
      const id = draft(run, family);
      if (run.offer.kind === 'level' && observed.firstLevel === null) observed.firstLevel = run.elapsed;
      if (run.offer.kind === 'boon') observed.rites.push([run.lastWard.id, run.elapsed]);
      if (run.offer.kind === 'evolution' && id !== 'later') observed.evolutions.push([id, run.elapsed]);
      run.choose(id);
      direction = steer(run);
    }
    if (run.tick % 12 === 0) direction = steer(run);
    run.step(direction);
    for (const foe of run.foes) observed.seen.add(foe.def.id);
    for (const cue of run.cues) if (cue.id === 'elite') observed.elites.push([run.elapsed, run.elite?.def.id]);
    run.cues.length = 0;
    observed.peakFoes = Math.max(observed.peakFoes, run.foes.length);
    observed.peakShots = Math.max(observed.peakShots, run.shots.length);
    if (run.boss) {
      observed.waveLevel ??= run.level;
      observed.phases.add(run.boss.phase);
      if (run.boss.state === 'windup') observed.attacks.add(run.boss.attack);
    }
  }
  return { run, observed };
}
