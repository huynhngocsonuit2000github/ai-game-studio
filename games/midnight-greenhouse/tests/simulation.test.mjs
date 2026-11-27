import { URL } from "node:url";
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Garden } from '../dist/simulation.js';
import { Save } from '../dist/save.js';

const campaign = JSON.parse(readFileSync(new URL('../dist/content.json', import.meta.url)));
const source = campaign.raincourt;
const routes = JSON.parse(readFileSync(new URL('./campaign-routes.json', import.meta.url)));
const tickUntil = (game, at) => { while (!game.result && game.now < at) game.step(); };
const plant = (game, card, lane, col) => { game.queue({ kind: 'plant', card, lane, col }); game.step(); };
const water = (game, lane) => { game.queue({ kind: 'water', lane }); game.step(); };
const enemy = (game, id, lane, x) => {
  const spec = game.content.hostiles.find((hostile) => hostile.id === id);
  const unit = { id: game.enemies.length + 100, spec, lane, x, hp: spec.hp, biteAt: Infinity, rootedUntil: Infinity, acted: -1, hurt: -1 };
  game.enemies.push(unit);
  return unit;
};

test('placements and removal debit once; bad requests preserve resources and locks', () => {
  const game = new Garden(source);
  plant(game, 'fern', 1, 2);
  const paid = game.stock;
  const lock = game.placementReady.get('fern');
  plant(game, 'fern', 1, 2);
  plant(game, 'fern', 3, 5);
  plant(game, 'pitcher', 4, 0);
  plant(game, 'orchid', 0, 0); // 150 - 65 < 90.
  enemy(game, 'walker', 0, 3.5);
  plant(game, 'pitcher', 0, 3);
  assert.equal(game.stock, paid);
  assert.equal(game.placementReady.get('fern'), lock);
  for (let i = 0; i < 2; i++) {
    game.queue({ kind: 'remove', lane: 1, col: 2 });
    game.step();
  }
  assert.equal(game.stock, paid + 16);
  assert.equal(game.plants.length, 0);
});

test('collector starts in combat, with only one wet lane paying a bonus', () => {
  const game = new Garden(source);
  water(game, 1);
  const lock = game.waterReady;
  water(game, 2);
  assert.equal(game.wet, 1);
  assert.equal(game.waterReady, lock);
  plant(game, 'pitcher', 1, 0);
  tickUntil(game, game.prep - 1);
  assert.equal(game.stock, 105);
  tickUntil(game, game.prep + 8 * 30 - 1);
  assert.equal(game.stock, 110);
  game.step();
  assert.equal(game.stock, 128);
  water(game, 2);
  assert.equal(game.wet, 2);
  tickUntil(game, game.prep + 16 * 30);
  assert.equal(game.stock, 148);
});

test('wet shock skips raincoats, follows forward gap and stops at four targets', () => {
  const game = new Garden(source);
  plant(game, 'orchid', 1, 2);
  water(game, 1);
  const targets = [3.1, 4.35, 5.6, 6.85, 7.3].map((x) => enemy(game, 'walker', 1, x));
  const insulated = enemy(game, 'raincoat', 1, 3.8);
  const otherLane = enemy(game, 'walker', 0, 3.5);
  tickUntil(game, game.prep);
  assert.deepEqual(targets.map((unit) => unit.spec.hp - unit.hp), [25, 20, 16, 12, 0]);
  assert.equal(insulated.hp, insulated.spec.hp);
  assert.equal(otherLane.hp, otherLane.spec.hp);
  assert.equal(game.bestChain, 4);

  const dry = new Garden(source);
  plant(dry, 'orchid', 1, 2);
  const first = enemy(dry, 'walker', 1, 3.1);
  const second = enemy(dry, 'walker', 1, 3.2);
  tickUntil(dry, dry.prep);
  assert.equal(first.spec.hp - first.hp, 25);
  assert.equal(second.spec.hp - second.hp, 0);
});

test('root honors frontal armor; timed fern impact pierces it and rewards once', () => {
  const game = new Garden(source);
  plant(game, 'bramble', 1, 4);
  plant(game, 'fern', 1, 0);
  const target = enemy(game, 'porter', 1, 5.1);
  target.rootedUntil = 0;
  tickUntil(game, game.prep);
  assert.equal(target.hp, 260 - 15 * 0.45);
  assert.equal(target.rootedUntil, game.prep + 48);
  tickUntil(game, game.prep + 12);
  assert.equal(target.hp, 260 - 15 * 0.45 - 24);
  target.hp = 1;
  const stock = game.stock;
  tickUntil(game, game.prep + 85);
  assert.equal(game.stock, stock + target.spec.killStock);
  assert.equal(game.enemies.length, 0);
});

test('existing impact before escape awards a kill; last lethal breach decides defeat', () => {
  const game = new Garden(source);
  tickUntil(game, game.prep);
  const target = enemy(game, 'walker', 0, -0.35);
  game.shots.push({ at: game.now + 1, target, damage: target.hp });
  game.step();
  assert.equal(game.core, 3);
  assert.equal(game.stock, source.level.startingStock + target.spec.killStock);
  for (let lane = 0; lane < 3; lane++) enemy(game, 'walker', lane, -0.35);
  game.step();
  assert.equal(game.result, 'defeat');
  assert.equal(game.firstBreach, 0);
  assert.equal(game.lastBreach, 2);
});

test('scheduled fault warns, cuts only its active route and reopens on the authored tick', () => {
  const fixture = globalThis.structuredClone(campaign['pump-gallery']);
  fixture.level.waves = [{ ...fixture.level.waves[0], atSeconds: 300 }];
  const game = new Garden(fixture);
  const fault = fixture.level.faults[0];
  const lane = fault.lane - 1;
  const closeAt = game.prep + fault.atSeconds * 30;
  const opensAt = closeAt + fault.closedSeconds * 30;
  tickUntil(game, closeAt - fault.warningSeconds * 30);
  assert.equal(game.valveState(lane).closesAt, closeAt);
  tickUntil(game, closeAt - 30);
  water(game, lane);
  const cooldown = game.waterReady;
  tickUntil(game, closeAt);
  assert.equal(game.valveState(lane).opensAt, opensAt);
  assert.equal(game.wet, null);
  assert.equal(game.waterReady, cooldown);
  assert.match(game.check({ kind: 'water', lane }), /đang đóng/);
  tickUntil(game, cooldown);
  water(game, 0);
  assert.equal(game.wet, 0);
  tickUntil(game, opensAt);
  assert.equal(game.valveState(lane).opensAt, 0);
  water(game, lane);
  assert.equal(game.wet, lane);
});

test('Moss needs four seconds of rest and the Pod waits, blasts one lane and is consumed', () => {
  const game = new Garden(campaign['lightning-dome']);
  tickUntil(game, game.prep);
  plant(game, 'moss', 0, 1);
  water(game, 0);
  const moss = game.plants[0];
  moss.hp = 300;
  moss.hurt = game.now;
  tickUntil(game, moss.hurt + 119);
  assert.equal(moss.hp, 300);
  game.step();
  assert.ok(moss.hp > 300);

  plant(game, 'pod', 2, 4);
  const chosen = enemy(game, 'walker', 2, 5.05);
  const nearby = enemy(game, 'porter', 2, 5.62);
  const far = enemy(game, 'walker', 2, 6.0);
  const other = enemy(game, 'walker', 3, 5.05);
  const pod = game.plants.find(({ card }) => card.id === 'pod');
  tickUntil(game, pod.ready - 1);
  assert.equal(chosen.hp, chosen.spec.hp);
  game.step();
  assert.ok(chosen.hp <= 0);
  assert.equal(nearby.spec.hp - nearby.hp, 130);
  assert.equal(far.hp, far.spec.hp);
  assert.equal(other.hp, other.spec.hp);
  assert.equal(game.plants.includes(pod), false);
});

test('Mender chooses the most injured eligible ally by ratio and respects heal cooldown', () => {
  const game = new Garden(campaign['lightning-dome']);
  tickUntil(game, game.prep);
  const mender = enemy(game, 'mender', 0, 5);
  const walker = enemy(game, 'walker', 0, 5.9);
  const porter = enemy(game, 'porter', 0, 4);
  const keeper = enemy(game, 'keeper', 0, 5);
  const other = enemy(game, 'walker', 1, 5.1);
  mender.hp = keeper.hp = other.hp = 1;
  walker.hp = 33;
  porter.hp = 120;
  game.step();
  assert.equal(walker.hp, 55);
  assert.equal(porter.hp, 120);
  assert.equal(mender.hp, 1);
  assert.equal(keeper.hp, 1);
  assert.equal(other.hp, 1);
  tickUntil(game, mender.healAt - 1);
  assert.equal(porter.hp, 120);
  game.step();
  assert.equal(porter.hp, 142);
});

test('Keeper threshold slows rather than roots; boss death leaves pump closure active', () => {
  const modified = globalThis.structuredClone(campaign['lightning-dome']);
  modified.level.faults = [{ lane: 1, atSeconds: 2, warningSeconds: 1, closedSeconds: 16 }];
  const game = new Garden(modified);
  tickUntil(game, game.prep);
  plant(game, 'bramble', 0, 4);
  water(game, 0);
  const keeper = enemy(game, 'keeper', 0, 5.6);
  keeper.rootedUntil = 0;
  keeper.hp = 798;
  game.step();
  assert.equal(game.keeperPhase, 2);
  assert.equal(keeper.rootedUntil, 0);
  assert.equal(keeper.slowedUntil, game.now + 30);
  assert.ok(game.valveState(0).sources.includes('keeper'));
  tickUntil(game, game.prep + 78);
  assert.deepEqual(new Set(game.valveState(0).sources), new Set(['pump', 'keeper']));
  keeper.hp = 0;
  game.step();
  assert.deepEqual(game.valveState(0).sources, ['pump']);
  assert.equal(game.valveState(0).opensAt, game.prep + 18 * 30);
});

test('Keeper breach is immediately lethal to a full core', () => {
  const game = new Garden(campaign['lightning-dome']);
  tickUntil(game, game.prep);
  enemy(game, 'keeper', 2, -0.35);
  game.step();
  assert.equal(game.result, 'defeat');
  assert.equal(game.core, 0);
  assert.equal(game.firstBreach, 2);
});

for (const [id, route] of Object.entries(routes)) {
  test(id + ' accepts the authored clear route at normal simulation speed', () => {
    const game = new Garden(campaign[id]);
    const effects = [];
    const step = () => {
      game.step();
      effects.push(...game.effects.filter(({ at }) => at === game.now).map(({ kind, lane }) => [kind, lane, game.wet]));
    };
    for (const [second, kind, lane, col] of route) {
      while (game.now < second * 30 && !game.result) step();
      const command = kind === 'water' ? { kind, lane } : kind === 'remove' ? { kind, lane, col }
        : { kind: 'plant', card: kind, lane, col };
      assert.equal(game.check(command), '', JSON.stringify([second, kind, lane, col]));
      game.queue(command);
      step();
      assert.equal(game.feedback, '');
    }
    while (!game.result && game.now < 30 * 720) step();
    assert.equal(game.result, 'victory');
    assert.equal(game.core, 3);
    if (id === 'lightning-dome') {
      const firstLock = effects.findIndex(([kind, lane, wet]) => kind === 'valve-lock' && lane === 0 && wet === 1);
      assert.ok(firstLock >= 0, 'The first lock must miss the redirected water.');
      assert.ok(effects.slice(firstLock + 1).some(([kind, lane, wet]) => kind === 'valve-lock' && lane === 1 && wet === null));
      assert.ok(effects.some(([kind]) => kind === 'phase'));
      assert.ok(effects.findIndex(([kind]) => kind === 'keeper-down') < effects.findIndex(([kind]) => kind === 'victory'));
    }
  });
}

test('campaign records preserve S03 saves, keep fastest and stars independently, and reject gaps', () => {
  const entries = new Map([['midnight-greenhouse.progress.v1', JSON.stringify({
    version: 1, raincourt: { stars: 3, fastest: 440 }, 'lightning-dome': { stars: 3, fastest: 10 },
  })]]);
  const descriptors = Object.fromEntries(['localStorage', 'matchMedia'].map((key) =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, {
    localStorage: { configurable: true, value: {
      getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value),
    } },
    matchMedia: { configurable: true, value: () => ({ matches: false }) },
  });
  try {
    const save = new Save();
    assert.equal(save.unlocked('pump-gallery'), true);
    assert.equal(save.unlocked('lightning-dome'), false);
    save.win('lightning-dome', 3, 20);
    assert.equal(save.record('lightning-dome'), undefined);
    save.win('raincourt', 2, 429);
    assert.deepEqual(save.record('raincourt'), { stars: 3, fastest: 429 });
    save.win('pump-gallery', 1, 450);
    save.win('pump-gallery', 3, 460);
    save.win('pump-gallery', 3, 460);
    const reloaded = new Save();
    assert.deepEqual(reloaded.record('pump-gallery'), { stars: 3, fastest: 450 });
    assert.equal(reloaded.unlocked('lightning-dome'), true);
    assert.equal(reloaded.record('lightning-dome'), undefined);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
