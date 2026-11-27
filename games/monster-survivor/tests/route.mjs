import { distance, heading, vector } from '../src/sim.ts';

const orchard = { x: 510, y: 470 };
const center = { x: 1190, y: 880 };

export function pick(offer) {
  const preference = offer.kind === 'boon' ? ['hearth'] : offer.kind === 'evolution' ? ['comet-thread'] :
    ['wick-dart', 'thread-lens', 'prism-ring', 'bog-bloom', 'patch', 'gale-laces', 'lantern-oil', 'root-charm'];
  return preference.find(id => offer.cards.includes(id)) ?? offer.cards[0];
}

export function steer(run) {
  const p = run.player;
  const enemies = run.foes.filter(foe => foe.state !== 'arrival');
  const low = p.hp < 60;
  const nearest = (a, b) => distance(a, p) - distance(b, p);
  const loot = run.loot.filter(item => item.kind !== 'potion' || low).sort(nearest).slice(0, 12);
  let target;
  if (!run.wardComplete && (run.elapsed > 42 || low)) {
    target = orchard;
  } else if (run.boss) {
    const boss = run.boss;
    const angle = heading(boss, p);
    const radius = boss.state === 'windup' && boss.attack === 'cleave' ? 245 : 180;
    const goal = vector(angle + .3);
    target = { x: boss.x + goal.x * radius, y: boss.y + goal.y * radius };
  } else {
    target = loot[0] ?? run.elite ?? enemies.sort(nearest)[0] ?? center;
  }
  let best = { x: 0, y: 0, dash: false };
  let highest = -Infinity;
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
    const n = Math.hypot(x, y) || 1;
    const ahead = { x: p.x + x * 60 / n, y: p.y + y * 60 / n };
    if (ahead.x < 65 || ahead.x > 2335 || ahead.y < 65 || ahead.y > 1535) continue;
    let value = -distance(ahead, target) * .42;
    for (const foe of enemies) {
      const gap = distance(ahead, foe) - foe.def.radius;
      value -= Math.max(0, 90 - gap) * (gap < 22 ? 1.8 : .62);
    }
    for (const item of loot) value += Math.max(0, (item.kind === 'chest' ? 55 : 72) - distance(ahead, item)) * .14;
    if (!x && !y) value -= 2;
    if (value > highest) {
      highest = value;
      best = { x, y, dash: false };
    }
  }
  return best;
}
