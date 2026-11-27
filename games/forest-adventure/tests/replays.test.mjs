import assert from 'node:assert/strict';
import { test } from 'node:test';
import replays from '../features/exp-10-trails/layouts/TRAIL_REPLAYS.json' with { type: 'json' };
import { classicLevels, expansionLevels } from '../src/level.ts';
import { Session } from '../src/session.ts';
import { fernlight, oak, willow } from './campaign-routes.ts';

const legacyRoutes = [
  [fernlight, 1239, 2, 1],
  [[...willow, [24]], 867, 2, 0],
  [[...oak, [32]], 1088, 1, 0],
];

function checkClear(session, { ticks, hearts, deaths }) {
  assert.equal(session.phase, 'cleared');
  assert.equal(session.seeds.size, 3);
  assert.equal(session.fireflies.size, 8);
  assert.equal(session.hearts, hearts);
  assert.equal(session.deaths, deaths);
  assert.equal(session.checkpoint, true);
  assert.deepEqual(session.result, { ticks, fireflies: 8, deaths, flawless: deaths === 0 });
}

test('the campaign includes each original level and all ten supplied trails in order', () => {
  assert.deepEqual(classicLevels.map(({ id }) => id), ['fernlight-trail', 'willow-run', 'lantern-oak']);
  const expected = Array.from({ length: 10 }, (_, index) => `trail-${String(index + 1).padStart(2, '0')}`);
  assert.deepEqual(expansionLevels.map(({ id }) => id), expected);
  assert.deepEqual(replays.runs.map(({ levelId }) => levelId), expected);
});

for (const [index, level] of classicLevels.entries()) {
  test(`deterministic legacy clear: ${level.id}`, () => {
    const [route, ticks, hearts, deaths] = legacyRoutes[index];
    const session = new Session(level);
    let held = false;
    for (const [frames, direction = 1, jump = false] of route) {
      for (let frame = 0; frame < frames; frame++) {
        session.step({ left: direction < 0, right: direction > 0, jump, pressedJump: jump && !held && frame === 0 });
      }
      held = jump;
    }
    checkClear(session, { ticks, hearts, deaths });
  });
}

for (const level of expansionLevels) {
  test(`deterministic supplied clear: ${level.id}`, () => {
    const fixture = replays.runs.find(({ levelId }) => levelId === level.id);
    assert.ok(fixture, 'Missing replay fixture');
    const session = new Session(level);
    let damaged = false;
    for (const [action, repeats] of fixture.runsOfActions) {
      assert.match(action, /^[RLI][JHP]?$/);
      const left = action.startsWith('L');
      const right = action.startsWith('R');
      const jump = /[JH]$/.test(action);
      for (let repeat = 0; repeat < repeats; repeat++) {
        for (let frame = 0; frame < replays.ticksPerAction; frame++) {
          const pressedJump = frame === 0 && /[JP]$/.test(action);
          if (session.step({ left, right, jump, pressedJump }).includes('healthChanged')) damaged = true;
        }
      }
    }
    checkClear(session, { ticks: fixture.tickCount, hearts: 3, deaths: 0 });
    assert.equal(damaged, false);
  });
}
