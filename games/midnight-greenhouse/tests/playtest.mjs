/* global document, localStorage */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';
import { chromium } from '@playwright/test';
import { observeMotion } from './motion-observer.mjs';

const project = new URL(process.env.GREENHOUSE_PLAYTEST_URL ?? 'http://127.0.0.1:4189/ai-game-studio/');
const direct = new URL('./games/midnight-greenhouse/index.html', project);
const output = new URL('../test-results/retro-normal-speed/', import.meta.url);
const routes = JSON.parse(await readFile(new URL('./retro-routes.json', import.meta.url), 'utf8'));
const mode = process.argv[2] ?? 'campaign';
const touch = ['touch', 'pump-touch', 'dome-touch'].includes(mode);
const stages = { desktop: 'raincourt-collector', touch: 'raincourt-fern', 'pump-touch': 'pump-gallery', 'dome-touch': 'lightning-dome' };
const samples = { raincourt: [12, 100, 170, 230], 'pump-gallery': [30, 59, 102, 184, 230], 'lightning-dome': [70, 165, 280, 301] };
const seedPrior = mode === 'pump-touch' || mode === 'dome-touch';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.STUDIO_CHROMIUM_PATH,
  args: ['--autoplay-policy=user-gesture-required'],
});
const viewport = touch ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch });
await context.addInitScript(observeMotion);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', (response) => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
page.on('requestfailed', (request) => {
  if (!request.failure()?.errorText.includes('ERR_ABORTED')) errors.push(request.url() + ' ' + request.failure()?.errorText);
});

const use = touch ? 'tap' : 'click';
const saveKey = 'midnight-greenhouse.retro.progress.v1';
const capture = (name) => page.screenshot({ path: new URL(name + '.png', output).pathname });

async function waitForTime(second) {
  await page.waitForFunction((target) => {
    const label = document.querySelector('#time')?.textContent ?? '';
    const prep = /Chuẩn bị · (\d+) giây/.exec(label);
    const combat = /Ca trực · (\d+):(\d+)/.exec(label);
    if (document.querySelector('dialog[open][data-lock="true"]')) return true;
    if (prep) return 6 - Number(prep[1]) >= target;
    return combat && 6 + Number(combat[1]) * 60 + Number(combat[2]) >= target;
  }, second, { timeout: 420_000, polling: 90 });
}

async function apply(card, lane, col) {
  if (card === 'water') {
    const valve = page.locator('.valve').nth(lane);
    if (await valve.getAttribute('aria-pressed') !== 'true') await valve[use]();
    await valve.and(page.locator('[aria-pressed=true]')).waitFor({ timeout: 2500 });
    return;
  }
  const button = page.locator(`[data-card="${card}"]`);
  await button.and(page.locator('[aria-disabled=false]')).waitFor({ timeout: 3500 });
  if (await button.getAttribute('aria-pressed') !== 'true') await button[use]();
  const tile = page.locator('.tile').nth(lane * 8 + col);
  const box = await tile.boundingBox();
  assert.ok(box);
  // The bottom third stays clear of collectible tokens.
  await tile[use]({ position: { x: box.width * .5, y: box.height * .78 }, timeout: 2000 });
  const label = await button.locator('strong').innerText();
  await page.waitForFunction(({ index, label }) =>
    document.querySelectorAll('.tile')[index]?.getAttribute('aria-label')?.includes(label),
  { index: lane * 8 + col, label }, { timeout: 2000 });
}

async function complete(name) {
  const id = name.startsWith('raincourt') ? 'raincourt' : name;
  await page.locator(`[data-arena="${id}"]`).waitFor();
  const began = Date.now();
  const evidenceName = mode + '-' + id;
  const actions = [...routes[name], ...samples[id].map((second) => [second, 'capture'])].sort(([a], [b]) => a - b);
  const applied = [];
  for (const [second, card, lane, col] of actions) {
    await waitForTime(second);
    if (await page.locator('dialog[open][data-lock="true"]').isVisible()) break;
    if (card === 'capture') await capture(`${evidenceName}-${second}`);
    else {
      try { await apply(card, lane, col); } catch (error) {
        if (await page.locator('#advance').isVisible()) break;
        throw error;
      }
      applied.push([second, card, lane, col]);
    }
  }
  await page.locator('#advance').waitFor({ timeout: 420_000 });
  await capture(evidenceName + '-win');
  const saved = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), saveKey));
  const record = {
    saved: saved[id], elapsedWallSeconds: (Date.now() - began) / 1000, applied, errors,
    stock: Number(await page.locator('#stock strong').innerText()),
    bell: await page.locator('#bell-state strong').innerText(),
    canvasFrames: await page.evaluate(() => globalThis.retroMotion),
  };
  await writeFile(new URL(evidenceName + '.json', output), JSON.stringify(record, null, 2) + '\n');
  assert.ok(record.saved, id);
}

try {
  if (mode === 'campaign') {
    await page.goto(project.href);
    await page.getByRole('link', { name: /Nhà Kính Sau Nửa Đêm/ }).click();
    await page.getByRole('link', { name: 'Play preview' }).click();
    assert.equal(page.url(), direct.href);
  } else await page.goto(direct.href);
  if (seedPrior) {
    await page.evaluate(() => localStorage.setItem('midnight-greenhouse.progress.v1', JSON.stringify({
      version: 1, raincourt: { stars: 2, fastest: 429 }, 'pump-gallery': { stars: 2, fastest: 456 },
    })));
    await page.reload();
    await page.locator('#choose-stage')[use]();
    await page.locator(`[data-stage="${stages[mode]}"]`)[use]();
  } else await page.locator('#enter')[use]();

  if (mode === 'campaign') {
    for (const name of ['raincourt-collector', 'pump-gallery', 'lightning-dome']) {
      await complete(name);
      await page.locator('#advance').click();
    }
    await page.locator('.ending').waitFor();
    await capture('campaign-ending');
    const saved = await page.evaluate((key) => localStorage.getItem(key), saveKey);
    await page.reload();
    await page.locator('#choose-stage').click();
    assert.equal(await page.locator('[data-stage]').count(), 3);
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), saveKey), saved);
    await page.getByRole('link', { name: 'Thư viện game (Game Library)' }).click();
    assert.equal(page.url(), new URL('#/', project).href);
  } else if (mode === 'loss') {
    await page.locator('#retry').waitFor({ timeout: 100_000 });
    await capture('defeat');
    await page.locator('#retry').click();
    await page.locator('[data-arena=raincourt]').waitFor();
    assert.equal(await page.locator('#core strong').innerText(), '3/3');
    assert.equal(await page.locator('#stock strong').innerText(), '140');
    assert.equal(await page.locator('#bell-state strong').innerText(), 'Sẵn');
  } else if (stages[mode]) await complete(stages[mode]);
  else throw new Error('Unknown playtest route ' + mode);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
