import { choose, steer } from './campaign-route.mjs';

export function drive(run, onFrame, sideTrip) {
  let input = steer(run, sideTrip);
  let count = 0;
  const phases = new Set();
  const enemyIds = new Set();
  const encounters = new Set();
  let peak = 0;
  while (!run.result) {
    if (run.offer) {
      const card = choose(run);
      onFrame?.({ offer: run.offer, card, input, ticks: count });
      run.choose(card);
      count = 0;
    }
    if (!count) input = steer(run, sideTrip);
    run.step(count ? { ...input, dash: false, burst: false, interact: false } : input);
    count++;
    if (run.boss) phases.add(run.boss.phase);
    for (const group of run.activeGroups) if (group.state === 'active') encounters.add(group.key);
    for (const foe of run.foes) enemyIds.add(foe.def.id);
    peak = Math.max(peak, run.foes.length);
    const events = { guard: !!run.wardenGuards.size, tell: run.boss?.state === 'windup' ? run.boss.def.id + '-' + run.boss.phase : '',
      waymark: run.lightTicks > 50, opened: sideTrip?.open, pet: !!run.petCue && run.tick < run.petCue.until,
      engraving: !!run.kinCue && run.tick < run.kinCue.until, hazard: run.venomLanes.some(lane => lane.style) };
    if (count === 15 || run.result || run.offer) {
      onFrame?.({ ticks: count, input, events, result: run.result });
      count = 0;
    }
    run.cues.length = 0;
    run.clearSpellEffects();
  }
  return { result: run.result, seconds: run.elapsed, hp: run.player.hp, kills: run.kills, peak, phases: [...phases], enemyIds: [...enemyIds], encounters: [...encounters] };
}
