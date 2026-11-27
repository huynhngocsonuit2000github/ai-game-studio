import { URL } from "node:url";
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Garden } from '../dist/simulation.js';

const source = JSON.parse(readFileSync(new URL('../dist/content.json', import.meta.url)));
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
