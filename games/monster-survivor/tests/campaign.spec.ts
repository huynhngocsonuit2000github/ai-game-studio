import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { CampaignRun } from '../src/campaign.ts';
import { items, stages } from '../src/campaign-content.ts';
import { CampaignRecords, campaignKey } from '../src/campaign-save.ts';
import { choose, steer } from './campaign-route.mjs';
import { writeFileSync } from 'node:fs';

const url = '/ai-game-studio/games/monster-survivor/';
const seed = 1807;
const oldKey = 'ai-game-studio:monster-survivor:v1';
const oldSave = JSON.stringify({
  schemaVersion: 1, settings: { master: .31, mute: true },
  lifetime: { runs: 2, wins: 1, bestClearMs: 243783, longestMs: 243783, recordKills: 434 },
  discoveredSkillIds: ['wick-dart', 'comet-thread'], cosmetics: { unlocked: ['dawn-scarf'], selected: 'dawn-scarf' }, runIds: ['s03'],
});
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });

async function installClock(page: Page, lowDetail = false, selectedSeed = seed) {
  await page.addInitScript(({ seed, oldKey, oldSave, lowDetail }) => {
    let callback: FrameRequestCallback;
    let now = 0;
    const realFrame = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = next => { callback = next; return 1; };
    Object.assign(window, {
      gameTestFrames: async (input: { x: number; y: number; dash: boolean; burst?: boolean; interact?: boolean }, ticks: number, paced = false) => {
        const event = (type: string, code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
        const arrows = [['ArrowLeft', input.x < 0], ['ArrowRight', input.x > 0], ['ArrowUp', input.y < 0], ['ArrowDown', input.y > 0]];
        for (const [code, held] of arrows) event(held ? 'keydown' : 'keyup', String(code));
        if (input.dash) event('keydown', 'Space');
        if (input.burst) event('keydown', 'KeyQ');
        if (input.interact) event('keydown', 'KeyE');
        const time: number[] = [];
        for (let i = 0; i < ticks;) {
          const step = Math.min(paced ? 1 : 3, ticks - i);
          if (paced) time.push(await new Promise<number>(resolve => realFrame(resolve)));
          now += step * 1000 / 60;
          callback(now);
          i += step;
        }
        return time;
      },
    });
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = seed; return array; }
      return original(array);
    };
    if (!localStorage.getItem(oldKey)) {
      const legacy = JSON.parse(oldSave);
      if (lowDetail) legacy.settings.lowDetail = true;
      localStorage.setItem(oldKey, JSON.stringify(legacy));
    }
  }, { seed: selectedSeed, oldKey, oldSave, lowDetail });
}

const empty = { x: 0, y: 0, dash: false };
type Action = ReturnType<typeof steer>;
async function advance(page: Page, input: Action, count: number, paced = false) {
  return page.evaluate(({ input, count, paced }) => {
    return (window as unknown as { gameTestFrames: (action: Action, frames: number, paced: boolean) => Promise<number[]> })
      .gameTestFrames(input, count, paced);
  }, { input, count, paced });
}

async function frame(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(name + '.png'), animations: 'disabled' });
}

async function campAction(page: Page, slot: string, id: string, upgrade = false) {
  const item = items.get(id)!;
  await button(page, 'Armory').click();
  await page.locator(`[data-action="slot-${slot}"]`).click();
  await page.locator(`[data-action="item-${id}"]`).click();
  if (upgrade) {
    await button(page, /^Forge \+[1-3] · /).click();
    await button(page, 'Confirm upgrade').click();
  } else if (await button(page, 'Equip ' + item.name).count()) await button(page, 'Equip ' + item.name).click();
  await button(page, 'Back to stages').click();
}

function model(raw: string | null, selectedSeed = seed) {
  const records = new CampaignRecords(() => ({ getItem: () => raw }) as unknown as Storage);
  return (stage: typeof stages[number]) => {
    const weapon = records.data.equipment.weapon;
    return new CampaignRun(stage, selectedSeed, records.stats, weapon, weapon ? records.data.ranks[weapon] : 0,
      new Set(Object.keys(records.data.ranks)));
  };
}

test('clears all five Campaign stages through the assembled game and reloads the upgraded kit', async ({ page }, info) => {
  const paceOrchard = process.env.MSCP_PACED === '1';
  test.setTimeout(paceOrchard ? 540_000 : 250_000);
  const faults: string[] = [];
  page.on('pageerror', error => faults.push(error.message));
  page.on('response', response => { if (response.status() >= 400) faults.push(response.status() + ' ' + response.url()); });
  await installClock(page);
  await page.goto(url);
  await expect(button(page, 'Campaign')).toBeFocused();
  const original = await page.evaluate(key => localStorage.getItem(key), oldKey);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Lantern Camp' })).toBeVisible();
  await expect(page.locator('.stage-choice:disabled')).toHaveCount(4);
  const summaries = [];
  const beforeSeconds = [42.6167, 48.4167, 39.0167, 53.0167, 103.4167];
  for (const stage of stages) {
    const run = model(await page.evaluate(key => localStorage.getItem(key), campaignKey))(stage);
    await button(page, 'Enter ' + stage.name).click();
    await expect(page.locator('#run-chapter')).toContainText(stage.name);
    if (stage.order === 2) {
      expect(run.weaponRank).toBe(1);
      expect(run.kit.flatMainDamage).toBe(7);
      expect(run.kit.maxHpAdd).toBe(14);
      await expect(page.locator('#health')).toHaveText('114 / 114 HP');
    }
    const marks = new Set<string>();
    const phases = new Set<number>();
    const seen = new Set<string>();
    let firstDraft: number | undefined;
    let peakFoes = 0;
    let bossBurstAt = 0;
    let crowd = 0;
    const beginWall = performance.now();
    const encounters = new Set<string>();
    let next = steer(run);
    while (!run.result) {
      if (run.offer) {
        firstDraft ??= run.elapsed;
        await expect(page.getByRole('heading', { name: run.offer.kind === 'evolution' ? 'Evolve your lantern' : 'Choose an upgrade' }))
          .toBeVisible({ timeout: 2500 });
        const choice = choose(run);
        if (stage.order === 1 && !marks.has('first-draft')) {
          marks.add('first-draft');
          await frame(page, info, '02-first-draft');
          expect(run.offer.cards).toContain('wick-dart');
          expect(run.offer.cards.some(card => card !== 'wick-dart' && (run.build.get(card) ?? 0) === 0)).toBe(true);
        }
        await page.waitForTimeout(150);
        await page.keyboard.press(String(run.offer.cards.indexOf(choice) + 1));
        run.choose(choice);
        next = steer(run);
        continue;
      }
      const batch = { ...next };
      let count = 0;
      const record = (key: string, name: string) => {
        if (marks.has(key)) return undefined;
        marks.add(key);
        return name;
      };
      let shot: string | undefined;
      do {
        run.step(next);
        next = { ...next, dash: false, burst: false, interact: false };
        count++;
        const effects = run.spellEffects;
        peakFoes = Math.max(peakFoes, run.foes.length);
        crowd += run.foes.length;
        for (const group of run.activeGroups) if (group.state === 'active') encounters.add(group.key);
        if (run.wardenGuards.size) marks.add('warden-guards');
        if (run.boss) phases.add(run.boss.phase);
        for (const effect of effects) seen.add(effect.spell + '/' + effect.kind);
        if (stage.order === 1) {
          if (effects.some(effect => effect.spell === 'wick-dart' && effect.kind === 'cast') && run.build.get('wick-dart') === 1) shot = record('starter', '01-starter-dart');
          if (effects.some(effect => effect.spell === 'wick-dart' && effect.kind === 'ring')) shot ??= record('splash', '03-rank-ii-splash');
          if (run.drops.some(drop => drop.kind === 'gear') && run.chests.some(chest => chest.open)) shot ??= record('loot', '04-orchard-loot');
        }
        if (stage.order === 2 && effects.some(effect => effect.spell === 'wick-dart' && effect.kind === 'hit')) {
          shot ??= record('upgraded', '06-ember-lantern-volley');
        }
        if (stage.order === 2 && run.venomLanes.length) shot ??= record('venom-lane', '06-marsh-venom-lane');
        if (stage.order === 3 && run.lantern && run.foes.length >= 18) shot ??= record('defense', '07-crypt-defense');
        if (stage.order === 4 && run.elite) shot ??= record('hunts', '08-thorn-gate-hunt');
        if (stage.order === 5 && run.boss?.state === 'windup') {
          shot ??= record('phase-' + run.boss.phase, '09-warden-phase-' + run.boss.phase);
          if (!bossBurstAt && effects.some(effect => effect.spell === 'lantern-burst' && effect.kind === 'ring')) {
            bossBurstAt = run.tick;
            shot ??= record('burst', '10-burst-vs-warden-01-ignition');
          }
        }
        if (bossBurstAt) {
          const age = run.tick - bossBurstAt;
          if (age === 10) shot ??= '10-burst-vs-warden-02-wave';
          if (age === 70) shot ??= '10-burst-vs-warden-03-recovery';
          if (age === 190) shot ??= '10-burst-vs-warden-04-aftermath';
        }
        run.clearSpellEffects();
        run.cues.length = 0;
      } while (run.tick % 12 && !run.offer && !run.result && !shot);
      await advance(page, batch, count, paceOrchard && stage.order === 1);
      if (shot) await frame(page, info, shot);
      if (run.tick % 12 === 0 && !run.result && !run.offer) next = steer(run);
    }
    const ending = stage.order === 5 ? 'Campaign complete' : stage.name + ' cleared';
    expect(run.result, stage.name).toBe('victory');
    await expect(page.getByRole('heading', { name: ending })).toBeVisible();
    const savedRaw = await page.evaluate(key => localStorage.getItem(key), campaignKey);
    const saved = JSON.parse(savedRaw!);
    expect(saved.cleared).toEqual(stages.slice(0, stage.order).map(cleared => cleared.id));
    expect(saved.bestMs[stage.id]).toBe(Math.round(run.elapsed * 1000));
    expect(saved.settled).toHaveLength(stage.order);
    expect(saved.settled.at(-1)).toMatch(/^[a-f0-9-]{36}$/);
    expect(await page.evaluate(key => localStorage.getItem(key), oldKey)).toBe(original);
    if (stage.order === 5) {
      expect([...phases]).toEqual([1, 2, 3]);
      await frame(page, info, '11-campaign-complete');
    }
    const before = beforeSeconds[stage.order - 1];
    const ratio = run.elapsed / before;
    expect(ratio, stage.name + ' pacing ratio').toBeGreaterThanOrEqual(2.7);
    expect(ratio, stage.name + ' pacing ratio').toBeLessThanOrEqual(3.3);
    summaries.push({ stage: stage.id, baseline: before, duration: run.elapsed, ratio, firstDraft, peakFoes,
      averageFoes: crowd / run.tick, damageTaken: [...run.damageTakenBy.values()].reduce((sum, amount) => sum + amount, 0),
      kills: run.kills, gold: run.pending.gold, wallet: saved.wallet, hp: run.player.hp, loadout: run.kit,
      weapon: run.weapon ?? 'wick-lantern', rank: run.weaponRank, encounters: [...encounters], phases: [...phases],
      effects: [...seen], marks: [...marks], wallSec: (performance.now() - beginWall) / 1000, paced: paceOrchard && stage.order === 1 });
    await button(page, 'Continue').click();
    if (stage.order === 1) {
      expect(saved.wallet).toBeGreaterThanOrEqual(35);
      await campAction(page, 'weapon', 'ember-lantern', true);
      await campAction(page, 'weapon', 'ember-lantern');
      await campAction(page, 'armor', 'patchcoat');
      await campAction(page, 'charm', 'amber-charm');
      await button(page, 'Armory').click();
      await page.locator('[data-action="slot-weapon"]').click();
      await frame(page, info, '05-camp-ember-lantern');
      await page.reload();
      await button(page, 'Campaign').click();
      await expect(button(page, 'Enter Venom Marsh')).toBeVisible();
      const reloaded = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), campaignKey);
      expect(reloaded.ranks['ember-lantern']).toBe(1);
      expect(reloaded.equipment.weapon).toBe('ember-lantern');
      expect(reloaded.wallet).toBe(saved.wallet - 35);
    }
    if (stage.order === 2) await campAction(page, 'boots', 'marsh-boots');
    if (stage.order === 3) {
      await campAction(page, 'charm', 'bell-charm');
      await campAction(page, 'armor', 'patchcoat', true);
      await campAction(page, 'armor', 'patchcoat', true);
      await campAction(page, 'weapon', 'ember-lantern', true);
    }
  }
  await expect(page.locator('.stage-choice:disabled')).toHaveCount(0);
  await page.locator('[data-action="stage-bell-orchard"]').click();
  await button(page, 'Enter Bell Orchard').click();
  await advance(page, empty, 12);
  await expect(page.locator('#run-chapter')).toContainText('Bell Orchard');
  await page.keyboard.press('Escape');
  await button(page, 'Quit').click();
  await expect(page.getByText(/unbanked gold and gear/)).toBeVisible();
  await button(page, 'Quit').click();
  await expect(page.getByRole('heading', { name: 'Lantern Camp' })).toBeVisible();
  expect(faults).toEqual([]);
  writeFileSync(info.outputPath('campaign-gameplay.json'), JSON.stringify(summaries, null, 2) + '\n');
});

test('matches a dense Prism encounter across normal and Low Detail and measures frame intervals', async ({ browser }, info) => {
  test.setTimeout(100_000);
  const stage = stages[4];
  const denseSeed = 1271;
  const fixture = {
    schemaVersion: 1, wallet: 0, ranks: { 'prism-lantern': 2, patchcoat: 2, 'bell-charm': 1 },
    equipment: { weapon: 'prism-lantern', armor: 'patchcoat', charm: 'bell-charm' },
    cleared: stages.slice(0, 4).map(entry => entry.id),
    bestMs: Object.fromEntries(stages.slice(0, 4).map(entry => [entry.id, 150000])), settled: [],
  };
  const report = [];
  for (const low of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
    await installClock(page, low, denseSeed);
    const initial = JSON.stringify(fixture);
    await page.addInitScript(({ key, initial }) => localStorage.setItem(key, initial), { key: campaignKey, initial });
    await page.goto(url);
    await button(page, 'Campaign').click();
    await button(page, 'Enter Hollow Belltower').click();
    const run = model(initial, denseSeed)(stage);
    let input = steer(run);
    let stressStart = 0;
    let peak = 0;
    const intervals: number[] = [];
    const label = low ? 'low-detail' : 'normal-detail';
    const loopStart = Date.now();
    let firstReadyAt = 0;
    let measured = 0;
    let maximumBolts = 0;
    let windowPeak = 0;
    const dimensions: number[] = [];
    for (;;) {
      if (run.offer) {
        await expect(page.locator('.card').first()).toBeVisible();
        const priority = ['wick-dart', 'prism-ring', 'lantern-oil', 'mirror-ward', 'hex-bell'];
        if ((run.build.get('wick-dart') ?? 0) >= 2) priority.push(priority.shift()!);
        const card = priority.find(id => run.offer!.cards.includes(id)) ?? choose(run);
        if (!firstReadyAt) firstReadyAt = run.tick;
        await page.waitForTimeout(150);
        await page.keyboard.press(String(run.offer.cards.indexOf(card) + 1));
        run.choose(card);
        input = steer(run);
        continue;
      }
      const batch = { ...input };
      let count = 0;
      let still = '';
      do {
        run.step(input);
        input = { ...input, dash: false, burst: false, interact: false };
        count++;
        if (!stressStart && run.foes.length >= 22 && run.build.has('prism-ring') &&
            run.spellEffects.some(effect => effect.spell === 'wick-dart' && effect.kind === 'ring') && !run.offer) {
          stressStart = run.tick;
          still = '01-prism-dense';
        }
        peak = Math.max(peak, run.foes.length);
        if (stressStart) windowPeak = Math.max(windowPeak, run.foes.length);
        maximumBolts = Math.max(maximumBolts, run.bolts.length);
        if (stressStart && [70, 145, 230].includes(run.tick - stressStart)) still = String(run.tick - stressStart) + '-prism-dense';
        run.cues.length = 0;
        run.clearSpellEffects();
      } while (run.tick % 12 && !run.offer && !run.result && !still);
      const pace = Boolean(stressStart);
      const spacing = await advance(page, batch, count, pace);
      if (pace) {
        measured += spacing.length;
        for (let i = 1; i < spacing.length; i++) intervals.push(spacing[i] - spacing[i - 1]);
      }
      if (still) await frame(page, info, label + '-' + still);
      if (stressStart && run.tick >= stressStart + 240) break;
      if (run.tick % 12 === 0) input = steer(run);
      expect(run.tick, 'dense encounter must occur in representative early play').toBeLessThan(60 * 130);
      expect(run.result).toBeNull();
    }
    const combat = await page.locator('#hud').innerText();
    dimensions.push(...await page.locator('canvas').evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      return [canvas.width, canvas.height];
    }));
    intervals.sort((a, b) => a - b);
    report.push({ detail: label, stressStart, peak, windowPeak, maximumBolts, firstReadyAt, measuredFrames: measured,
      wallMs: Date.now() - loopStart, canvas: dimensions,
      medianFps: 1000 / intervals[Math.floor(intervals.length * .5)],
      p95Ms: intervals[Math.floor(intervals.length * .95)],
      snapshot: { hp: run.player.hp, kills: run.kills, damage: [...run.damage], combat } });
    await page.close();
  }
  expect(report[0].snapshot).toEqual(report[1].snapshot);
  expect(report[0].canvas).toEqual([1440, 810]);
  expect(report[1].canvas).toEqual([1200, 675]);
  writeFileSync(info.outputPath('matched-prism-frame-timing.json'), JSON.stringify(report, null, 2) + '\n');
});

test('touch layout exposes the joystick, chest, Burst, and camp transactions', async ({ browser }, info) => {
  test.setTimeout(120_000);
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await installClock(page);
  await page.goto(url);
  await button(page, 'Campaign').tap();
  await button(page, 'Enter Bell Orchard').tap();
  const run = model(null)(stages[0]);
  const stick = page.locator('#stick');
  await expect(stick).toBeVisible();
  const rect = (await stick.boundingBox())!;
  const input = await page.context().newCDPSession(page);
  const x = rect.x + rect.width / 2 + 40;
  const y = rect.y + rect.height / 2;
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await expect(stick.locator('i')).toHaveAttribute('style', /translate\(30px/);
  await advance(page, empty, 9);
  for (let i = 0; i < 9; i++) run.step({ ...empty, x: 1 });
  await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(stick.locator('i')).not.toHaveAttribute('style', /translate/);
  let next = empty as Action;
  let chest = false;
  let burst = false;
  while (!run.result) {
    if (run.offer) {
      const card = choose(run);
      await page.waitForTimeout(150);
      await page.locator('[data-card="' + run.offer.cards.indexOf(card) + '"]').tap();
      run.choose(card);
      next = steer(run);
      continue;
    }
    if (run.tick % 12 === 0) next = steer(run);
    const budget = 12 - run.tick % 12;
    const batch = { ...next };
    if (batch.interact) {
      await button(page, run.canInteract).tap();
      if (!chest && run.canInteract === 'Open chest') {
        chest = true;
        await frame(page, info, 'mobile-01-chest-action');
      }
    }
    if (batch.burst) {
      await button(page, 'Burst').tap();
      burst = true;
    }
    let count = 0;
    do {
      run.step(next);
      next = { ...next, dash: false, burst: false, interact: false };
      run.cues.length = 0;
      run.clearSpellEffects();
      count++;
    } while (count < budget && !run.offer && !run.result);
    await advance(page, { ...batch, burst: false, interact: false }, count);
  }
  expect(chest && burst).toBe(true);
  expect(run.result).toBe('victory');
  await expect(page.getByRole('heading', { name: 'Bell Orchard cleared' })).toBeVisible();
  await button(page, 'Continue').tap();
  await button(page, 'Armory').tap();
  await page.locator('[data-action="item-ember-lantern"]').tap();
  await button(page, /^Forge \+[1-3] · /).tap();
  await button(page, 'Confirm upgrade').scrollIntoViewIfNeeded();
  await frame(page, info, 'mobile-02-forge-confirmation');
  await button(page, 'Confirm upgrade').tap();
  await expect(page.locator('.forge [role="status"]')).toContainText('upgraded to +1');
  await page.locator('[data-action="item-ember-lantern"]').tap();
  await button(page, 'Equip Ember Lantern').tap();
  await expect(page.locator('[data-action="item-ember-lantern"]')).toContainText('Equipped');
  await page.screenshot({ path: info.outputPath('mobile-03-armory-and-forge.png'), fullPage: true, animations: 'disabled' });
  await page.close();
});

test('Forge shows equipped, empty, insufficient, and maximum states and rejects stale or repeated confirmation', async ({ page }, info) => {
  const fixture = {
    schemaVersion: 1, wallet: 46, ranks: { 'ember-lantern': 0, 'prism-lantern': 2, 'warden-lantern': 3 },
    equipment: { weapon: 'ember-lantern' }, cleared: [], bestMs: {}, settled: [],
  };
  await page.addInitScript(({ key, fixture }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture)); },
    { key: campaignKey, fixture });
  await page.goto(url);
  await button(page, 'Campaign').click();
  await button(page, 'Armory').click();
  const forge = page.locator('.forge');
  const pictures = page.locator('.gear-card img');
  await expect(pictures).toHaveCount(4);
  for (const image of await pictures.all()) await image.evaluate(el => (el as HTMLImageElement).decode());
  const select = (id: string) => page.locator(`[data-action="item-${id}"]`).click();
  await select('ember-lantern');
  await expect(page.locator('[data-action="item-ember-lantern"]')).toContainText('Equipped');
  await expect(forge.locator('.forge-stats')).toContainText('+3 →+7');
  await button(page, 'Test shot').click();
  await expect(page.locator('.attack-demo')).toHaveAttribute('data-playing', 'true');
  await frame(page, info, 'forge-01-equipped-and-demo');
  await button(page, 'Forge +1 · 35 gold').click();
  await expect(page.getByRole('heading', { name: 'Confirm upgrade' })).toBeVisible();
  await frame(page, info, 'forge-02-confirmation');
  // Model a parallel tab completing the same quote before the first tab confirms.
  await page.evaluate(key => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.ranks['ember-lantern'] = 1;
    save.wallet = 11;
    localStorage.setItem(key, JSON.stringify(save));
  }, campaignKey);
  await button(page, 'Confirm upgrade').click();
  await expect(forge.getByRole('status')).toContainText('rank changed');
  await expect(page.locator('.camp-gold')).toContainText('11 gold');
  await select('prism-lantern');
  await expect(forge.getByText('Needs 119 more gold')).toBeVisible();
  await expect(button(page, 'Forge +3 · 130 gold')).toBeDisabled();
  await frame(page, info, 'forge-03-insufficient');
  await select('warden-lantern');
  await expect(forge.getByText('Maximum rank')).toBeVisible();
  await frame(page, info, 'forge-04-maximum');
  await page.locator('[data-action="slot-charm"]').click();
  await expect(page.getByRole('heading', { name: 'Empty charm slot' })).toBeVisible();
  await frame(page, info, 'forge-05-empty-charm');

  await page.evaluate(key => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.wallet = 100;
    localStorage.setItem(key, JSON.stringify(save));
  }, campaignKey);
  await page.locator('[data-action="slot-weapon"]').click();
  await select('ember-lantern');
  await button(page, 'Forge +2 · 75 gold').click();
  await button(page, 'Confirm upgrade').evaluate(element => {
    (element as HTMLButtonElement).click();
    (element as HTMLButtonElement).click();
  });
  await expect(forge.getByRole('status')).toContainText('upgraded to +2');
  await expect(forge).toHaveAttribute('data-forged', 'true');
  await page.screenshot({ path: info.outputPath('forge-06-strike-and-success.png'), animations: 'allow' });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), campaignKey);
  expect(saved.wallet).toBe(25);
  expect(saved.ranks['ember-lantern']).toBe(2);
  await page.reload();
  await button(page, 'Campaign').click();
  await button(page, 'Armory').click();
  await expect(forge.locator('[aria-current="step"]')).toHaveText('+2');
  await expect(page.locator('.camp-gold')).toContainText('25 gold');
});

test('clears Belltower with Warden Lantern +3 and captures a confirmed hit', async ({ page }, info) => {
  test.setTimeout(150_000);
  const stage = stages[4];
  const fixture = {
    schemaVersion: 1, wallet: 0,
    ranks: { 'warden-lantern': 3, patchcoat: 3, 'marsh-boots': 3, 'bell-charm': 3 },
    equipment: { weapon: 'warden-lantern', armor: 'patchcoat', boots: 'marsh-boots', charm: 'bell-charm' },
    cleared: stages.slice(0, 4).map(entry => entry.id), settled: [],
    bestMs: Object.fromEntries(stages.slice(0, 4).map(entry => [entry.id, 150000])),
  };
  await installClock(page);
  const initial = JSON.stringify(fixture);
  await page.addInitScript(({ key, initial }) => localStorage.setItem(key, initial), { key: campaignKey, initial });
  await page.goto(url);
  await button(page, 'Campaign').click();
  await button(page, 'Enter Hollow Belltower').click();
  const run = model(initial)(stage);
  let input = steer(run);
  let captured = false;
  const phases = new Set<number>();
  while (!run.result) {
    if (run.offer) {
      const card = choose(run);
      await expect(page.locator('.card').first()).toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(150);
      await page.keyboard.press(String(run.offer.cards.indexOf(card) + 1));
      run.choose(card);
      input = steer(run);
      continue;
    }
    const batch = { ...input };
    let count = 0;
    let hit = false;
    do {
      run.step(input);
      input = { ...input, dash: false, burst: false, interact: false };
      count++;
      if (run.boss) phases.add(run.boss.phase);
      hit ||= !captured && !run.offer && run.tick > 300 && run.spellEffects.some(effect => effect.kind === 'hit' &&
        (effect.spell === 'wick-dart' || effect.spell === 'comet-thread'));
      run.clearSpellEffects();
      run.cues.length = 0;
    } while (run.tick % 12 && !run.offer && !run.result && !hit);
    await advance(page, batch, count);
    if (hit) {
      await frame(page, info, 'warden-lantern-plus3-confirmed-hit');
      captured = true;
    }
    if (run.tick % 12 === 0) input = steer(run);
  }
  expect(captured).toBe(true);
  expect([...phases]).toEqual([1, 2, 3]);
  expect(run.result).toBe('victory');
  await expect(page.getByRole('heading', { name: 'Campaign complete' })).toBeVisible();
  writeFileSync(info.outputPath('warden-plus3.json'), JSON.stringify({
    duration: run.elapsed, kills: run.kills, damageTaken: [...run.damageTakenBy.values()].reduce((sum, amount) => sum + amount, 0),
    hp: run.player.hp, stats: run.kit, phases: [...phases],
  }, null, 2) + '\n');
});
