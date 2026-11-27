/* global document, window, localStorage */
import console from "node:console";
import { URL } from "node:url";
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
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
async function profile(name, viewport, touch, run) {
  const device = await browser.newContext({viewport, hasTouch: touch, isMobile: touch});
  await device.addInitScript(() => {
    window.heard = {};
    const original = window.Audio;
    window.Audio = class extends original {
      constructor(source) {
        super(source);
        this.addEventListener('timeupdate', () => {
          if (this.volume > 0) window.heard[source] = Math.max(window.heard[source] ?? 0, this.currentTime);
        });
      }
    };
  });
  const page = await device.newPage();
  const issues = [];
  page.on('pageerror', error => issues.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') issues.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) issues.push(response.status() + ' ' + response.url()); });
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) issues.push(request.url() + ' ' + request.failure()?.errorText); });
  await page.goto(origin);
  await page.locator('#enter').click();
  await page.locator('#open-stage').click();
  await page.locator('#start').click();
  const start = Date.now();
  try {
    await run(page, touch ? 'tap' : 'click');
    const heard = await page.evaluate(() => window.heard);
    console.log(name, 'elapsedSeconds', (Date.now()-start)/1000, 'audio advancing', JSON.stringify(heard), 'issues', JSON.stringify(issues));
    assert.deepEqual(issues, []);
  } finally { await device.close(); }
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
      if (card === 'water') {
        await water(page,lane)[use]();
        await water(page,lane).and(page.locator('[aria-pressed=true]')).waitFor({timeout:1500});
      } else {
        const seed = page.locator('[data-card="' + card + '"]');
        if (await seed.getAttribute('aria-pressed') !== 'true') await seed[use]();
        const tile = page.locator('.tile').nth(lane*8+col);
        await tile[use]();
        await page.waitForFunction(({lane,col}) => {
          const node = document.querySelectorAll('.tile')[lane*8+col];
          return /Bình Hứng|Dương Xỉ|Gai Cuộn|Lan Sét/.test(node?.getAttribute('aria-label') ?? '');
        }, {lane,col}, {timeout:1500});
      }
    }
    await page.getByRole('heading',{ name:'Giữ đèn lên!' }).waitFor({timeout:510000});
    const summary = await page.locator('dialog').innerText();
    assert.match(summary, /Hạt Tim 3\/3/);
    const saveBefore = await page.evaluate(() => localStorage.getItem('midnight-greenhouse.progress.v1'));
    await page.screenshot({path:results + '/' + name + '-win.png'});
    await page.reload();
    await page.getByRole('button',{name:'Chơi lại Sân Mưa'}).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('midnight-greenhouse.progress.v1')), saveBefore);
    console.log(name, 'result', JSON.stringify(summary), 'record', saveBefore);
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
const selected = process.argv[2];
const jobs = [
  ['desktop', () => clear('desktop-collector',routes[0],false)],
  ['touch', () => clear('touch-fern',routes[1],true)],
  ['loss', lose],
].filter(([name]) => !selected || name === selected).map(([,run]) => run());
const all = await Promise.allSettled(jobs);
for (const item of all) if (item.status === 'rejected') console.error(item.reason);
await browser.close();
if (all.some(item => item.status === 'rejected')) process.exitCode = 1;
