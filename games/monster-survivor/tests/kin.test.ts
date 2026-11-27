import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignStages, stages } from '../src/campaign-content.ts';
import { CampaignRecords, campaignKey } from '../src/campaign-save.ts';
import { KinRecords, kinKey, tiers } from '../src/kin-save.ts';
import { stageForTier } from '../src/kin-difficulty.ts';

function storage() {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } as Storage;
}

function records() {
  const disk = storage();
  const cleared = stages.map(stage => stage.id);
  disk.setItem(campaignKey, JSON.stringify({ schemaVersion: 1, cleared, wallet: 17,
    equipment: { weapon: 'ember-lantern' }, ranks: { 'ember-lantern': 3 },
    bestMs: Object.fromEntries(cleared.map(id => [id, 300000])), settled: [] }));
  return { disk, campaign: new CampaignRecords(() => disk), kin: new KinRecords(() => disk) };
}

test('all eight maps have separate pressure and timer headroom on each advanced tier', () => {
  assert.equal(campaignStages.length, 8);
  for (const stage of campaignStages) {
    const variants = tiers.map(tier => stageForTier(stage, tier));
    assert.equal(variants[0], stage);
    const waves = variants.map(variant => variant.sweeps.flatMap(sweep => sweep.encounters.flatMap(group => group.waves)));
    assert.equal(waves[1].length, waves[0].length + 1);
    assert.equal(waves[2].length, waves[1].length + 1);
    assert.ok(variants[2].safetyTimeout > variants[1].safetyTimeout && variants[1].safetyTimeout > stage.safetyTimeout);
  }
});

test('historical clear unlocks the expansion, tier rewards settle once and care survives reload', () => {
  const { disk, campaign, kin } = records();
  const prior = disk.getItem(campaignKey);
  const settle = (id: string, stage: string, tier = 'normal' as const, rescued = false) => kin.settle(campaign, {
    id, stage, tier, exited: true, elapsedMs: 250000, treats: 0, rescued,
  });
  assert.ok(kin.adoptFox(campaign));
  assert.ok(!kin.adoptFox(campaign));
  assert.ok(kin.unlocked('mistwood', 'normal', campaign));
  assert.ok(!kin.unlocked('ash-mine', 'normal', campaign));
  assert.equal(settle('a', 'mistwood')?.pet, 'moon-owl');
  assert.equal(settle('a', 'mistwood'), undefined);
  assert.ok(kin.feed('ember-fox', 1));
  assert.ok(!kin.feed('ember-fox', 1));
  assert.ok(kin.equipPet('ember-fox'));
  assert.ok(kin.unlocked('ash-mine', 'normal', campaign));
  assert.equal(settle('b', 'ash-mine')?.pet, undefined);
  assert.equal(settle('c', 'ash-mine', 'normal', true)?.pet, 'moss-turtle');
  assert.equal(settle('d', 'eclipse-temple')?.completed, true);
  const attempt = { id: 'e', stage: 'bell-orchard', tier: 'elite' as const, exited: true, elapsedMs: 200000, treats: 0, rescued: false };
  const second = new KinRecords(() => disk);
  assert.equal(kin.settle(campaign, attempt)?.shards, 3);
  assert.equal(second.settle(campaign, attempt), undefined);
  assert.ok(second.engrave(campaign, 'cinder-chain'));
  assert.ok(kin.engrave(campaign, 'cinder-chain'));
  assert.equal(kin.data.shards, 0);
  assert.deepEqual(kin.loadout(campaign), { pet: 'ember-fox', bond: 2, engraving: 'cinder-chain' });
  assert.equal(disk.getItem(campaignKey), prior);
});

test('future and corrupt expansion saves remain intact while session progress remains possible', () => {
  for (const raw of ['{"schemaVersion":2}', '{']) {
    const { disk, campaign } = records();
    disk.setItem(kinKey, raw);
    const kin = new KinRecords(() => disk);
    assert.ok(kin.status);
    assert.ok(kin.adoptFox(campaign));
    assert.equal(disk.getItem(kinKey), raw);
    assert.equal(kin.data.bonds['ember-fox'], 1);
  }
  const { campaign } = records();
  const kin = new KinRecords(() => { throw new Error('storage denied'); });
  assert.ok(kin.status);
  assert.ok(kin.adoptFox(campaign));
});

import { CampaignRun } from '../src/campaign.ts';
import { gear, statsFor } from '../src/campaign-content.ts';
import type { Engraving, KinLoadout, Tier } from '../src/kin-save.ts';
import { ticks } from '../src/sim.ts';
import type { Foe, Point } from '../src/sim.ts';
import { drive } from './kin-route.mjs';

const empty = { x: 0, y: 0, dash: false };

class Combat extends CampaignRun {
  constructor(kit: KinLoadout) {
    super(campaignStages[5], 3, statsFor(), undefined, 0, new Set(), 'normal', kit);
    Object.assign(this.player, { x: 280, y: 860 });
    this.build.clear();
  }
  protected override direct() {}
  protected override foeAction() { return true; }
  add(id = 'seedling', hp = 150, x = 350, y = 860) {
    const foe = this.spawn(id, hp, { x, y })!;
    foe.state = 'idle';
    return foe;
  }
  directHit(foe: Foe, damage: number, angle?: number) {
    return this.hit(foe, damage, 'wick-dart', foe, angle, 'direct');
  }
  splash(radius: number, damage: number) { return this.dartSplash(radius, damage); }
  incoming(amount: number) { this.hurt(amount); }
}

const setup = (engraving: Engraving) => new Combat({ engraving });

test('six engravings resolve their own eligible hits, limits, locations and defense order', () => {
  const chain = setup('cinder-chain');
  const direct = chain.add('seedling', 15);
  const secondary = chain.add('seedling', 9, 375);
  const outside = chain.add('seedling', 90, 410);
  chain.step(empty);
  chain.directHit(direct, 30);
  assert.ok(secondary.hp <= 0);
  assert.equal(outside.hp, 90);
  assert.equal(chain.engravingAt, chain.tick + ticks(.6));
  assert.equal(secondary.lastHit, 'engraving');

  const brand = setup('searing-brand');
  const marked = brand.add();
  assert.equal(brand.directHit(marked, 50), 50);
  assert.equal(brand.directHit(marked, 50), 58);
  const replacement = brand.add();
  assert.equal(brand.directHit(replacement, 50), 50);
  assert.equal(brand.directHit(marked, 10), 10);

  const ricochet = setup('ricochet');
  const first = ricochet.add();
  const second = ricochet.add('seedling', 100, 418);
  const third = ricochet.add('seedling', 100, 425, 880);
  ricochet.step(empty);
  ricochet.directHit(first, 40);
  ricochet.directHit(first, 40);
  assert.equal(second.hp, 86);
  assert.equal(third.hp, 100);
  assert.equal(ricochet.engravingAt, ricochet.tick + ticks(.45));

  const refraction = setup('refraction');
  assert.deepEqual(refraction.splash(44, 20), { radius: 44, damage: 20 });
  refraction.build.set('wick-dart', 2);
  assert.deepEqual(refraction.splash(44, 20), { radius: 62, damage: 22 });

  const echo = setup('aftertoll');
  const echoed = echo.add('seedling', 1000, 300);
  echo.charge = gear.combat.lanternBurst.chargeMax;
  const origin: Point = { ...echo.player };
  echo.step({ ...empty, burst: true });
  assert.ok(echoed.hp < 1000);
  const afterBurst = echoed.hp;
  echo.player.y += 148;
  for (let i = 0; i < ticks(.45); i++) echo.step(empty);
  assert.ok(echoed.hp < afterBurst);
  assert.deepEqual(echo.kinCue?.from, origin);
  assert.equal(echo.charge, 0);

  const shelter = setup('shelter-bell');
  shelter.add('seedling', 1000);
  shelter.charge = gear.combat.lanternBurst.chargeMax;
  shelter.step({ ...empty, burst: true });
  assert.equal(shelter.wardGuard, 12);
  const before = shelter.player.hp;
  shelter.incoming(12);
  assert.equal(shelter.player.hp, before);
  assert.ok(shelter.wardGuard < 12);
  assert.equal(shelter.charge, 0);
});

test('companion effects use simulation time and a guard waits for a real hit', () => {
  const fox = new Combat({ pet: 'ember-fox', bond: 3, engraving: 'cinder-chain' });
  const target = fox.add('seedling', 20);
  const beside = fox.add('seedling', 100, 350, 907);
  const charge = fox.charge;
  for (let i = 0; i < ticks(5); i++) fox.step(empty);
  assert.equal(target.lastHit, 'pet');
  assert.equal(beside.hp, 100);
  assert.equal(fox.charge, charge);
  assert.equal(fox.damage.has('cinder-chain'), false);

  const owl = new Combat({ pet: 'moon-owl', bond: 3 });
  owl.add();
  const elite = owl.add('thornback', 500, 435);
  for (let i = 0; i < ticks(7); i++) owl.step(empty);
  assert.deepEqual(owl.owlMark, { id: elite.id, until: owl.tick + ticks(4) });
  assert.equal(owl.directHit(elite, 100), 115);

  const turtle = new Combat({ pet: 'moss-turtle', bond: 3 });
  turtle.dashUntil = 1;
  turtle.incoming(65);
  assert.equal(turtle.petAt, 0);
  turtle.step(empty);
  turtle.incoming(65);
  assert.equal(turtle.petAt, turtle.tick + ticks(12));
  assert.equal(turtle.player.hp, turtle.player.maxHp - (Math.round(65 * .82) - 30));
});

test('new maps can be completed with base gear; advanced tiers produce distinct pressure and both mine guard orders are valid', () => {
  for (const [order, tier] of [[1, 'elite'], [1, 'nightmare'], [6, 'normal'], [7, 'normal'], [8, 'normal'], [8, 'nightmare']] as [number, Tier][]) {
    const run = new CampaignRun(campaignStages[order - 1], 1807, statsFor(), undefined, 0, new Set(), tier);
    const result = drive(run, undefined, run.sites[0]);
    assert.equal(result.result, 'victory', [order, tier, result.seconds].join(' '));
    if (order === 8) assert.deepEqual(result.phases, [1, 2, 3]);
    if (order === 7) assert.equal(run.rescued, true);
  }
  const run = new CampaignRun(campaignStages[6], 1807, statsFor(), undefined, 0, new Set());
  Object.assign(run.player, { x: 790, y: 910 });
  const southFirst = drive(run, undefined, run.sites[1]);
  assert.equal(southFirst.result, 'victory');
  assert.deepEqual(southFirst.encounters.slice(0, 2), ['south-foundry', 'north-foundry']);
  assert.equal(run.treats, 2);
  assert.equal(run.rescued, false);
});

import { burrow, mend } from '../src/kin-enemies.ts';
import { vietnamese } from '../src/locale-vi.ts';
import { enemies, garden, skills } from '../src/content.ts';
import { items } from '../src/campaign-content.ts';

test('the tactical counters use a real shield arc, heal tell and targetable emergence', () => {
  const beetle = new Combat({});
  const target = beetle.add('bulwark-beetle');
  target.angle = Math.PI;
  assert.equal(beetle.directHit(target, 20, 0), 9);
  assert.equal(beetle.directHit(target, 20, Math.PI), 20);
  target.state = 'recover';
  assert.equal(beetle.directHit(target, 20, 0), 20);

  class Tactics extends CampaignRun {
    constructor() { super(campaignStages[5], 2, statsFor(), undefined, 0, new Set()); this.build.clear(); }
    protected override direct() {}
    add(id: string, x: number, y: number) { return this.spawn(id, undefined, { x, y })!; }
  }

  const heal = new Tactics();
  const shaman = heal.add('moth-shaman', 315, 900);
  const wounded = heal.add('seedling', 280, 900);
  wounded.hp -= 18;
  const original = wounded.hp;
  heal.step(empty);
  assert.equal(heal.mendLinks.get(shaman.id)?.target, wounded.id);
  assert.equal(heal.mendLinks.get(shaman.id)?.due, heal.tick + ticks(mend.tell));
  for (let i = 0; i < ticks(mend.tell); i++) heal.step(empty);
  assert.equal(wounded.hp, original + mend.amount);

  const tunneling = new Tactics();
  const b = tunneling.add('ash-burrower', 380, 900);
  tunneling.step(empty);
  assert.ok(b.hidden);
  const spot = tunneling.burrows.get(b.id);
  assert.equal(spot?.due, tunneling.tick + ticks(burrow.tell));
  const initialHealth = tunneling.player.hp;
  for (let i = 0; i < ticks(burrow.tell); i++) tunneling.step({ ...empty, y: 1, dash: i === 0 });
  assert.equal(b.hidden, false);
  assert.equal(tunneling.player.hp, initialHealth);
});

test('locale templates preserve every substitution and authored content has Vietnamese equivalents', () => {
  const placeholders = (value: string) => [...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
  for (const [key, value] of Object.entries(vietnamese)) assert.deepEqual(placeholders(value), placeholders(key), key);
  const named = [
    ...campaignStages.flatMap(stage => [stage.name, stage.look, ...stage.sweeps.flatMap(phase =>
      [phase.label, ...phase.encounters.map(encounter => encounter.label)])]),
    ...[...items.values()].flatMap(item => [item.name, item.effect]),
    ...[...enemies.values()].flatMap(foe => [foe.name, foe.cue]),
    ...[...skills.values()].flatMap(skill => [skill.name, skill.behavior, skill.synergy]),
    ...garden.wards.map(ward => ward.name),
  ];
  for (const key of named) assert.ok(Object.hasOwn(vietnamese, key), key);
});
