import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from "node:url";
import { ticks } from '../dist/content.js';
import { bodyMotion, enemyPose, frameOf, plantPose } from '../dist/motion.js';
import { Save } from '../dist/save.js';
import { Garden } from '../dist/simulation.js';

const campaign = JSON.parse(readFileSync(new URL('../dist/content.json', import.meta.url)));
function durable(stage) {
  return { ...stage, level: { ...stage.level, coreHealth: 100 } };
}

const atlas = JSON.parse(readFileSync(new URL('../dist/art/retro/motion/atlas.json', import.meta.url)));
const step = (garden, n = 1) => { for (let i = 0; i < n; i++) garden.step(); };
const finish = (garden, at) => step(garden, at - garden.now);
const put = (garden, card, lane, col) => {
  const cmd = { kind: 'plant', card, lane, col };
  assert.equal(garden.check(cmd), '');
  garden.queue(cmd);
  step(garden);
  return garden.plants.find((plant) => plant.lane === lane && plant.col === col);
};
const enemy = (garden, id, lane, x, overrides = {}) => {
  const spec = garden.content.hostiles.find((unit) => unit.id === id);
  assert.ok(spec, id);
  const hostile = { id: 90 + garden.enemies.length, spec, lane, x, hp: spec.hp, rootedUntil: 0, stunnedUntil: 0,
    biteAt: 0, acted: -30, hurt: -30, gait: 0, moving: false, healed: -30, braced: -30, insulated: -30, ...overrides };
  garden.enemies.push(hostile);
  return hostile;
};

test('the first campaign stage gives six seconds of prep and spawns at combat second four', () => {
  const garden = new Garden(campaign.raincourt);
  const fern = put(garden, 'fern', 1, 3);
  assert.equal(garden.prep, 180);
  assert.match(garden.cardStatus('orchid'), /đợt 3/);
  assert.notEqual(garden.check({ kind: 'water', lane: 1 }), '');
  finish(garden, ticks(9));
  assert.equal(garden.drops[0].value, 28);
  finish(garden, ticks(10) - 1);
  assert.equal(garden.enemies.length, 0);
  step(garden);
  assert.equal(garden.enemies[0].spec.id, 'walker');
  assert.equal(garden.enemies[0].lane, 1);
  assert.equal(plantPose(fern, garden).clip, 'windup');
  assert.equal(garden.shots.length, 0);
  step(garden, 12);
  assert.equal(plantPose(fern, garden).clip, 'fire');
  assert.equal(garden.shots.length, 1);
  assert.ok(garden.shots[0].target.moving);
  assert.notEqual(enemyPose(garden.enemies[0], garden).age, 0);
});

test('manual, bulk and automatic credit cannot award the same token twice', () => {
  const garden = new Garden(campaign.raincourt);
  const stock = garden.stock;
  finish(garden, ticks(12) - 1);
  const [first] = garden.drops;
  assert.equal(garden.stock, stock);
  assert.equal(first.expires, garden.now + 1);
  garden.queue({ kind: 'collect', id: first.id });
  garden.queue({ kind: 'collect', id: first.id });
  garden.queue({ kind: 'collect' });
  step(garden);
  assert.equal(garden.stock, stock + 28);
  assert.equal(garden.drops.length, 0);
  assert.equal(garden.effects.filter(({ kind }) => kind === 'collect').length, 1);
  finish(garden, ticks(22));
  assert.equal(garden.stock, stock + 56);
  const restarted = new Garden(campaign.raincourt);
  restarted.queue({ kind: 'collect', id: first.id });
  step(restarted);
  assert.equal(restarted.stock, stock);
  assert.equal(restarted.bell, 1);
});

test('pitcher timing is water-independent and a fourth pitcher cannot spend or reset the cooldown', () => {
  const garden = new Garden(campaign['pump-gallery']);
  const first = put(garden, 'pitcher', 0, 0);
  assert.equal(first.ready, garden.prep + ticks(10));
  garden.queue({ kind: 'water', lane: 0 });
  finish(garden, ticks(6) + 1);
  put(garden, 'pitcher', 1, 0);
  finish(garden, ticks(12) + 3);
  put(garden, 'pitcher', 2, 0);
  finish(garden, ticks(16) - 1);
  assert.equal(plantPose(first, garden).clip, 'gather');
  step(garden);
  assert.equal(plantPose(first, garden).clip, 'release');
  assert.ok(garden.drops.some((drop) => drop.lane === 0 && drop.value === 18));
  const before = garden.stock;
  const ready = garden.placementReady.get('pitcher');
  const attempt = { kind: 'plant', card: 'pitcher', lane: 3, col: 0 };
  assert.match(garden.check(attempt), /Đã đủ 3/);
  garden.queue(attempt);
  step(garden);
  assert.equal(garden.stock, before);
  assert.equal(garden.placementReady.get('pitcher'), ready);
});

test('Orchid unlocks on the third warning and dry chain only hits eligible neighbors', () => {
  const garden = new Garden(durable(campaign.raincourt));
  const wave = garden.content.level.waves[2];
  const unlock = garden.prep + ticks(wave.atSeconds - wave.announceLeadSeconds);
  finish(garden, unlock - 1);
  assert.match(garden.cardStatus('orchid'), /đợt 3/);
  step(garden);
  assert.ok(!garden.cardStatus('orchid'));
  garden.enemies.splice(0);
  const orchid = put(garden, 'orchid', 0, 1);
  const targets = [
    enemy(garden, 'walker', 0, 4.2), enemy(garden, 'raincoat', 0, 4.4),
    enemy(garden, 'walker', 0, 4.6), enemy(garden, 'porter', 0, 4.8),
  ];
  step(garden, 25);
  assert.equal(plantPose(orchid, garden).clip, 'charge');
  step(garden, 13);
  const hit = garden.effects.find(({ kind }) => kind === 'shock');
  assert.equal(hit.targets.length, 2);
  assert.equal(garden.bestChain, 2);
  assert.equal(targets[1].hp, targets[1].spec.hp);
  assert.equal(enemyPose(targets[1], garden).clip, 'insulated');
  assert.equal(targets[3].hp, targets[3].spec.hp);
});

test('an Orchid cues isolated Raincoat immunity without firing or harming the enemy', () => {
  const garden = new Garden(campaign['pump-gallery']);
  const orchid = put(garden, 'orchid', 2, 1);
  finish(garden, 181);
  const raincoat = enemy(garden, 'raincoat', 2, 4.2);
  step(garden);
  assert.equal(raincoat.hp, raincoat.spec.hp);
  assert.equal(enemyPose(raincoat, garden).clip, 'insulated');
  assert.equal(plantPose(orchid, garden).clip, 'idle');
  assert.ok(garden.effects.some(({ kind }) => kind === 'insulated'));
  assert.ok(!garden.effects.some(({ kind }) => kind === 'shock'));
});

test('wet regeneration and wet chain work alongside independent pump lock and reroute', () => {
  const garden = new Garden(durable(campaign['pump-gallery']));
  const moss = put(garden, 'moss', 3, 2);
  put(garden, 'orchid', 3, 1);
  garden.queue({ kind: 'water', lane: 3 });
  finish(garden, 181);
  moss.hp -= 100;
  moss.hurt = garden.now - ticks(4);
  const mixed = ['walker', 'courier', 'mender', 'porter'].map((id, i) => enemy(garden, id, 3, 5 + i * 0.23));
  step(garden, 19);
  assert.ok(moss.hp > moss.card.hp - 100);
  assert.equal(plantPose(moss, garden).clip, 'mend');
  assert.equal(garden.bestChain, 4);
  assert.ok(mixed.every((unit) => unit.hp < unit.spec.hp));
  finish(garden, ticks(6 + 52));
  assert.ok(Number.isFinite(garden.valveState(3).closesAt));
  garden.queue({ kind: 'water', lane: 2 });
  finish(garden, ticks(6 + 55));
  assert.equal(garden.wet, 2);
  assert.ok(garden.valveState(3).opensAt > garden.now);
  assert.match(garden.check({kind:'water',lane:3}), /đang đóng/);
});

test('bell resolves tied breaches in spawn order, stuns peers and never intercepts Keeper', () => {
  const garden = new Garden(campaign['lightning-dome']);
  finish(garden, 181);
  enemy(garden, 'courier', 1, -0.36);
  enemy(garden, 'walker', 1, -0.36);
  const peer = enemy(garden, 'porter', 1, 0.7);
  step(garden);
  assert.equal(garden.bell, 0);
  assert.equal(garden.core, 2);
  assert.equal(garden.fallen[0].id, 'courier');
  assert.equal(garden.drops.length, 0);
  assert.ok(peer.stunnedUntil > garden.now);
  const x = peer.x;
  step(garden, ticks(1));
  assert.equal(peer.x, x);
  assert.equal(enemyPose(peer, garden).clip, 'restrained');
  const newGarden = new Garden(campaign['lightning-dome']);
  finish(newGarden, 181);
  enemy(newGarden, 'keeper', 0, -0.36);
  step(newGarden);
  assert.equal(newGarden.result, 'defeat');
  assert.equal(newGarden.bell, 1);
});

test('a Pod arms, commits a burst on real contact and leaves exactly one visual record', () => {
  const garden = new Garden(campaign['lightning-dome']);
  const pod = put(garden, 'pod', 0, 4);
  assert.equal(plantPose(pod, garden).clip, 'arm');
  finish(garden, 182);
  assert.equal(plantPose(pod, garden).clip, 'armed');
  const target = enemy(garden, 'walker', 0, 5.1);
  step(garden, 4);
  assert.equal(plantPose(pod, garden).clip, 'arm');
  assert.equal(target.hp, target.spec.hp);
  step(garden, 4);
  assert.ok(!garden.plants.includes(pod));
  assert.ok(!garden.enemies.includes(target));
  assert.equal(garden.fallen.filter((record) => record.id === 'pod').length, 1);
  assert.equal(garden.fallen.find((record) => record.id === 'pod').clip, 'burst');
  step(garden, 48);
  assert.equal(garden.fallen.length, 0);
});

test('ally heal, armored frontal recoil and Keeper phase use game state and maintain bounded visuals', () => {
  const garden = new Garden(campaign['lightning-dome']);
  put(garden, 'bramble', 0, 4);
  finish(garden, 181);
  const porter = enemy(garden, 'porter', 0, 5.1, { hp: 180 });
  const mender = enemy(garden, 'mender', 0, 5.3);
  const keeper = enemy(garden, 'keeper', 1, 7, { hp: 650 });
  step(garden);
  assert.equal(enemyPose(mender, garden).clip, 'heal');
  assert.equal(keeper.hp, 650);
  assert.equal(enemyPose(keeper, garden).clip, 'phase');
  assert.equal(garden.keeperSignal.lane, 1);
  step(garden, 8);
  assert.equal(enemyPose(porter, garden).clip, 'brace');
  step(garden, 28);
  assert.equal(enemyPose(keeper, garden).clip, 'signal');
  keeper.hp = 0;
  step(garden);
  assert.equal(garden.keeperSignal, undefined);
  assert.equal(garden.fallen.filter((record) => record.id === 'keeper').length, 1);
});

test('higher pose ages use different atlas columns while reduced motion uses the declared key frame', () => {
  for (const { clips } of Object.values(atlas.units)) for (const clip of Object.values(clips)) {
    assert.equal(frameOf(clip, 0, false), 0);
    assert.equal(frameOf(clip, clip.durationTicks - 1, false), clip.frameCount - 1);
    assert.equal(frameOf(clip, clip.durationTicks * 4, true), clip.reducedFrame);
    assert.equal(frameOf(clip, clip.durationTicks, false), clip.loop ? 0 : clip.frameCount - 1);
  }
});

test('a bite loads away from the plant and snaps forward on the same tick as damage', () => {
  const garden = new Garden(campaign['lightning-dome']);
  const plant = put(garden, 'moss', 0, 4);
  const walker = enemy(garden, 'walker', 0, plant.x + .46);
  finish(garden, garden.prep);
  while (!walker.biteWindup && garden.now < garden.prep + 30) step(garden);
  assert.ok(walker.biteWindup);
  const beforeHit = walker.biteWindup.fires - 1;
  finish(garden, beforeHit);
  assert.ok(bodyMotion('walker', enemyPose(walker, garden)).lean > .20);
  assert.equal(plant.hp, plant.card.hp);
  assert.ok(!garden.effects.some(({ kind }) => kind === 'bite'));
  step(garden);
  assert.ok(bodyMotion('walker', enemyPose(walker, garden)).lean < -.50);
  assert.equal(plant.hp, plant.card.hp - walker.spec.biteDamage);
  assert.deepEqual(garden.effects.find(({ kind }) => kind === 'bite')?.targets, [plant.x]);
});

test('legacy bytes, settings and v1 values survive retro records and a rollback', () => {
  const legacyKey = 'midnight-greenhouse.progress.v1';
  const retroKey = 'midnight-greenhouse.retro.progress.v1';
  const legacy = '{ "version": 1, "raincourt": {"stars": 3, "fastest": 431}, "lightning-dome":{"stars":3,"fastest":20} }';
  const backing = new Map([[legacyKey, legacy], ['midnight-greenhouse.settings.v1', '{"version":1,"mute":true}']]);
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const priorMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => backing.get(key),
    setItem: (key, value) => backing.set(key, value),
  } });
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
  try {
    const save = new Save();
    assert.equal(save.settings.mute, true);
    assert.deepEqual(save.legacy('raincourt'), { stars: 3, fastest: 431 });
    assert.ok(save.unlocked('pump-gallery'));
    assert.ok(!save.unlocked('lightning-dome'));
    save.win('pump-gallery', 2, 288);
    save.win('pump-gallery', 3, 304);
    save.win('lightning-dome', 2, 320);
    assert.deepEqual(new Save().record('pump-gallery'), { stars: 3, fastest: 288 });
    assert.ok(new Save().unlocked('lightning-dome'));
    assert.equal(backing.get(legacyKey), legacy);
    backing.delete(retroKey);
    assert.ok(!new Save().unlocked('lightning-dome'));
  } finally {
    if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage);
    else delete globalThis.localStorage;
    if (priorMedia) Object.defineProperty(globalThis, 'matchMedia', priorMedia);
    else delete globalThis.matchMedia;
  }
});

const routes = JSON.parse(readFileSync(new URL('./retro-routes.json', import.meta.url)));
function playRoute(name, lastAction = Infinity) {
  const stage = name.startsWith('raincourt-') ? 'raincourt' : name;
  const garden = new Garden(campaign[stage]);
  const commands = new Map(routes[name].filter(([second]) => second <= lastAction)
    .map(([second, card, lane, col]) => [ticks(second), card === 'water'
      ? { kind: 'water', lane } : { kind: 'plant', card, lane, col }]));
  let quiet = 0;
  let longestQuiet = 0;
  const locks = [];
  let bossDefeated = false;
  let cleanup = false;
  while (!garden.result && garden.now < ticks(440)) {
    const command = commands.get(garden.now);
    if (command) {
      assert.equal(garden.check(command), '', JSON.stringify(command));
      garden.queue(command);
    }
    garden.step();
    if (!garden.enemies.length && garden.now >= garden.spawns[0].at && garden.now <= garden.spawns.at(-1).at
      && (!garden.nextThreat || garden.nextThreat.at - garden.now > ticks(6))) {
      quiet++;
      longestQuiet = Math.max(quiet, longestQuiet);
    } else quiet = 0;
    for (const effect of garden.effects.filter(({ at }) => at === garden.now)) {
      if (effect.kind === 'keeper-down') bossDefeated = true;
      if (effect.kind === 'valve-lock' && garden.keeper) locks.push({ phase: garden.keeperPhase,
        lane: effect.lane, wet: garden.wet });
    }
    if (bossDefeated && garden.enemies.length > 0 && !garden.keeper) cleanup = true;
  }
  return { garden, locks, cleanup, longestQuiet };
}
for (const name of Object.keys(routes)) {
  test(`approved pacing and late pressure across route ${name}`, () => {
    const { garden, locks, cleanup, longestQuiet } = playRoute(name);
    assert.equal(garden.result, 'victory');
    assert.ok(garden.core >= 2);
    assert.ok(longestQuiet <= ticks(10));
    assert.ok(garden.spawns.every((spawn, index) => index === 0 || spawn.at - garden.spawns[index - 1].at <= ticks(18)));
    const elapsed = (garden.now - garden.prep) / 30;
    const [low, high] = name.startsWith('raincourt') ? [260, 340] : name === 'pump-gallery' ? [279, 365] : [310, 420];
    assert.ok(elapsed >= low && elapsed <= high, String(elapsed));
    if (name.startsWith('raincourt')) {
      assert.ok(garden.bestChain >= 2);
      const cut = playRoute(name, 105).garden;
      assert.equal(cut.bell, 0);
      assert.equal(cut.result, 'defeat');
    }
    if (name === 'lightning-dome') {
      assert.ok(locks.some(({ phase, wet, lane }) => phase === 1 && wet !== null && wet !== lane));
      assert.ok(locks.some(({ phase, wet }) => phase === 2 && wet === null));
      assert.ok(cleanup);
    }
  });
}
