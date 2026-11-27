import assert from 'node:assert/strict';
import test from 'node:test';
import { garden, rules, validateContent } from '../src/content.ts';
import { Clock, Run, dt, move, ticks } from '../src/sim.ts';

const still = { x: 0, y: 0, dash: false };

test('T01 validates authored content and atlas references', validateContent);

test('T02 normalizes diagonals and stops a swept dash at blockers', () => {
  const horizontal = new Run(123);
  const diagonal = new Run(123);
  horizontal.step({ x: 1, y: 0, dash: false });
  diagonal.step({ x: 1, y: 1, dash: false });
  assert.ok(Math.abs(garden.playerStart[0] + rules.player.speed * dt - horizontal.player.x) < 1e-8);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - garden.playerStart[0], diagonal.player.y - garden.playerStart[1]) - rules.player.speed * dt) < 1e-8);
  const point = { x: 780, y: 845 };
  assert.equal(move(point, 180, 0, 13, false), true);
  assert.ok(point.x < 827);
  horizontal.step({ ...still, dash: true });
  const ready = horizontal.dashReady;
  horizontal.step({ ...still, dash: true });
  assert.equal(horizontal.dashReady, ready);
});

test('T03 fixed step makes seeded runs independent of ordinary render cadence', () => {
  const snapshots = [30, 60, 120].map(hz => {
    const run = new Run(1807);
    const clock = new Clock();
    for (let i = 0; i < hz * 20; i++) {
      clock.advance(1 / hz, () => {
        run.step(still);
        run.cues.length = 0;
        return true;
      });
    }
    return { tick: run.tick, hp: run.player.hp, kills: run.kills, foes: run.foes };
  });
  assert.deepEqual(snapshots[0], snapshots[1]);
  assert.deepEqual(snapshots[1], snapshots[2]);
  const clock = new Clock();
  let steps = 0;
  clock.advance(30, () => Boolean(++steps));
  assert.equal(steps, 5);
});

class Practice extends Run {
  add(id: string, x: number, y: number) { return this.spawn(id, undefined, { x, y })!; }
  ember(value: number) { this.drop(this.player, 'ember', value); }
}

test('T04/05 bolts kill a nearby Seedling, collect XP and freeze for an upgrade', () => {
  const run = new Practice(5);
  run.add('seedling', run.player.x + 62, run.player.y);
  for (let i = 0; i < ticks(2); i++) run.step(still);
  assert.equal(run.kills, 1);
  assert.ok(run.xp >= 2);
  run.ember(50);
  run.step(still);
  assert.equal(run.offer?.kind, 'level');
  assert.ok(run.offer?.cards.some(id => id === 'bog-bloom' || id === 'prism-ring'));
  const frozen = run.tick;
  run.step(still);
  assert.equal(run.tick, frozen);
  const card = run.offer!.cards[0];
  assert.equal(run.choose('invalid'), false);
  assert.equal(run.choose(card), true);
  assert.equal(run.build.get(card), 1);
  assert.equal(run.xp, 11);
  assert.equal(run.offer?.kind, 'level');
});

test('T04 scarab attack locks its direction before charging and normal spawns stay capped', () => {
  const run = new Practice(16);
  const foe = run.add('scarab', run.player.x + 145, run.player.y);
  run.step(still);
  assert.equal(foe.state, 'windup');
  const angle = foe.angle;
  for (let i = 0; i < ticks(.7); i++) run.step({ x: 0, y: 1, dash: false });
  assert.equal(foe.angle, angle);
  assert.equal(run.player.hp, 100);
  for (let i = 0; i < ticks(20); i++) {
    if (run.offer) run.choose(run.offer.cards[0]);
    run.step(still);
    assert.ok(run.foes.length <= 30);
  }
});

import { Slice, wardPoint } from '../src/slice.ts';
import { Records, saveKey } from '../src/save.ts';

class Scenario extends Slice {
  silenceDirector = true;
  protected override direct() { if (!this.silenceDirector) super.direct(); }
  add(id: string, position = this.player, hp?: number) {
    return this.spawn(id, hp, position)!;
  }
  chest() { this.drop(this.player, 'chest', 1); }
  strike(amount: number) { this.hurt(amount); }
  setGuard() { this.guard = 1; }
}

test('T06 spends one collected catalyst to replace a full Dart slot, with Later supported', () => {
  const run = new Scenario(100);
  run.build.set('wick-dart', 5);
  run.build.set('thread-lens', 2);
  run.chest();
  run.step(still);
  assert.deepEqual(run.offer?.cards, ['comet-thread', 'later']);
  assert.equal(run.choose('later'), true);
  run.step(still);
  assert.equal(run.offer, null);
  assert.equal(run.catalysts, 1);
  run.build.set('thread-lens', 3);
  run.step(still);
  assert.equal(run.choose('comet-thread'), true);
  assert.deepEqual([...run.build], [['comet-thread', 1], ['thread-lens', 3]]);
  assert.equal(run.choose('comet-thread'), false);
  assert.equal(run.catalysts, 0);
});

test('T07 ward charge holds for five seconds, decays and queues boon before XP choices', () => {
  const run = new Scenario(5);
  Object.assign(run.player, wardPoint);
  for (let i = 0; i < ticks(3); i++) run.step(still);
  assert.ok(Math.abs(run.wardCharge - 3) < .001);
  run.player.x += 101;
  for (let i = 0; i < ticks(5); i++) run.step(still);
  assert.ok(Math.abs(run.wardCharge - 3) < .001);
  for (let i = 0; i < ticks(2); i++) run.step(still);
  assert.ok(Math.abs(run.wardCharge - 2) < .001);
  Object.assign(run.player, wardPoint);
  for (let i = 0; i < ticks(4); i++) run.step(still);
  assert.equal(run.wardComplete, true);
  assert.equal(run.offer?.kind, 'boon');
  assert.equal(run.choose('hearth'), true);
  assert.equal(run.player.hp, 110);
  assert.equal(run.offer?.kind, 'level');
});

test('T08 dash invulnerability preserves guard and grace prevents duplicate damage', () => {
  const run = new Scenario(1);
  run.setGuard();
  run.step({ ...still, dash: true });
  run.strike(15);
  assert.equal(run.guards, 1);
  for (let i = 0; i < ticks(.25); i++) run.step(still);
  run.strike(15);
  assert.equal(run.guards, 0);
  run.strike(15);
  assert.equal(run.player.hp, 100);
  for (let i = 0; i < ticks(.25); i++) run.step(still);
  run.strike(15);
  run.strike(15);
  assert.equal(run.player.hp, 85);
});

test('T09 authored deadlines give reasoned losses, and death wins same-tick ties', () => {
  const rite = new Scenario(2);
  rite.tick = ticks(240) - 1;
  rite.step(still);
  assert.equal(rite.result, 'rite');

  const time = new Scenario(2);
  time.wardComplete = true;
  time.tick = ticks(330) - 1;
  time.step(still);
  assert.equal(time.result, 'time');

  const tied = new Scenario(2);
  const boss = tied.add('warden', tied.player, 1);
  boss.state = 'idle';
  boss.hp = 0;
  tied.add('seedling');
  tied.player.hp = 1;
  tied.step(still);
  assert.equal(tied.result, 'hp');

  const timely = new Scenario(2);
  timely.wardComplete = true;
  timely.tick = ticks(330) - 1;
  timely.add('warden', { x: 100, y: 100 }).hp = 0;
  timely.step(still);
  assert.equal(timely.result, 'victory');
  assert.equal(timely.offer, null);
});

test('T10 Warden telegraphs before striking, switches to Briar and preserves toll safe sector', () => {
  const run = new Scenario(2);
  const boss = run.add('warden', { x: 1200, y: 650 }, rules.slice.bossHp);
  boss.state = 'idle';
  run.player.x = boss.x + 150;
  run.player.y = boss.y;
  run.step(still);
  assert.equal(boss.state, 'windup');
  assert.equal(boss.attack, 'cleave');
  assert.equal(run.player.hp, 100);
  run.player.y -= 150;
  while (run.tick < boss.until && boss.state === 'windup') run.step(still);
  assert.equal(run.player.hp, 100);
  boss.hp = 350;
  run.step(still);
  assert.equal(boss.phase, 2);
  assert.equal(boss.state, 'recover');
  while (boss.state !== 'windup') run.step(still);
  assert.equal(boss.attack, 'toll');
  run.player.x = boss.x + Math.cos(boss.angle) * 125;
  run.player.y = boss.y + Math.sin(boss.angle) * 125;
  for (let i = 0; i < ticks(2.9); i++) run.step(still);
  assert.equal(run.player.hp, 100);
});

test('T12 save finalizes once, preserves sibling keys and tolerates unavailable or future storage', () => {
  const entries = new Map([['forest-progress', 'untouched']]);
  const storage = { getItem: (id: string) => entries.get(id) ?? null, setItem: (id: string, value: string) => { entries.set(id, value); } };
  const records = new Records(() => storage);
  records.update({ ...records.data.settings, master: .4, mute: true });
  const run = new Scenario(42);
  run.result = 'victory';
  records.finalize(run, 'a');
  records.finalize(run, 'a');
  const saved = new Records(() => storage).data;
  assert.equal(saved.lifetime.runs, 1);
  assert.equal(saved.settings.master, .4);
  assert.deepEqual(saved.cosmetics.unlocked, ['dawn-scarf']);
  assert.equal(entries.get('forest-progress'), 'untouched');
  entries.set(saveKey, '{"schemaVersion":2}');
  const future = new Records(() => storage);
  future.finalize(run, 'b');
  assert.equal(entries.get(saveKey), '{"schemaVersion":2}');
  entries.set(saveKey, '{broken');
  assert.ok(new Records(() => storage).status);
  assert.ok(new Records(() => { throw new Error('blocked'); }).status);
});
