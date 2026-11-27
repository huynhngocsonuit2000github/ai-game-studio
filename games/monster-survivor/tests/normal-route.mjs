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
  if (offer.kind === 'evolution') return offer.cards.includes(family) ? family : offer.cards[0];
  const [act, passive, ...support] = recipes[family];
  const activeRank = run.build.get(act) ?? 0;
  const passRank = run.build.get(passive) ?? 0;
  const priorities = [
    ...run.player.hp < 72 ? ['patch', 'heart-husk'] : [],
    ...activeRank < 5 && !run.build.has(family) ? [act] : [],
    ...passRank < 2 ? [passive] : [],
    ...support, 'heart-husk', 'wick-dart', 'thread-lens', 'mirror-ward',
    'starfall', 'prism-ring', 'bog-bloom', passive, 'hex-bell', 'foxfire',
  ];
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
  } else if (ward && (ward.charge >= .1 || run.elapsed >= (run.rites ? 432 : 142))) {
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
    for (const foe of nearby) {
      const gap = distance(ahead, foe) - foe.def.radius;
      value -= Math.max(0, 72 - gap) * (gap < 19 ? 2.4 : .61);
      if (foe.state === 'windup' && foe.def.behavior.ai === 'pulse') {
        const radius = foe.echo ? foe.def.behavior.echoRadius : foe.def.behavior.pulseRadius;
        if (distance(foe, ahead) <= radius) value -= 38;
      }
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
  const danger = nearby.some(foe => foe.def.role !== 'boss' && distance(foe, p) < foe.def.radius + 24);
  return { ...best, dash: Boolean(danger && run.tick >= run.dashReady && (best.x || best.y) && target !== ward) };
}

export function simulate(seed, family) {
  const run = new GardenRun(seed);
  const observed = { firstLevel: null, rites: [], elites: [], evolutions: [], phases: new Set(), attacks: new Set(), seen: new Set() };
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
    if (run.boss) {
      observed.phases.add(run.boss.phase);
      if (run.boss.state === 'windup') observed.attacks.add(run.boss.attack);
    }
  }
  return { run, observed };
}
