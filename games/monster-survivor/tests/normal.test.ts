import assert from 'node:assert/strict';
import test from 'node:test';
import { rules, skills } from '../src/content.ts';
import { GardenRun, inLanes, tollRings } from '../src/slice.ts';
import { ticks } from '../src/sim.ts';
import { Records, saveKey } from '../src/save.ts';

const still = { x: 0, y: 0, dash: false };
class Practice extends GardenRun {
  protected override direct() {}
  add(id: string, p = this.player) { return this.spawn(id, undefined, p)!; }
  chest() { this.drop(this.player, 'chest', 1); }
  draft(id: string) {
    this.offer = { kind: 'level', cards: [id], level: 2 };
    assert.ok(this.choose(id));
  }
  advance(seconds: number) {
    for (let i = 0; i < ticks(seconds); i++) {
      this.step(still);
      this.cues.length = 0;
    }
  }
  strike(damage: number) { this.hurt(damage); }
}

test('Normal T06 all four recipes consume one catalyst and preserve active slots', () => {
  const evolutions = [...skills.values()].filter(def => def.recipe);
  assert.equal(evolutions.length, 4);
  for (const def of evolutions) {
    const run = new Practice(8);
    const recipe = def.recipe!;
    run.build.set(recipe.active, recipe.activeRank);
    run.build.set(recipe.passive, recipe.passiveRank);
    run.chest();
    run.step(still);
    assert.deepEqual(run.offer?.cards, [def.id, 'later']);
    const count = run.build.size;
    assert.ok(run.choose(def.id));
    assert.equal(run.build.get(def.id), 1);
    assert.equal(run.build.has(recipe.active), false);
    assert.equal(run.build.size, count);
    assert.equal(run.catalysts, 0);
  }
});

test('Normal T07 two distinct rites, unique boons and the third ward disabled', () => {
  const run = new Practice(11);
  for (let i = 0; i < 2; i++) {
    Object.assign(run.player, { x: run.wards[i].x, y: run.wards[i].y });
    run.advance(9);
    assert.equal(run.rites, i + 1);
    assert.equal(run.offer?.kind, 'boon');
    assert.ok(run.choose(i === 0 ? 'wind' : 'gather'));
    while (run.offer) run.choose(run.offer.cards[0]);
  }
  assert.equal(run.wardComplete, true);
  assert.equal(run.nearestWard, null);
  const third = run.wards[2];
  Object.assign(run.player, { x: third.x, y: third.y });
  run.advance(11);
  assert.equal(third.lit, false);
  assert.equal(third.charge, 0);
  assert.deepEqual([...run.boons], ['wind', 'gather']);
});

test('Normal T07/T09 overrun and final deadlines resolve at authored ticks', () => {
  const run = new Practice(7);
  run.tick = ticks(720) - 1;
  run.step(still);
  assert.equal(run.overrun, true);
  assert.equal(run.boss, undefined);
  run.tick = ticks(810) - 1;
  run.step(still);
  assert.equal(run.result, 'rite');
  const duel = new Practice(7);
  duel.wardComplete = true;
  duel.tick = ticks(720) - 1;
  duel.step(still);
  assert.equal(duel.boss?.hp, rules.normal.bossHp);
  duel.tick = ticks(930) - 1;
  duel.step(still);
  assert.equal(duel.result, 'time');
});

test('Normal T04 ranged and pulse foes have separate readable attack timers', () => {
  const run = new Practice(4);
  const ranged = run.add('bottle', { ...run.player, x: run.player.x + 210 });
  const bell = run.add('discord', { ...run.player, y: run.player.y - 130 });
  bell.state = 'idle';
  run.step(still);
  assert.equal(ranged.state, 'windup');
  assert.equal(bell.state, 'windup');
  assert.equal(run.shots.length, 0);
  run.advance(.64);
  assert.equal(run.shots.length, 1);
  run.advance(.4);
  assert.equal(bell.echo, true);
  assert.equal(bell.state, 'windup');
  run.advance(.59);
  assert.equal(bell.state, 'recover');
});

test('Normal T08 guard, heart bonus, foxfire and starfall resolve through combat', () => {
  const run = new Practice(42);
  run.draft('heart-husk');
  run.draft('mirror-ward');
  run.draft('foxfire');
  run.draft('starfall');
  const foe = run.add('scarab', { ...run.player, x: run.player.x - 106 });
  assert.equal(run.player.hp, 112);
  assert.equal(run.guards, 1);
  run.step(still);
  assert.ok(run.familiars.length);
  assert.ok(run.meteors.length);
  run.strike(20);
  assert.equal(run.guards, 0);
  assert.equal(run.player.hp, 112);
  run.advance(1.3);
  assert.ok((run.damage.get('starfall') ?? 0) > 0);
  assert.ok((run.damage.get('foxfire') ?? 0) > 0);
  assert.ok(foe.hp < foe.maxHp);
  run.advance(7);
  assert.equal(run.guards, 1);
});

test('Normal T10 deepest phase wins threshold ties and Midnight has separate rings', () => {
  const run = new Practice(110);
  const boss = run.add('warden', { x: 1200, y: 650 });
  Object.assign(run.player, { x: 1390, y: 650 });
  boss.state = 'idle';
  boss.hp = 1200;
  run.step(still);
  assert.equal(boss.phase, 3);
  assert.equal(run.foes.filter(foe => foe.def.id === 'seedling').length, 0);
  assert.equal(run.foes.filter(foe => foe.def.id === 'moth').length, 2);
  run.advance(.85);
  assert.equal(boss.attack, 'lanes');
  assert.equal(boss.state, 'windup');
  const nearby = [-96, -68, -38, 0, 38, 68, 96];
  assert.ok(nearby.some(delta => !inLanes(boss, {
    x: run.player.x + (boss.angle ? delta : 0), y: run.player.y + (boss.angle ? 0 : delta),
  })));
  boss.attack = 'toll';
  boss.attackTick = run.tick;
  const rings = tollRings(boss, run.tick + ticks(.7));
  assert.equal(rings.length, 2);
  assert.equal(rings[0].mask & rings[1].mask, 0);
});

test('Normal T12 S03 preferences, lifetime values, discoveries and scarf survive a Normal result', () => {
  const legacy = {
    schemaVersion: 1, settings: { mute: true, master: .27, music: .55, sfx: .72, highContrast: true },
    lifetime: { runs: 2, wins: 1, bestClearMs: 243783, longestMs: 243783, recordKills: 434 },
    runIds: ['old'], discoveredSkillIds: ['wick-dart', 'comet-thread'],
    cosmetics: { unlocked: ['dawn-scarf'], selected: '' },
  };
  const bytes = new Map([[saveKey, JSON.stringify(legacy)], ['forest-adventure:save:v1', 'preserve']]);
  const records = new Records(() => ({
    getItem: key => bytes.get(key) ?? null, setItem: (key, value) => { bytes.set(key, value); },
  }));
  assert.equal(bytes.get(saveKey), JSON.stringify(legacy));
  records.selectScarf('dawn-scarf');
  const run = new Practice(4);
  run.tick = ticks(786);
  run.result = 'victory';
  run.build.set('crown-of-glass', 1);
  records.finalize(run, 'normal-winner');
  records.finalize(run, 'normal-winner');
  assert.equal(records.data.lifetime.runs, 3);
  assert.equal(records.data.lifetime.wins, 2);
  assert.equal(records.data.lifetime.bestClearMs, 243783);
  assert.equal(records.data.lifetime.longestMs, 786000);
  assert.equal(records.data.settings.master, .27);
  assert.equal(records.data.cosmetics.selected, 'dawn-scarf');
  assert.deepEqual(records.data.discoveredSkillIds, ['wick-dart', 'comet-thread', 'crown-of-glass']);
  assert.equal(bytes.get('forest-adventure:save:v1'), 'preserve');
});

test('Normal T05/T08 Hex Bell applies poison bonus and Crown pulses once per orbit', () => {
  const bell = new Practice(31);
  bell.build.set('hex-bell', 1);
  const target = bell.add('scarab', { ...bell.player, x: bell.player.x + 90 });
  target.poison = ticks(3);
  target.poisonNext = ticks(2);
  bell.step(still);
  assert.equal(bell.damage.get('hex-bell'), Math.round(24 * 1.35));

  const crown = new Practice(31);
  crown.build.delete('wick-dart');
  crown.build.set('crown-of-glass', 1);
  crown.add('scarab', { ...crown.player, x: crown.player.x + 115 });
  crown.step(still);
  assert.equal(crown.orbit.length, 5);
  assert.equal(crown.cues.some(cue => cue.id === 'glass'), false);
  crown.advance(1.69);
  assert.equal(crown.tick, 102);
  crown.step(still);
  assert.equal(crown.cues.filter(cue => cue.id === 'glass').length, 1);
  assert.ok((crown.damage.get('prism-ring') ?? 0) > 0);
});

test('Normal T06 evolved bloom chills a target and Lantern Pack bursts at a short dash endpoint', () => {
  const bloom = new Practice(18);
  bloom.build.clear();
  bloom.build.set('green-midnight', 1);
  const poisoned = bloom.add('scarab', { ...bloom.player, x: bloom.player.x + 100 });
  bloom.step(still);
  assert.ok(poisoned.chill > bloom.tick);
  bloom.advance(.6);
  assert.ok((bloom.damage.get('bog-bloom') ?? 0) > 0);

  const pack = new Practice(18);
  pack.build.clear();
  pack.build.set('lantern-pack', 1);
  pack.player.x = 780;
  pack.player.y = 845;
  pack.add('scarab', { ...pack.player, x: 815, y: 904 });
  pack.step({ x: 1, y: 0, dash: true });
  for (let i = 0; i < ticks(.4); i++) pack.step(still);
  assert.ok(pack.player.x < 827);
  assert.equal(pack.cues.filter(cue => cue.id === 'bloom').length, 1);
  assert.ok((pack.damage.get('foxfire') ?? 0) >= 48);
});
