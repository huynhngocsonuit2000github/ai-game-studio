import { rules } from '../src/content.ts';
import { bossLaneCenters, tollGap } from '../src/slice.ts';
import { angleDistance, distance, heading, move, outsideSolids, solidHit, vector } from '../src/sim.ts';

const directions = [-1, 0, 1].flatMap(x => [-1, 0, 1].map(y => ({ x, y })));
const buildOrder = {
  1: ['wick-dart', 'prism-ring', 'hex-bell', 'starfall', 'heart-husk'],
  2: ['wick-dart', 'prism-ring', 'lantern-oil', 'bog-bloom', 'mirror-ward', 'thread-lens'],
  3: ['prism-ring', 'hex-bell', 'bog-bloom', 'lantern-oil', 'wick-dart', 'heart-husk'],
  4: ['wick-dart', 'thread-lens', 'foxfire', 'gale-laces', 'starfall'],
  5: ['wick-dart', 'thread-lens', 'prism-ring', 'lantern-oil', 'starfall', 'mirror-ward'],
};

export function choose(run) {
  if (run.offer.kind === 'evolution') return run.offer.cards.find(card => card !== 'later');
  const priorities = run.player.hp < 58 ? ['patch', 'heart-husk', 'mirror-ward'] : [];
  const intended = buildOrder[run.stage.order];
  const ranked = [...intended].sort((a, b) => {
    const score = id => intended.indexOf(id) * .26 + (run.build.get(id) ?? 0) * .14;
    return score(a) - score(b);
  });
  return [...priorities, ...ranked, 'wick-dart', 'heart-husk', 'starfall', 'prism-ring', 'hex-bell', 'mirror-ward', 'patch']
    .find(id => run.offer.cards.includes(id)) ?? run.offer.cards[0];
}

function detour(run, target) {
  const p = run.player;
  const radius = rules.player.radius + 3;
  if (solidHit(p, target, radius, run.arena) === Infinity) return target;
  const local = run.arena.blockers.filter(blocker =>
    distance(p, blocker) < distance(p, target) + 100);
  const waypoints = local.flatMap(blocker => Array.from({ length: 12 }, (_, index) => {
    const spread = blocker.r + radius + 25;
    const dir = vector(index * Math.PI / 6);
    return { x: blocker.x + dir.x * spread, y: blocker.y + dir.y * spread };
  })).filter(at => outsideSolids(at, radius, run.arena));
  const clear = (from, to) => solidHit(from, to, radius, run.arena) === Infinity;
  const entries = waypoints.filter(at => clear(p, at));
  const exits = waypoints.filter(at => clear(at, target));
  let best = target;
  let score = Infinity;
  for (const first of entries) {
    for (const second of exits) {
      const length = distance(p, first) + distance(first, second) + distance(second, target);
      if (length < score && clear(first, second)) { best = first; score = length; }
    }
  }
  return best;
}

export function steer(run) {
  const p = run.player;
  const byDistance = (a, b) => distance(p, a) - distance(p, b);
  const enemies = run.foes.filter(foe => foe.hp > 0 && foe.state !== 'arrival');
  const nearby = enemies.filter(foe => distance(p, foe) < 280).sort(byDistance);
  const boss = run.boss;
  const group = run.activeGroups.find(entry => entry.state === 'active') ?? run.activeGroups.find(entry => entry === run.objectivePoint);
  const ordered = run.activeGroups.filter(entry => entry.state !== 'done');
  const defense = ordered.find(entry => entry.kind === 'defense' && entry.state === 'active');
  const wantedChest = run.chests.find(chest => run.chestReady(chest) &&
    (run.stage.order <= 2 || distance(p, chest) < 140 || run.exitOpen && distance(p, chest) < 330));
  const drop = run.drops.filter(item => item.kind === 'gear' || item.kind === 'heart' && p.hp < p.maxHp - 10)
    .filter(item => distance(item, p) < 390).sort(byDistance)[0];
  const ember = run.loot.filter(item => distance(item, p) < 185).sort(byDistance)[0];
  const firstWave = run.elapsed < 12 && run.level < 2;
  const hunt = group?.state === 'active' && group.kind !== 'defense'
    ? enemies.filter(foe => group.ids.has(foe.id)).sort(byDistance)[0]
    : null;
  const guard = run.wardenGuards?.size ? enemies.filter(foe => run.wardenGuards.has(foe.id)).sort(byDistance)[0] : undefined;
  const threat = guard ?? boss ?? (defense ? enemies.filter(foe => defense.ids.has(foe.id)).sort(byDistance)[0] : hunt) ?? nearby[0];
  const tight = run.build.has('prism-ring') || run.build.has('crown-of-glass') || run.build.has('hex-bell');
  let target = run.objectivePoint ?? p;
  if (boss || defense || hunt || firstWave && threat || wantedChest && nearby.length >= 4 && distance(p, nearby[0]) < 105) {
    if (threat) {
      const radius = boss && !guard ? tight ? 122 : 223 : defense ? 75 : group?.kind === 'nest' ? 128 : threat.def.behavior.ai === 'pulse' ? 190 : threat.def.role === 'elite' ? 156 : tight ? 78 : 118;
      const aim = !guard && boss?.attack === 'toll' && ['windup', 'attack'].includes(boss.state) ? boss.angle : heading(threat, p) + .31;
      const position = angle => {
        const unit = vector(angle);
        return { x: threat.x + unit.x * radius, y: threat.y + unit.y * radius };
      };
      target = position(aim);
      if ((guard || !boss && hunt) && (solidHit(target, threat, 0, run.arena) !== Infinity || !outsideSolids(target, 18, run.arena))) {
        target = [-.55, .55, -1.12, 1.12, -1.72, 1.72, Math.PI]
          .map(offset => position(aim + offset))
          .filter(at => outsideSolids(at, 18, run.arena) && solidHit(at, threat, 0, run.arena) === Infinity)
          .sort((a, b) => {
            const cost = at => distance(p, at) + (solidHit(p, at, 15, run.arena) === Infinity ? 0 : 500);
            return cost(a) - cost(b);
          })[0] ?? target;
      }
    }
    if ((!boss || guard && p.hp < 55) && !defense && drop && distance(p, drop) < 95 && (!nearby.length || distance(nearby[0], drop) > 56)) target = drop;
    if (firstWave && ember) target = ember;
    if (!threat && group && !defense) target = group;
  } else if (drop) target = drop;
  else if (wantedChest) target = wantedChest;
  else if (run.exitOpen && run.stage.order === 5 && p.x < 1510 && p.y < 570) target = { x: 1500, y: 625 };
  else if (ember && distance(p, ember) < 136 && !run.exitOpen) target = ember;
  const goal = detour(run, target);
  const stride = Math.max(17, Math.min(41, distance(p, goal)));
  let best = directions[4];
  let bestScore = -Infinity;
  for (const direction of directions) {
    const ahead = { ...p };
    const length = Math.hypot(direction.x, direction.y) || 1;
    const stopped = move(ahead, direction.x * stride / length, direction.y * stride / length, 13, true, run.arena);
    let score = -distance(ahead, goal) * .85;
    if (goal !== target && solidHit(ahead, target, rules.player.radius + 3, run.arena) === Infinity) score += 24;
    if (stopped) score -= 6;
    for (const foe of nearby) {
      const gap = distance(ahead, foe) - foe.def.radius;
      score -= Math.max(0, 49 - gap) * (gap < 14 ? 2.2 : .44);
      if (foe.def.behavior.ai === 'charge' && ['windup', 'attack'].includes(foe.state) &&
        distance(ahead, foe) < 155 && angleDistance(heading(foe, ahead), foe.angle) < .28) score -= 47;
      if (foe.def.behavior.ai === 'pulse' && foe.state === 'windup' &&
        distance(ahead, foe) < (foe.echo ? foe.def.behavior.echoRadius : foe.def.behavior.pulseRadius)) score -= 27;
    }
    for (const shot of run.shots) {
      const dx = ahead.x - shot.x;
      const dy = ahead.y - shot.y;
      const seconds = Math.min(.44, Math.max(0, (dx * shot.vx + dy * shot.vy) / (shot.vx ** 2 + shot.vy ** 2)));
      if (Math.hypot(dx - seconds * shot.vx, dy - seconds * shot.vy) < 23) score -= 45;
    }
    for (const pool of run.pools) if (distance(ahead, pool) < pool.radius + 6) score -= 35;
    for (const lane of run.venomLanes ?? []) if (run.inVenomLane(lane, ahead)) score -= lane.due <= run.tick + 22 ? 77 : 37;
    if (boss && ['windup', 'attack'].includes(boss.state)) {
      const gap = distance(ahead, boss);
      const angle = angleDistance(heading(boss, ahead), boss.angle);
      if (boss.attack === 'cleave' && gap < 209 && angle < .92) score -= 92;
      if (boss.attack === 'toll' && gap < 344 && angle > tollGap - .03) score -= 94;
      const coordinate = boss.angle ? ahead.x - boss.x : ahead.y - boss.y;
      if (boss.attack === 'lanes' && bossLaneCenters(boss).some(center => Math.abs(center - coordinate) < 31)) score -= 104;
    }
    if (score > bestScore) { best = direction; bestScore = score; }
  }
  const danger = run.venomLanes?.some(lane => lane.due <= run.tick + 10 && run.inVenomLane(lane, p)) || nearby.some(foe => distance(p, foe) < foe.def.radius + 21) ||
    run.pools.some(pool => pool.due <= run.tick + 12 && distance(p, pool) < pool.radius - 12);
  const close = nearby.filter(foe => distance(p, foe) <= run.burstRadius);
  return {
    ...best, interact: Boolean(run.canInteract && (run.canInteract !== 'Exit' || target === run.exit)),
    burst: run.burstReady && (close.length >= 4 || Boolean(boss && boss.state === 'windup' && distance(p, boss) < run.burstRadius)),
    dash: danger && run.tick >= run.dashReady && Boolean(best.x || best.y),
  };
}
