import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fernlight } from '../src/level.ts';
import { Session, STEP_MS } from '../src/session.ts';

const idle = { left: false, right: false, jump: false, pressedJump: false };
const right = { ...idle, right: true };
const floor = { x: 0, y: 432, width: 1000, height: 144 };
const stage = {
  ...fernlight, width: 1000, solids: [floor], hazards: [], enemies: [],
  checkpoint: { id: 'checkpoint', x: 300, y: 432 },
  goal: { id: 'exit', x: 950, y: 432 },
  seeds: Array.from({ length: 3 }, (_, index) => ({ id: `seed-${index}`, x: 200 + 150 * index, y: 397 })),
  fireflies: [],
};
const tap = { ...idle, pressedJump: true };
const hold = { ...idle, jump: true };
const launch = { ...hold, pressedJump: true };

function simulate(session, ticks, input = idle) {
  return Array.from({ length: ticks }, () => session.step(input)).flat();
}

test('held and tapped jumps meet their apex targets and land once', () => {
  for (const [initial, following, min, max] of [[launch, hold, 88, 99], [tap, idle, 22, 30]]) {
    const session = new Session(stage);
    let apex = session.player.y;
    assert.deepEqual(session.step(initial), ['jump']);
    const events = [];
    for (let tick = 0; tick < 60; tick++) {
      events.push(...session.step(following));
      apex = Math.min(apex, session.player.y);
    }
    const rise = stage.spawn.y - apex;
    assert.ok(rise >= min && rise <= max, `jump rose ${rise} px`);
    assert.deepEqual(events, ['land']);
    assert.equal(session.player.y, floor.y);
  }
});

test('coyote jump works within 100 ms of leaving ground', () => {
  for (const [elapsedTicks, shouldJump] of [[5, true], [7, false]]) {
    const session = new Session({ ...stage, solids: [{ ...floor, width: 200 }] });
    while (session.player.grounded) session.step(right);
    simulate(session, elapsedTicks - 1, right);
    assert.equal(session.step({ ...launch, right: true }).includes('jump'), shouldJump);
  }
});

test('jump input buffers for 120 ms and fires at most once on landing', () => {
  for (const [feet, shouldJump] of [[405, true], [341, false]]) {
    const session = new Session(stage);
    Object.assign(session.player, { y: feet, vy: 300, grounded: false });
    // Leave the spawn coyote window before measuring airborne buffering.
    session.ticks = 20;
    session.step(launch);
    const events = simulate(session, 45, hold);
    assert.equal(events.filter((event) => event === 'jump').length, Number(shouldJump));
  }
});

test('a descending beetle stomp bounces once and wins over same-tick side contact', () => {
  const session = new Session({
    ...stage,
    enemies: [
      { id: 'moth', type: 'moth', phaseOffset: 0, x: 600, y: 380 },
      { id: 'beetle', type: 'beetle', x: 600, y: 432, left: 560, right: 630 },
    ],
  });
  Object.assign(session.player, { x: 600, y: 395, vy: 240, grounded: false });
  assert.deepEqual(session.step(idle), ['stomp']);
  assert.equal(session.player.vy, -365);
  assert.equal(session.hearts, 3);
  assert.equal(session.enemies[1].defeated, true);
  assert.ok(!simulate(session, 12).includes('stomp'));
});

test('moth cannot be stomped, and repeated contact cannot bypass 900 ms lockout', () => {
  const session = new Session({ ...stage, enemies: [{ id: 'moth', type: 'moth', phaseOffset: 0, x: 600, y: 420 }] });
  Object.assign(session.player, { x: 600, y: 390, vy: 260, grounded: false });
  assert.deepEqual(session.step(idle), ['healthChanged']);
  assert.equal(session.hearts, 2);
  assert.equal(Math.round(session.damageTicks * STEP_MS), 900);
  assert.equal(session.enemies[0].defeated, false);
  for (let tick = 0; tick < 53; tick++) {
    Object.assign(session.player, { x: session.enemies[0].x, y: floor.y, vy: 0, vx: 0 });
    assert.ok(!session.step(idle).includes('healthChanged'));
  }
  assert.equal(session.hearts, 2);
});

test('the gate rejects zero to two seeds and clears exactly once after the final pickup', () => {
  for (let count = 0; count < 3; count++) {
    const session = new Session(stage);
    for (const seed of stage.seeds.slice(0, count)) session.seeds.add(seed.id);
    session.player.x = stage.goal.x;
    assert.deepEqual(session.step(idle), []);
    assert.equal(session.phase, 'playing');
    assert.equal(session.atGate, true);
    assert.equal(session.result, null);
  }
  const last = { ...stage.seeds[2], x: stage.goal.x };
  const session = new Session({ ...stage, seeds: [...stage.seeds.slice(0, 2), last] });
  for (const seed of stage.seeds.slice(0, 2)) session.seeds.add(seed.id);
  session.player.x = stage.goal.x;
  assert.deepEqual(session.step(idle), ['seedCollected', 'gateOpened', 'levelCleared']);
  const result = session.result;
  assert.equal(result.flawless, true);
  assert.deepEqual(simulate(session, 10), []);
  assert.equal(session.result, result);
  assert.equal(session.ticks, result.ticks);
});

for (const cause of ['fall', 'empty hearts']) {
  test(`${cause} respawns once at the lantern with collected IDs and full health`, () => {
    const session = new Session({ ...stage, hazards: [{ x: 695, y: 410, width: 30, height: 22 }] });
    session.player.x = stage.seeds[0].x;
    assert.deepEqual(session.step(idle), ['seedCollected']);
    session.fireflies.add('test-fly');
    session.player.x = stage.checkpoint.x;
    assert.deepEqual(session.step(idle), ['lanternLit']);
    session.player.x = 710;
    if (cause === 'fall') {
      session.player.y = session.level.killY;
      session.damageTicks = 50;
      assert.deepEqual(session.step(idle), ['fall']);
    } else {
      session.hearts = 1;
      assert.deepEqual(session.step(idle), ['healthChanged']);
    }
    assert.equal(session.phase, 'recovering');
    assert.equal(session.deaths, 1);
    assert.equal(simulate(session, 38).length, 0);
    assert.deepEqual(session.step(idle), ['respawn']);
    assert.equal(39 * STEP_MS, 650);
    assert.equal(session.hearts, 3);
    assert.deepEqual([...session.seeds], [stage.seeds[0].id]);
    assert.deepEqual([...session.fireflies], ['test-fly']);
    assert.equal(session.player.x, stage.checkpoint.x);
    assert.equal(session.player.y, stage.checkpoint.y);
    assert.equal(session.ticks, 42);
    assert.deepEqual(simulate(session, 10), []);
  });
}

test('the Fernlight layout has three mandatory gaps, three seeds and eight optional fireflies', () => {
  const ground = fernlight.solids.filter(({ y }) => y === 432);
  assert.deepEqual(ground.slice(1).map(({ x }, index) => x - (ground[index].x + ground[index].width)), [96, 96, 128]);
  assert.equal(fernlight.seeds.length, 3);
  assert.equal(new Set(fernlight.fireflies.map(({ id }) => id)).size, 8);
});
