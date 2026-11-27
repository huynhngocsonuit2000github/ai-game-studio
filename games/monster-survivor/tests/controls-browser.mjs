/* global AudioContext, Event, localStorage, window */
import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { chromium } from '@playwright/test';

const url = process.env.MS_PREVIEW ?? 'http://127.0.0.1:4177/ai-game-studio/games/monster-survivor/';
const evidence = process.env.MS_EVIDENCE ?? 'test-results';
const browser = await chromium.launch({ executablePath: process.env.STUDIO_CHROMIUM_PATH, args: ['--no-sandbox'] });
await mkdir(evidence, { recursive: true });
const saveKey = 'forest-adventure:save:v1';
const forestRecord = { schemaVersion: 1, settings: { master: .4, music: .7, sfx: .8, muted: true, reducedMotion: true }, bestByLevel: { 'lantern-oak': { ticks: 444, fireflies: 2 } }, unlockedLevelIds: ['lantern-oak'] };
try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await desktop.addInitScript(({ key, bytes }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, bytes);
    const Native = AudioContext;
    window.msAudio = { gain: null, contexts: 0, decoded: 0 };
    window.AudioContext = class extends Native {
      constructor() {
        super();
        window.msAudio.contexts++;
      }
      createGain() {
        const gain = super.createGain();
        window.msAudio.gain ??= gain;
        return gain;
      }
      async decodeAudioData(data) {
        const decoded = await super.decodeAudioData(data);
        window.msAudio.decoded++;
        return decoded;
      }
    };
  }, { key: saveKey, bytes: JSON.stringify(forestRecord) });
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const faults = [];
  const collector = page => {
    page.on('pageerror', error => faults.push(error.message));
    page.on('response', response => { if (response.status() >= 400) faults.push(`${response.status()} ${response.url()}`); });
  };
  collector(desktop);
  await desktop.goto(url);
  await button(desktop, 'Start Run').waitFor();
  assert.equal(await desktop.evaluate(() => window.msAudio.contexts), 0);
  await button(desktop, 'Field Guide').click();
  await button(desktop, 'Threats').click();
  await desktop.getByText('Bramble Scarab', { exact: true }).waitFor();
  await button(desktop, 'Back').click();
  await button(desktop, 'Settings').click();
  await desktop.waitForFunction(() => window.msAudio.decoded >= 1);
  await desktop.locator('#set-master').focus();
  await desktop.keyboard.press('Home');
  for (let i = 0; i < 3; i++) await desktop.keyboard.press('ArrowRight');
  await desktop.getByLabel('Mute audio').check();
  await desktop.getByLabel('Reduce motion').check();
  await desktop.getByLabel('High contrast').check();
  await desktop.getByLabel('Damage numbers').uncheck();
  await desktop.waitForFunction(() => window.msAudio.gain.gain.value < .01);
  await desktop.reload();
  await button(desktop, 'Settings').click();
  assert.equal(await desktop.locator('#set-master').inputValue(), '0.03');
  assert.equal(await desktop.getByLabel('Mute audio').isChecked(), true);
  assert.equal(await desktop.getByLabel('Reduce motion').isChecked(), true);
  assert.equal(await desktop.getByLabel('High contrast').isChecked(), true);
  assert.equal(await desktop.getByLabel('Damage numbers').isChecked(), false);
  assert.equal(await desktop.evaluate(key => localStorage.getItem(key), saveKey), JSON.stringify(forestRecord));
  await desktop.screenshot({ path: join(evidence, 'settings.png') });
  await button(desktop, 'Back').click();
  await button(desktop, 'Start Run').click();
  const ward = desktop.locator('#ward-info');
  const initialDistance = await ward.innerText();
  await desktop.keyboard.down('KeyW');
  await desktop.keyboard.press('Space');
  await desktop.waitForTimeout(650);
  await desktop.keyboard.up('KeyW');
  assert.notEqual(await ward.innerText(), initialDistance);
  assert.match(await desktop.locator('#dash-state').innerText(), /Dash [0-9]/);
  await desktop.evaluate(() => window.dispatchEvent(new Event('blur')));
  await desktop.getByRole('heading', { name: 'Paused', exact: true }).waitFor();
  const stopped = await desktop.locator('#run-time').innerText();
  await desktop.waitForTimeout(1250);
  assert.equal(await desktop.locator('#run-time').innerText(), stopped);
  await button(desktop, 'Restart').click();
  await desktop.getByRole('heading', { name: 'Restart this run?' }).waitFor();
  await button(desktop, 'Cancel').click();
  await button(desktop, 'Quit').click();
  await button(desktop, 'Quit').click();
  await desktop.getByRole('link', { name: /Game Library/ }).click();
  await desktop.getByRole('heading', { name: 'Game Library' }).waitFor();
  assert.equal(new URL(desktop.url()).pathname, '/ai-game-studio/');
  if (process.env.MS_FOREST === '1') {
    await desktop.goto(new URL('../../games/forest-adventure/index.html', url).href);
    await button(desktop, 'Play').click();
    await desktop.getByText('Heartseeds 0/3', { exact: true }).waitFor();
    await desktop.keyboard.down('ArrowRight');
    await desktop.keyboard.press('Space');
    await desktop.waitForTimeout(700);
    await desktop.keyboard.up('ArrowRight');
    await desktop.keyboard.press('Escape');
    await desktop.getByRole('link', { name: 'Back to Studio' }).click();
    await desktop.getByRole('heading', { name: 'Game Library' }).waitFor();
    assert.equal(await desktop.evaluate(key => localStorage.getItem(key), saveKey), JSON.stringify(forestRecord));
  }
  await desktop.close();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  collector(mobile);
  await mobile.goto(url);
  await button(mobile, 'Start Run').tap();
  await mobile.getByRole('heading', { name: 'Rotate to play' }).waitFor();
  await mobile.setViewportSize({ width: 844, height: 390 });
  await button(mobile, 'Start Run').tap();
  const stick = await mobile.locator('#stick').boundingBox();
  const dash = await mobile.locator('#dash').boundingBox();
  assert.ok(stick && dash);
  const session = await mobile.context().newCDPSession(mobile);
  const first = { x: stick.x + stick.width / 2, y: stick.y + 15, id: 1 };
  const second = { x: dash.x + dash.width / 2, y: dash.y + dash.height / 2, id: 2 };
  const before = await mobile.locator('#ward-info').innerText();
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  await mobile.waitForTimeout(670);
  assert.notEqual(await mobile.locator('#ward-info').innerText(), before);
  assert.equal(await mobile.locator('#dash').getAttribute('data-ready'), 'false');
  await mobile.screenshot({ path: join(evidence, 'touch.png') });
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const cancelled = await mobile.locator('#ward-info').innerText();
  await mobile.waitForTimeout(250);
  assert.equal(await mobile.locator('#ward-info').innerText(), cancelled);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.getByRole('heading', { name: 'Rotate to play' }).waitFor();
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.getByRole('heading', { name: 'Paused', exact: true }).waitFor();
  await button(mobile, 'Resume').tap();
  assert.equal(await mobile.locator('#stick').isVisible(), true);
  await mobile.close();
  assert.deepEqual(faults, []);

  const failure = await browser.newPage();
  const atlas = /\/assets\/actors-[^/]+\.png$/;
  await failure.route(atlas, route => route.fulfill({ status: 404 }));
  await failure.goto(url);
  await failure.getByRole('heading', { name: 'The garden could not load' }).waitFor();
  await failure.unroute(atlas);
  await button(failure, 'Retry').click();
  await button(failure, 'Start Run').waitFor();
  console.log('Chromium', await browser.version(), 'settings persistence, Web Audio unlock/mute, keyboard, 2-touch dash, pointer cancel, rotation, library return, asset recovery PASS');
} finally {
  await browser.close();
}
