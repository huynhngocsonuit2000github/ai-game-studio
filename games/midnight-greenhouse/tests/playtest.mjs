/* global document, window, localStorage */
import { observeWebAudio } from "./audio-observer.mjs";
import console from "node:console";
import { URL } from "node:url";
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import process from 'node:process';
const origin = process.env.GREENHOUSE_PLAYTEST_URL ?? 'http://127.0.0.1:4189/ai-game-studio/games/midnight-greenhouse/';
const results = new URL('../test-results/normal-speed/', import.meta.url).pathname;
await mkdir(results, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.STUDIO_CHROMIUM_PATH, args: ['--autoplay-policy=user-gesture-required'] });
const routes = [
  [[0,'pitcher',1,0],[1,'fern',1,2],[2,'water',1],[37,'fern',2,2],[45,'pitcher',1,1],[60,'orchid',1,4],[80,'fern',2,3],[82,'fern',2,5],[94,'fern',1,3],[102,'fern',1,5],[116,'fern',0,2],[124,'fern',0,3],[132,'fern',3,2],[142,'fern',3,3],[154,'fern',1,6],[170,'fern',3,5],[172,'fern',3,1],[182,'fern',2,1],[194,'fern',0,5],[264,'fern',0,1]],
  [[0,'fern',1,2],[2,'fern',2,2],[43,'pitcher',3,0],[44,'water',3],[62,'bramble',1,5],[79,'fern',2,3],[90,'pitcher',3,1],[100,'fern',1,3],[108,'fern',2,5],[124,'fern',0,2],[132,'fern',3,2],[142,'fern',3,3],[152,'fern',1,1],[164,'orchid',1,4],[166,'water',1],[174,'water',3],[180,'fern',2,1],[194,'fern',0,3],[198,'fern',0,5],[204,'fern',3,5],[216,'fern',3,4],[232,'fern',1,0],[236,'water',1],[246,'water',3],[264,'fern',0,1],[280,'water',1],[288,'water',3],[312,'water',1],[320,'water',3],[406,'water',1],[416,'water',3],[444,'water',1],[452,'water',3]],
];
const water = (page, lane) => page.locator('.valve').nth(lane);
const clock = async (page, t) => {
  const readout = page.locator('#time');
  if (t === 0) return readout.waitFor();
  await page.waitForFunction(({ t }) => {
    const label = document.getElementById('time')?.textContent ?? '';
    const prep = /Chuẩn bị · (\d+) giây/.exec(label);
    if (prep) return 20 - Number(prep[1]) >= t;
    const combat = /Ca trực · (\d+):(\d+)/.exec(label);
    return !!combat && 20 + Number(combat[1])*60 + Number(combat[2]) >= t;
  }, { t }, { timeout: 490000, polling: 150 });
};
const readSave = (page) => page.evaluate(() => localStorage.getItem('midnight-greenhouse.progress.v1'));
const heardAudio = (page) => page.evaluate(() =>
  [...new Set(window.greenhouseAudio.starts.map(({ url }) => url?.split('/').at(-1)))].sort());

async function profile(name, viewport, touch, run, prepare) {
  const device = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  await device.addInitScript(observeWebAudio);
  const page = await device.newPage();
  const issues = [];
  page.on('pageerror', (error) => issues.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') issues.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) issues.push(response.status() + ' ' + response.url());
  });
  page.on('requestfailed', (request) => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) issues.push(request.url() + ' ' + request.failure()?.errorText);
  });
  try {
    if (prepare) await prepare(device);
    await page.goto(origin);
    if (!prepare) {
      await page.locator('#enter').click();
      assert.equal(await page.locator('[data-stage]').count(), 1);
      await page.locator('[data-stage=raincourt]').click();
    } else {
      await page.locator('[data-stage=lightning-dome]').click();
    }
    await page.locator('#start').click();
    const start = Date.now();
    const heard = await run(page, touch ? 'tap' : 'click') ?? await heardAudio(page);
    console.log(name, 'elapsedSeconds', (Date.now() - start) / 1000,
      'audio', JSON.stringify(heard), 'issues', JSON.stringify(issues));
    assert.deepEqual(issues, []);
  } finally { await device.close(); }
}

async function action(page, use, card, lane, col) {
  if (card === 'water') {
    await water(page, lane)[use]();
    await water(page, lane).and(page.locator('[aria-pressed=true]')).waitFor({ timeout: 2300 });
    return;
  }
  const tool = page.locator(card === 'remove' ? '#remove' : `[data-card="${card}"]`);
  if (await tool.getAttribute('aria-pressed') !== 'true') await tool[use]();
  const tile = page.locator('.tile').nth(lane * 8 + col);
  const label = await tile.getAttribute('aria-label');
  await tile[use]();
  await page.waitForFunction(({ lane, col, label }) => {
    const node = document.querySelectorAll('.tile')[lane * 8 + col];
    return node?.getAttribute('aria-label') !== label;
  }, { lane, col, label }, { timeout: 2300 });
  if (card === 'remove') {
    assert.doesNotMatch(await tile.getAttribute('aria-label') ?? '', /Bình Hứng|Dương Xỉ|Gai Cuộn|Lan Sét|Rêu Thành|Lựu Cầu/);
  } else {
    const title = (await tool.locator('strong').innerText()).split(' · ').at(-1);
    assert.ok((await tile.getAttribute('aria-label'))?.includes(title), title);
  }
}
async function clear(name, route, touch) {
  return profile(name, touch ? {width:844,height:390} : {width:1280,height:720}, touch, async (page, use) => {
    let captured = false;
    let tookSecond = false;
    for (const [t, card, lane, col] of route) {
      if (!captured && t >= 79) {
        await clock(page, 71);
        await page.screenshot({path:results + '/' + name + '-active.png'});
        captured = true;
      }
      if (!tookSecond && t >= 170) {
        await clock(page, 168);
        await page.screenshot({path:results + '/' + name + '-wave-3.png'});
        tookSecond = true;
      }
      await clock(page,t);
      await action(page, use, card, lane, col);
    }
    await page.getByRole('heading',{ name:'Giữ đèn lên!' }).waitFor({timeout:510000});
    const summary = await page.locator('dialog').innerText();
    assert.match(summary, /Hạt Tim 3\/3/);
    const saveBefore = await page.evaluate(() => localStorage.getItem('midnight-greenhouse.progress.v1'));
    await page.screenshot({path:results + '/' + name + '-win.png'});
    const heard = await page.evaluate(() => [...new Set(window.greenhouseAudio.starts.map(({ url }) => url?.split('/').at(-1)))].sort());
    await page.reload();
    await page.getByRole('button',{name:'Chơi lại Sân Mưa'}).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('midnight-greenhouse.progress.v1')), saveBefore);
    console.log(name, 'result', JSON.stringify(summary), 'record', saveBefore);
    return heard;
  });
}
async function lose() {
  return profile('loss', {width:1280,height:720}, false, async (page) => {
    const status = page.locator('#time');
    await page.locator('#pause').click();
    const frozen = await status.textContent();
    await page.waitForTimeout(1300);
    assert.equal(await status.textContent(), frozen);
    await page.locator('#resume').click();
    await page.getByRole('heading',{name:'Hạt Tim đã tắt'}).waitFor({timeout:120000});
    await page.screenshot({path:results + '/loss.png'});
    await page.locator('#retry').click();
    assert.match(await status.textContent(), /Chuẩn bị/);
    assert.equal(await page.locator('#core strong').textContent(),'3/3');
    assert.equal(await page.locator('#stock strong').textContent(),'150');
    assert.equal(await page.locator('.valve[aria-pressed=true]').count(),0);
  });
}
const laterRoutes = async () => JSON.parse(await readFile(new URL('./campaign-routes.json', import.meta.url), 'utf8'));
const watch = (page, lane, state) => water(page, lane).and(page.locator(`[data-valve="${state}"]`));
const capture = (page, name) => page.screenshot({ path: results + '/' + name + '.png' });

async function playLevel(page, use, id, route, captures = []) {
  const entries = [...route, ...captures].sort(([a], [b]) => a - b);
  for (const [t, command, lane, col] of entries) {
    await clock(page, t);
    if (typeof command === 'function') await command();
    else await action(page, use, command, lane, col);
  }
  await page.locator('#advance').waitFor({ timeout: 520000 });
  const text = await page.locator('dialog').innerText();
  const saved = JSON.parse(await readSave(page));
  assert.ok(saved[id], 'Missing result for ' + id);
  console.log(id, text.replaceAll('\n', ' '), JSON.stringify(saved[id]));
  await capture(page, id + '-result');
  return saved[id];
}

function domeChecks(page, key) {
  return [
    [439, async () => {
      await watch(page, 0, 'warning').waitFor({ timeout: 2000 });
      assert.match(await page.locator('#keeper-status').innerText(), /Pha 1/);
      await capture(page, key + '-dodge-warning');
      await page.evaluate(() => {
        const deltas = [];
        let previous = 0;
        const sample = (time) => {
          if (previous) deltas.push(time - previous);
          previous = time;
          if (deltas.reduce((total, frame) => total + frame, 0) < 30000) window.requestAnimationFrame(sample);
          else window.greenhouseFrameTimes = deltas;
        };
        window.requestAnimationFrame(sample);
      });
    }],
    [443, async () => {
      await watch(page, 0, 'closed').waitFor({ timeout: 2000 });
      assert.equal(await water(page, 1).getAttribute('aria-pressed'), 'true');
    }],
    [470, async () => {
      await watch(page, 1, 'closed').waitFor({ timeout: 2500 });
      assert.equal(await page.locator('.valve[aria-pressed=true]').count(), 0);
      assert.match(await page.locator('#keeper-status').innerText(), /Pha 2/);
      await capture(page, key + '-phase-two-lock');
      const deltas = await page.evaluate(() => window.greenhouseFrameTimes);
      assert.ok(deltas?.length);
      deltas.sort((a, b) => a - b);
      console.log(key, 'frames', deltas.length, 'median-ms', deltas[Math.floor(deltas.length / 2)],
        'p95-ms', deltas[Math.floor(deltas.length * .95)]);
    }],
  ];
}

async function campaign() {
  return profile('campaign', { width: 1280, height: 720 }, false, async (page, use) => {
    const first = await playLevel(page, use, 'raincourt', routes[0], [
      [168, () => capture(page, 'campaign-raincourt')],
    ]);
    assert.equal((await page.locator('#advance').innerText()).trim(), 'Tiếp tục · Hầm Bơm');
    await page.locator('#advance').click();
    await page.getByRole('heading', { name: 'Hầm Bơm' }).waitFor();
    await page.reload();
    await page.locator('[data-stage=pump-gallery]').waitFor();
    assert.equal(await page.locator('[data-stage=lightning-dome]').count(), 0);
    await page.locator('[data-stage=pump-gallery]').click();
    await page.locator('#start').click();
    const later = await laterRoutes();
    const second = await playLevel(page, use, 'pump-gallery', later['pump-gallery'], [
      [120, async () => {
        await watch(page, 2, 'warning').waitFor({ timeout: 1500 });
        assert.equal(await water(page, 2).getAttribute('aria-pressed'), 'true');
        await capture(page, 'campaign-pump-warning');
      }],
      [124, async () => {
        assert.equal(await watch(page, 2, 'closed').count(), 1);
        assert.equal(await water(page, 0).getAttribute('aria-pressed'), 'true');
        await water(page, 2).click();
        await page.getByText('Van luống này đang đóng.', { exact: true }).waitFor();
      }],
      [141, async () => {
        assert.equal(await watch(page, 2, 'open').count(), 1);
        assert.equal(await water(page, 2).getAttribute('aria-pressed'), 'true');
        await capture(page, 'campaign-pump-reopened');
      }],
    ]);
    assert.equal((await page.locator('#advance').innerText()).trim(), 'Tiếp tục · Đài Chớp');
    await page.locator('#advance').click();
    await page.getByRole('heading', { name: 'Đài Chớp' }).waitFor();
    await page.reload();
    await page.locator('[data-stage=lightning-dome]').click();
    await page.locator('#start').click();
    const third = await playLevel(page, use, 'lightning-dome', later['lightning-dome'], domeChecks(page, 'campaign-dome'));
    await page.locator('#advance').click();
    await page.getByRole('heading', { name: 'Hạt Tim nảy mầm', exact: true }).waitFor();
    assert.equal(await page.locator('.ending-records li').count(), 3);
    await page.locator('#skip-bloom').click();
    await capture(page, 'campaign-ending');
    await page.locator('#ending-map').click();
    const audio = await heardAudio(page);
    await page.reload();
    await page.locator("[data-stage=lightning-dome]").waitFor();
    assert.equal(await page.locator('[data-stage]').count(), 3);
    const complete = await readSave(page);
    assert.deepEqual(JSON.parse(complete), { version: 1, raincourt: first, 'pump-gallery': second, 'lightning-dome': third });
    // Earlier-stage loss preserves all earned records and Retry starts dry with full core.
    await page.locator('[data-stage=raincourt]').click();
    await page.locator('#start').click();
    await page.getByRole('heading', { name: 'Hạt Tim đã tắt' }).waitFor({ timeout: 120000 });
    assert.equal(await readSave(page), complete);
    await page.locator('#retry').click();
    await page.waitForFunction(() => document.getElementById('time')?.textContent?.startsWith('Chuẩn bị'));
    assert.equal(await page.locator('#core strong').textContent(), '3/3');
    assert.equal(await page.locator('#stock strong').textContent(), '150');
    assert.equal(await page.locator('.valve[aria-pressed=true]').count(), 0);
    return audio;
  });
}

async function domeOnTouch() {
  return profile('dome-touch', { width: 844, height: 390 }, true, async (page, use) => {
    const routes = await laterRoutes();
    await playLevel(page, use, 'lightning-dome', routes['lightning-dome'], domeChecks(page, 'touch-dome'));
    await page.locator('#retry').tap();
    await page.getByRole('heading', { name: 'Đài Chớp' }).waitFor();
    assert.equal(await page.locator('#stock strong').innerText(), '200');
    assert.equal(await page.locator('.valve[aria-pressed=true]').count(), 0);
  }, (context) => context.addInitScript(() => {
    localStorage.setItem('midnight-greenhouse.progress.v1', JSON.stringify({
      version: 1, raincourt: { stars: 2, fastest: 430 }, 'pump-gallery': { stars: 2, fastest: 449 },
    }));
  }));
}

const selected = process.argv[2] ?? 'campaign';
const jobs = new Map([
  ['campaign', campaign],
  ['dome-touch', domeOnTouch],
  ['desktop', () => clear('desktop-collector', routes[0], false)],
  ['touch', () => clear('touch-fern', routes[1], true)],
  ['loss', lose],
]);
try {
  const run = jobs.get(selected);
  if (!run) throw new Error('Unknown route: ' + selected);
  await run();
} finally { await browser.close(); }
