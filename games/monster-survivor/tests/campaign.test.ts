import assert from 'node:assert/strict';
import test from 'node:test';
import { CampaignRun } from '../src/campaign.ts';
import { gear, items, layouts, point, slots, stages, statsFor } from '../src/campaign-content.ts';
import { CampaignRecords, campaignKey } from '../src/campaign-save.ts';
import { enemies, rules } from '../src/content.ts';
import { distance, move, outsideSolids, ticks } from '../src/sim.ts';
import type { Point } from '../src/sim.ts';

const oldKey = 'ai-game-studio:monster-survivor:v1';
const idle = { x: 0, y: 0, dash: false };
const attempt = { id: 'first', stageId: stages[0].id, gold: 8, gear: ['patchcoat'], cleared: true, elapsedMs: 85000 };
const mockStorage = (entries: [string, string][] = []) => {
  const values = new Map(entries);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, data: string) => values.set(key, data) };
  return { values, storage: storage as unknown as Storage };
};

class Fixture extends CampaignRun {
  enemy(id: string, at: Point, hp?: number) { return this.spawn(id, hp, at)!; }
}

test('Campaign data contains five connected layouts, two reachable chests each, and 12 ranked items', () => {
  assert.equal(items.size, 12);
  assert.equal(stages.length, 5);
  for (const slot of slots) assert.equal([...items.values()].filter(item => item.slot === slot).length, 3);
  for (const item of items.values()) {
    for (const ranks of Object.values(item.stats)) {
      assert.equal(ranks.length, gear.rankCap + 1);
      assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    }
  }
  for (const stage of stages) {
    const run = new Fixture(stage, 9, statsFor(), undefined, 0, new Set());
    assert.ok(layouts[stage.id].routes.length >= 2);
    assert.ok(items.has(stage.firstClearGear));
    assert.ok(run.chests.length >= 2);
    const objectives = [run.exit, ...run.chests, ...run.groups];
    const radius = rules.player.radius;
    const step = 16;
    const start = point(stage.start);
    const count = Math.ceil(run.arena.width / step);
    const key = (at: Point) => Math.round(at.y / step) * count + Math.round(at.x / step);
    const seen = new Set([key(start)]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const here = queue[i];
      for (const [x, y] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const there = { ...here };
        if (move(there, x, y, radius, false, run.arena) || seen.has(key(there))) continue;
        seen.add(key(there));
        queue.push(there);
      }
    }
    for (const at of objectives) {
      assert.ok(outsideSolids(at, radius, run.arena), stage.id);
      assert.ok(queue.some(here => distance(here, at) <= 35), stage.id);
    }
  }
});

test('settlement banks one snapshot, rejects stale spending, and leaves the legacy bytes readable', () => {
  const legacy = '{ "schemaVersion": 1, "cosmetics": { "selected": "dawn-scarf" } }';
  const { values, storage } = mockStorage([[oldKey, legacy]]);
  const records = new CampaignRecords(() => storage);
  assert.equal(records.unlocked(stages[1].id), false);
  assert.equal(records.settle({ ...attempt, stageId: stages[4].id }), undefined);
  assert.equal(records.upgrade('ember-lantern', 0), false);
  assert.deepEqual(records.settle(attempt), { gold: 53, items: ['patchcoat', 'ember-lantern'], firstClear: true, completed: false });
  const competing = new CampaignRecords(() => storage);
  assert.equal(records.upgrade('ember-lantern', 0), true);
  assert.equal(competing.upgrade('ember-lantern', 0), false);
  assert.equal(competing.data.wallet, 18);
  assert.equal(records.equip('armor', 'ember-lantern'), false);
  assert.equal(records.equip('weapon', 'ember-lantern'), true);
  assert.equal(records.settle(attempt), undefined);
  assert.ok(competing.unlocked(stages[1].id));
  assert.equal(competing.settle({ ...attempt, id: 'loss', cleared: false, gold: 20 })?.gold, 32);
  assert.equal(competing.data.bestMs[attempt.stageId], 85000);
  assert.equal(competing.data.ranks['ember-lantern'], 1);
  assert.equal(competing.stats.flatMainDamage, 7);
  assert.equal(competing.upgrade('ember-lantern', 1), false);
  assert.equal(competing.settle({ ...attempt, id: 'replay', elapsedMs: 70000, gold: 250 })?.gold, 262);
  assert.equal(competing.data.bestMs[attempt.stageId], 70000);
  assert.ok(competing.upgrade('ember-lantern', 1));
  assert.ok(competing.upgrade('ember-lantern', 2));
  assert.equal(competing.upgrade('ember-lantern', 3), false);
  for (let i = 0; i < 90; i++) competing.settle({ ...attempt, id: 'replay-' + i, gold: 0, gear: [], cleared: false });
  assert.ok(competing.data.settled.length <= 80);
  assert.equal(values.get(oldKey), legacy);
  assert.equal(new CampaignRecords(() => storage).stats.flatMainDamage, 13);
});

test('future storage is preserved, bad data is visible, and blocked writes retain session rewards', () => {
  const future = '{ "schemaVersion": 4, "wallet": 9000 }';
  const { values, storage } = mockStorage([[campaignKey, future]]);
  const records = new CampaignRecords(() => storage);
  assert.match(records.status, /newer/);
  records.settle(attempt);
  assert.equal(values.get(campaignKey), future);
  assert.equal(records.data.wallet, 53);
  values.set(campaignKey, '{oops');
  const corrupt = new CampaignRecords(() => storage);
  assert.match(corrupt.status, /could not be read/);
  assert.equal(corrupt.data.wallet, 0);
  const unavailable = new CampaignRecords(() => { throw new Error(); });
  assert.match(unavailable.status, /session only/i);
  assert.equal(unavailable.settle(attempt)?.gold, 53);
  const denied = new CampaignRecords(() => ({ getItem: () => null, setItem: () => { throw new Error(); } }) as unknown as Storage);
  denied.settle(attempt);
  assert.equal(denied.data.wallet, 53);
  assert.match(denied.status, /session only/i);
});

test('confirmed splash excludes its direct collision and Burst only spends in an active attempt', () => {
  const run = new Fixture(stages[0], 1807, statsFor(items.get('prism-lantern'), 1), 'prism-lantern', 1, new Set());
  run.build.set('wick-dart', 2);
  const direct = run.enemy('seedling', { x: run.player.x + 55, y: run.player.y }, 100);
  const splash = run.enemy('seedling', { x: direct.x - 5, y: direct.y + 28 }, 100);
  const far = run.enemy('seedling', { x: direct.x + 85, y: direct.y + 20 }, 100);
  for (const foe of [direct, splash, far]) foe.def = { ...foe.def, speed: 0 };
  for (let i = 0; i < 10; i++) run.step(idle);
  assert.equal(direct.hp, 77);
  assert.equal(splash.hp, 91);
  assert.equal(far.hp, 100);
  const effect = run.spellEffects.find(cue => cue.kind === 'ring' && cue.spell === 'wick-dart');
  assert.equal(effect?.radius, 49);
  assert.ok(effect && effect.at.x < direct.x);
  run.charge = 100;
  run.offer = { kind: 'level', cards: ['wick-dart'], level: 3 };
  const tick = run.tick;
  run.step({ ...idle, burst: true });
  assert.equal(run.charge, 100);
  assert.equal(run.tick, tick);
  run.choose('wick-dart');
  const foe = run.enemy('seedling', { x: run.player.x, y: run.player.y + 45 }, 20);
  run.step({ ...idle, burst: true });
  assert.ok(foe.hp <= 0);
  assert.equal(run.charge, 0);
  assert.ok(run.spellEffects.some(cue => cue.spell === 'lantern-burst' && cue.radius === 150));
});

test('an early hybrid draft keeps Dart II available and locked exits cannot settle', () => {
  const stage = stages[0];
  const run = new Fixture(stage, 3, statsFor(), undefined, 0, new Set());
  Object.assign(run.player, run.exit);
  run.step({ ...idle, interact: true });
  assert.equal(run.result, null);
  run.player.hp = 100;
  for (let index = 0; index < 2; index++) {
    run.xp = run.xpGoal - 1;
    run.loot.push({ ...run.player, kind: 'ember', value: 2, expires: Infinity });
    run.step(idle);
    assert.ok(run.offer?.cards.includes('wick-dart'));
    run.choose(run.offer!.cards.find(id => id !== 'wick-dart')!);
  }
  run.tick = ticks(420) - 1;
  run.step(idle);
  assert.equal(run.result, 'time');
});

test('the crypt lantern takes real damage and its second wave starts four seconds after the first clears', () => {
  const stage = stages[2];
  const run = new Fixture(stage, 42, statsFor(), undefined, 0, new Set());
  Object.assign(run.player, run.groups[0]);
  run.step(idle);
  const group = run.groups[0];
  assert.equal(group.wave, 1);
  assert.equal(run.lantern?.hp, 150);
  const attacker = run.foes.find(foe => group.ids.has(foe.id))!;
  attacker.x = run.lantern!.x + enemies.get('seedling')!.radius;
  attacker.y = run.lantern!.y;
  run.step(idle);
  assert.ok(run.lantern!.hp < 150);
  for (const foe of run.foes) if (group.ids.has(foe.id)) foe.hp = 0;
  run.step(idle);
  const due = run.tick + 240;
  assert.equal(group.next, due);
  run.offer = null;
  run.tick = due - 2;
  run.step(idle);
  assert.equal(group.wave, 1);
  run.offer = null;
  run.step(idle);
  assert.equal(group.wave, 2);
  run.lantern!.hp = 0;
  run.offer = null;
  run.step(idle);
  assert.equal(run.result, 'rite');
});

test('the same Venom Marsh opening pack clears faster with Ember Lantern +1', () => {
  class GroupFixture extends Fixture { override get xpGoal() { return Infinity; } }
  const stage = stages[1];
  const weapon = items.get('ember-lantern')!;
  const clearTicks = [0, 1].map(rank => {
    const run = new GroupFixture(stage, 1807, statsFor(weapon, rank), weapon.id, rank, new Set([weapon.id]));
    run.build.set('wick-dart', 2);
    for (let tick = 0; tick < ticks(16); tick++) {
      const x = tick < 75 ? .5 : tick < 210 ? -.6 : .25;
      const y = tick < 75 ? .3 : tick < 210 ? -.45 : .3;
      run.step({ x, y, dash: false });
      run.clearSpellEffects();
      run.cues.length = 0;
      if (run.kills === 8) return run.tick;
    }
    throw new Error('Opening group did not clear in the fixture');
  });
  assert.ok(clearTicks[1] <= clearTicks[0] * .85, JSON.stringify(clearTicks));
});
