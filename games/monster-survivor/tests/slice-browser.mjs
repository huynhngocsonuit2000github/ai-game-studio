/* global window, crypto, localStorage */
import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { Slice } from '../src/slice.ts';
import { pick, steer } from './route.mjs';

const url = process.env.MS_PREVIEW ?? 'http://127.0.0.1:4177/ai-game-studio/games/monster-survivor/';
const evidence = process.env.MS_EVIDENCE ?? 'test-results';
const browser = await chromium.launch({ executablePath: process.env.STUDIO_CHROMIUM_PATH, args: ['--no-sandbox'] });
await mkdir(evidence, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const faults = [];
  page.on('pageerror', error => faults.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) faults.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() => {
    let next;
    let now = 0;
    window.requestAnimationFrame = callback => {
      next = callback;
      return 1;
    };
    window.msTestAdvance = frames => {
      while (frames > 0) {
        const steps = Math.min(frames, 3);
        now += steps * 1000 / 60;
        next?.(now);
        frames -= steps;
      }
    };
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 1807;
        return array;
      }
      return random(array);
    };
  });
  const advance = frames => page.evaluate(n => window.msTestAdvance(n), frames);
  const screenshot = name => page.screenshot({ path: join(evidence, name + '.png'), animations: 'disabled' });
  const press = name => page.getByRole('button', { name, exact: true }).click();
  await page.goto(url);
  await page.getByRole('button', { name: 'Start Run', exact: true }).waitFor();
  await screenshot('title');
  await press('Start Run');
  const run = new Slice(1807);
  const started = performance.now();
  let frozenMs = 0;
  let held = [];
  let direction = { x: 0, y: 0, dash: false };
  let draft = false;
  let combat = false;
  let boss = false;
  let evolved = false;
  let ward = false;
  while (!run.result && run.tick < 20000) {
    if (run.offer) {
      const offerOpened = performance.now();
      for (const key of held) await page.keyboard.up(key);
      held = [];
      const offer = run.offer;
      const title = { level: 'Choose an upgrade', boon: 'Choose a ward boon', evolution: 'Evolve your lantern' }[offer.kind];
      await page.getByRole('heading', { name: title }).waitFor({ timeout: 3000 });
      if (offer.kind === 'boon') ward = true;
      if (offer.kind === 'evolution') {
        evolved = true;
        await screenshot('evolution');
      }
      if (!draft && offer.kind === 'level') {
        draft = true;
        await screenshot('draft');
        await advance(1);
        const hud = await page.locator('#hud').innerText();
        await advance(120);
        assert.equal(await page.locator('#hud').innerText(), hud);
      }
      const card = pick(offer);
      await page.waitForTimeout(155);
      await page.keyboard.press(String(offer.cards.indexOf(card) + 1));
      run.choose(card);
      direction = steer(run);
      frozenMs += performance.now() - offerOpened;
      continue;
    }
    if (run.tick % 12 === 0) direction = steer(run);
    const next = [
      direction.x < 0 ? 'ArrowLeft' : direction.x > 0 ? 'ArrowRight' : '',
      direction.y < 0 ? 'ArrowUp' : direction.y > 0 ? 'ArrowDown' : '',
    ].filter(Boolean);
    for (const key of held) if (!next.includes(key)) await page.keyboard.up(key);
    for (const key of next) if (!held.includes(key)) await page.keyboard.down(key);
    held = next;
    let count = 0;
    do {
      run.step(direction);
      run.cues.length = 0;
      count++;
    } while (run.tick % 12 && !run.offer && !run.result);
    if (process.env.MS_REALTIME === '1') {
      const remaining = started + frozenMs + run.elapsed * 1000 - performance.now();
      if (remaining > 1) await delay(remaining);
    }
    await advance(count);
    if (!combat && run.elapsed >= 99) {
      await screenshot('combat');
      combat = true;
    }
    if (!boss && run.boss?.state === 'windup' && run.boss.hp > 0) {
      await screenshot('boss');
      boss = true;
    }
  }
  for (const key of held) await page.keyboard.up(key);
  assert.equal(run.result, 'victory');
  assert.ok(ward && evolved && boss);
  await page.getByRole('heading', { name: 'Garden rekindled' }).waitFor();
  await screenshot('victory');
  await press('Retry');
  for (let i = 0; i < 36; i++) await advance(60);
  await page.getByRole('heading', { name: 'The lantern went out' }).waitFor();
  await screenshot('defeat');
  await press('Retry');
  await advance(1);
  assert.match(await page.locator('#hud').innerText(), /00:00/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-game-studio:monster-survivor:v1')));
  assert.equal(stored.lifetime.runs, 2);
  assert.equal(stored.lifetime.wins, 1);
  assert.deepEqual(faults, []);
  console.log(JSON.stringify({
    chromium: await browser.version(), viewport: '1366×768', url, outcome: run.result, seconds: run.elapsed,
    wallSeconds: (performance.now() - started) / 1000, kills: run.kills, hp: run.player.hp, build: [...run.build], ward, evolved, defeats: 1, faults,
  }, null, 2));
} finally {
  await browser.close();
}
