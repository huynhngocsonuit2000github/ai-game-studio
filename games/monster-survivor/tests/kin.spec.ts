import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { campaignStages, stages } from '../src/campaign-content.ts';
import { campaignKey } from '../src/campaign-save.ts';
import { kinKey } from '../src/kin-save.ts';
import type { KinLoadout, Tier } from '../src/kin-save.ts';
import type { Input } from '../src/sim.ts';
import type { Frame, plan } from './kin-browser-route.ts';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const url = '/ai-game-studio/games/monster-survivor/';
const seed = 1807;
const button = (page: Page, action: string) => page.locator(`[data-action="${action}"]`);
const cleared = stages.map(stage => stage.id);
const legacy = { schemaVersion: 1, wallet: 177, cleared, ranks: { 'ember-lantern': 3 },
  equipment: {}, bestMs: Object.fromEntries(cleared.map(id => [id, 300000])), settled: [] };

async function installClock(page: Page) {
  await page.addInitScript(({ seed, key, legacy }) => {
    let callback: FrameRequestCallback;
    let now = 0;
    window.requestAnimationFrame = frame => { callback = frame; return 1; };
    Object.assign(window, {
      kinTestFrames(frames: { input: Input; ticks: number }[]) {
        const event = (type: string, code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
        for (const { input, ticks } of frames) {
          for (const [code, held] of [['ArrowLeft', input.x < 0], ['ArrowRight', input.x > 0], ['ArrowUp', input.y < 0], ['ArrowDown', input.y > 0]]) {
            event(held ? 'keydown' : 'keyup', String(code));
          }
          if (input.dash) event('keydown', 'Space');
          if (input.burst) event('keydown', 'KeyQ');
          if (input.interact) event('keydown', 'KeyE');
          for (let i = 0; i < ticks;) {
            const step = Math.min(ticks - i, 5);
            now += step * 1000 / 60;
            callback(now);
            i += step;
          }
        }
      },
    });
    let activeSeed = seed;
    Object.assign(window, { kinTestSeed: (value: number) => { activeSeed = value; } });
    const rng = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = activeSeed; return array; }
      return rng(array);
    };
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(legacy));
    if (!localStorage.getItem('ai-game-studio:monster-survivor:v1')) {
      localStorage.setItem('ai-game-studio:monster-survivor:v1', JSON.stringify({ schemaVersion: 1, settings: { mute: true, lowDetail: true } }));
    }
  }, { seed, key: campaignKey, legacy });
}

let planner: Promise<string> | undefined;
function compilePlanner() {
  planner ??= build({ configFile: false, logLevel: 'error', build: {
    write: false, target: 'esnext', lib: { entry: fileURLToPath(new URL('./kin-browser-route.ts', import.meta.url)),
      name: 'KinPlanner', formats: ['iife'] },
  } }).then(result => {
    const output = Array.isArray(result) ? result[0] : result;
    if (!output || !('output' in output)) throw new Error('Could not compile the browser input planner');
    const chunk = output.output.find(entry => entry.type === 'chunk');
    if (!chunk) throw new Error('Browser input planner emitted no code');
    return chunk.code;
  });
  return planner;
}

async function play(page: Page, info: TestInfo, order: number, tier: Tier, kit: KinLoadout = {}, side?: number) {
  const stage = campaignStages[order - 1];
  const raw = await page.evaluate(key => localStorage.getItem(key), campaignKey);
  if (!await page.evaluate(() => 'KinPlanner' in window)) await page.addScriptTag({ content: await compilePlanner() });
  const { frames, result } = await page.evaluate(input => {
    const runtime = window as unknown as { KinPlanner: { plan: typeof plan }; kinTestSeed: (value: number) => void };
    // Select a repeatable clear route. The game then receives the same seed and ordinary inputs.
    for (const selected of [input.seed, 2521, 883, 1547, 3119]) {
      const route = runtime.KinPlanner.plan({ ...input, seed: selected });
      if (route.result.result !== 'victory' && selected !== 3119) continue;
      runtime.kinTestSeed(selected);
      return { ...route, result: { ...route.result, seed: selected } };
    }
    throw new Error('No seed was evaluated');
  }, { raw, order, seed, tier, kit, side });
  expect(result.result, JSON.stringify(result)).toBe('victory');
  await button(page, 'stage-' + stage.id).click();
  if (tier !== 'normal') await button(page, 'tier-' + tier).click();
  await button(page, 'campaign-start').click();
  const pending: Frame[] = [];
  const flush = async () => {
    if (!pending.length) return;
    await page.evaluate(frames => {
      (window as unknown as { kinTestFrames: (input: Frame[]) => void }).kinTestFrames(frames);
    }, pending.splice(0));
  };
  for (const frame of frames) {
    if (frame.ticks) pending.push(frame);
    if (frame.capture || frame.card !== undefined || pending.length >= 40) await flush();
    if (frame.capture) await page.screenshot({ path: info.outputPath(stage.id + '-' + tier + '-' + frame.capture + '.png'), animations: 'disabled' });
    if (frame.card !== undefined) {
      await expect(page.locator('.reward-cards'), stage.id + ' draft should open at ' + frame.at).toBeVisible();
      await page.waitForTimeout(150);
      await page.keyboard.press(String(frame.card + 1));
    }
  }
  await flush();
  await expect(button(page, 'campaign-continue')).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), kinKey);
  expect(saved.best[stage.id + ':' + tier]).toBe(Math.round(result.seconds * 1000));
  return result;
}

test('historical save clears all new maps, then adopts and feeds a companion in Vietnamese', async ({ page }, info) => {
  test.setTimeout(330000);
  const faults: string[] = [];
  page.on('pageerror', error => faults.push(error.message));
  page.on('response', response => { if (response.status() >= 400) faults.push(`${response.status()} ${response.url()}`); });
  await installClock(page);
  await page.goto(url);
  await expect(button(page, 'campaign')).toHaveText('Campaign');
  await button(page, 'language-vi').click();
  await expect(button(page, 'campaign')).toHaveText('Chiến dịch');
  await button(page, 'campaign').click();
  await expect(button(page, 'stage-mistwood')).toBeEnabled();
  await expect(button(page, 'stage-ash-mine')).toBeDisabled();
  const records = [];
  records.push(await play(page, info, 6, 'normal', {}, 0));
  await expect(page.getByRole('heading', { name: 'Đã vượt Rừng Sương' })).toBeVisible();
  await button(page, 'campaign-continue').click();
  await button(page, 'camp-panel-habitat').click();
  await button(page, 'adopt-fox').click();
  await button(page, 'feed-ember-fox-1').click();
  await expect(page.getByText('Thân thiết 2/3')).toBeVisible();
  await button(page, 'equip-pet').click();
  await expect(button(page, 'unequip-pet')).toBeVisible();
  await page.screenshot({ path: info.outputPath('habitat-vi-ember-fox.png'), animations: 'disabled' });
  await page.reload();
  await expect(button(page, 'campaign')).toHaveText('Chiến dịch');
  await button(page, 'campaign').click();
  await button(page, 'camp-panel-habitat').click();
  await expect(page.getByText('Thân thiết 2/3')).toBeVisible();
  await expect(button(page, 'unequip-pet')).toBeVisible();
  await button(page, 'unequip-pet').click();
  await button(page, 'camp-panel-stages').click();
  records.push(await play(page, info, 7, 'normal', {}, 0));
  await expect(page.getByText('Đã mở linh thú · Rùa Rêu')).toBeVisible();
  await button(page, 'campaign-continue').click();
  records.push(await play(page, info, 8, 'normal', {}, 0));
  await expect(page.getByRole('heading', { name: 'Hoàn thành Linh Thú Hộ Đèn' })).toBeVisible();
  await expect(page.getByText(/Cúp Nhật Thực/)).toBeVisible();
  await page.screenshot({ path: info.outputPath('eclipse-temple-victory-vi.png'), animations: 'disabled' });
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), campaignKey)).toEqual(legacy);
  expect(faults).toEqual([]);
  writeFileSync(info.outputPath('lantern-kin-timelines.json'), JSON.stringify(records, null, 2));
});

test('earns and equips a Sigil from a real Elite clear, then exercises it on Nightmare', async ({ page }, info) => {
  test.setTimeout(210000);
  await installClock(page);
  await page.goto(url);
  await button(page, 'campaign').click();
  await button(page, 'camp-panel-armory').click();
  await button(page, 'item-ember-lantern').click();
  await button(page, 'equip-item').click();
  await button(page, 'camp-panel-stages').click();
  await button(page, 'stage-bell-orchard').click();
  await expect(button(page, 'tier-nightmare')).toBeDisabled();
  const elite = await play(page, info, 1, 'elite');
  await button(page, 'campaign-continue').click();
  await button(page, 'camp-panel-engravings').click();
  await button(page, 'engrave-cinder-chain').click();
  await expect(button(page, 'engrave-cinder-chain')).toHaveText('Equipped');
  await button(page, 'camp-panel-stages').click();
  const nightmare = await play(page, info, 1, 'nightmare', { engraving: 'cinder-chain' });
  expect(nightmare.seconds).toBeGreaterThan(elite.seconds);
  writeFileSync(info.outputPath('lantern-kin-tier-timelines.json'), JSON.stringify({ elite, nightmare }, null, 2));
});

test('landscape touch fits Vietnamese selection and keeps language and Survival separate', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4183' + url);
    await button(page, 'language-vi').tap();
    await button(page, 'campaign').tap();
    await expect(button(page, 'stage-mistwood')).toBeDisabled();
    await expect(button(page, 'stage-bell-orchard')).toContainText('Vườn Chuông');
    await expect.poll(() => page.locator('.camp').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await button(page, 'settings').tap();
    await button(page, 'language-en').tap();
    await button(page, 'settings-back').tap();
    await expect(button(page, 'campaign-start')).toHaveText('Enter Bell Orchard');
    await button(page, 'title').tap();
    await button(page, 'start').tap();
    await expect(page.locator('#run-chapter')).toHaveText('Bellgrave Garden');
    await expect(page.getByRole('button', { name: 'Dash' })).toBeVisible();
  } finally { await context.close(); }
});
