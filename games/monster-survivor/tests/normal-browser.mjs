/* global window, crypto, localStorage */
import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { GardenRun } from '../src/slice.ts';
import { draft, steer } from './normal-route.mjs';

const url = process.env.MS_PREVIEW ?? 'http://127.0.0.1:4177/ai-game-studio/games/monster-survivor/';
const seed = Number(process.env.MS_SEED ?? 1807);
const family = process.env.MS_FAMILY ?? 'comet-thread';
const measure = process.env.MS_MEASURE === '1';
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
  const cdp = measure ? await page.context().newCDPSession(page) : null;
  if (cdp) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 1_250_000, uploadThroughput: 1_250_000,
    });
  }
  const heapUsed = async () => {
    if (!cdp) return null;
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    return heap.usedSize;
  };
  await page.addInitScript(seed => {
    let next;
    let now = 0;
    const originalRAF = window.requestAnimationFrame.bind(window);
    window.denseIntervals = [];
    window.requestAnimationFrame = callback => {
      next = callback;
      return 1;
    };
    window.msTestAdvance = async ({ frames, dense }) => {
      let previous = null;
      while (frames > 0) {
        if (dense) {
          const timestamp = await new Promise(resolve => originalRAF(resolve));
          if (previous !== null) window.denseIntervals.push(timestamp - previous);
          previous = timestamp;
        }
        const steps = Math.min(frames, dense ? 1 : 3);
        now += steps * 1000 / 60;
        next?.(now);
        frames -= steps;
      }
    };
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = seed;
        return array;
      }
      return random(array);
    };
    localStorage.setItem('forest-adventure:save:v1', '{"schemaVersion":1}');
    const key = 'ai-game-studio:monster-survivor:v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1, settings: { master: .31, mute: false },
      lifetime: { runs: 2, wins: 1, bestClearMs: 243783, longestMs: 243783, recordKills: 434 },
      discoveredSkillIds: ['wick-dart', 'comet-thread'], cosmetics: { unlocked: ['dawn-scarf'], selected: '' }, runIds: ['s03'],
    }));
  }, seed);
  const advance = (frames, dense = false) => page.evaluate(input => window.msTestAdvance(input), { frames, dense });
  const screenshot = name => page.screenshot({ path: join(evidence, name + '.png'), animations: 'disabled' });
  const press = name => page.getByRole('button', { name, exact: true }).click();
  const navigation = performance.now();
  await page.goto(url);
  await page.getByRole('button', { name: 'Start Run', exact: true }).waitFor();
  const readyMs = performance.now() - navigation;
  const initialTransfer = await page.evaluate(() => performance.getEntriesByType('navigation')[0].transferSize
    + performance.getEntriesByType('resource').reduce((bytes, entry) => bytes + entry.transferSize, 0));
  if (cdp) await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });
  await screenshot('title');
  await press('Start Run');
  const run = new GardenRun(seed);
  const started = performance.now();
  let frozenMs = 0;
  let held = [];
  let direction = { x: 0, y: 0, dash: false };
  let firstDraft = false;
  const scene = new Set();
  const phases = new Set();
  const attacks = new Set();
  let evolved = false;
  let wards = 0;
  let highestFoes = 0;
  let denseHeap = null;
  while (!run.result && run.tick < 55800) {
    if (run.offer) {
      const offerOpened = performance.now();
      for (const key of held) await page.keyboard.up(key);
      held = [];
      const offer = run.offer;
      const title = { level: 'Choose an upgrade', boon: 'Choose a ward boon', evolution: 'Evolve your lantern' }[offer.kind];
      await page.getByRole('heading', { name: title }).waitFor({ timeout: 3000 });
      if (offer.kind === 'boon') { wards++; await screenshot('ward-' + wards); }
      if (offer.kind === 'evolution') {
        evolved = true;
        await screenshot('evolution-' + run.tick);
      }
      if (!firstDraft && offer.kind === 'level') {
        firstDraft = true;
        await screenshot('draft');
        await advance(1);
        const hud = await page.locator('#hud').innerText();
        await advance(120);
        assert.equal(await page.locator('#hud').innerText(), hud);
      }
      const card = draft(run, family);
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
    if (direction.dash) await page.keyboard.press('Space');
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
    highestFoes = Math.max(highestFoes, run.foes.length);
    await advance(count, measure && run.elapsed >= 480 && run.elapsed < 570);
    if (measure && denseHeap === null && run.elapsed >= 570) denseHeap = await heapUsed();
    for (const seconds of [240, 480, 690]) {
      if (!scene.has(seconds) && run.elapsed >= seconds) {
        await screenshot('combat-' + seconds);
        scene.add(seconds);
      }
    }
    if (run.boss?.state === 'windup') {
      phases.add(run.boss.phase);
      const key = `${run.boss.phase}-${run.boss.attack}`;
      if (!attacks.has(key)) {
        await screenshot('warden-' + key);
        attacks.add(key);
      }
    }
  }
  for (const key of held) await page.keyboard.up(key);
  assert.equal(run.result, 'victory');
  assert.equal(wards, 2);
  assert.ok(evolved && phases.size === 3);
  await page.getByRole('heading', { name: 'Garden rekindled' }).waitFor();
  await screenshot('victory');
  await press('Retry');
  await advance(1);
  const firstRetryHeap = await heapUsed();
  if (measure) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.keyboard.press('Escape');
      await press('Restart');
      await page.getByRole('heading', { name: 'Restart this run?' }).waitFor();
      await press('Restart');
      await advance(1);
    }
  }
  const lastRetryHeap = await heapUsed();
  const frameSpacing = measure ? await page.evaluate(() => window.denseIntervals) : [];
  frameSpacing.sort((a,b) => a-b);
  const middle = frameSpacing[Math.floor(frameSpacing.length * .5)];
  const p95 = frameSpacing[Math.floor(frameSpacing.length * .95)];
  assert.match(await page.locator('#hud').innerText(), /00:00/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-game-studio:monster-survivor:v1')));
  assert.equal(stored.lifetime.runs, 3);
  assert.equal(stored.lifetime.wins, 2);
  assert.equal(stored.lifetime.bestClearMs, 243783);
  assert.equal(stored.settings.master, .31);
  assert.equal(await page.evaluate(() => localStorage.getItem('forest-adventure:save:v1')), '{"schemaVersion":1}');
  assert.deepEqual(faults, []);
  console.log(JSON.stringify({
    chromium: await browser.version(), viewport: '1366×768', url, outcome: run.result, seconds: run.elapsed,
    wallSeconds: (performance.now() - started) / 1000, kills: run.kills, hp: run.player.hp, build: [...run.build], wards, evolved, phases: [...phases], attacks: [...attacks], faults,
    metrics: { initialTransfer, readyMs, highestFoes, denseHeap, firstRetryHeap, lastRetryHeap,
      frames: frameSpacing.length, medianFps: middle ? 1000 / middle : null, p95Ms: p95 ?? null },
  }, null, 2));
} finally {
  await browser.close();
}
