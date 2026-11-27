import './style.css';
import { classicLevels, expansionLevels, fernlight, levels, type Level } from './level.ts';
import { SaveStore } from './save.ts';
import { campaignPreview } from './preview.ts';
import { mountTrail } from './trail-scene.ts';
import { STEP_MS, type Result, type Session } from './session.ts';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing game element: ${id}`);
  return node as T;
}

const panel = element<HTMLDialogElement>('panel');
const world = element('world');
const playfield = element('playfield');
const hud = element('hud');
const hearts = element('hearts');
const seeds = element('seeds');
const fireflies = element('fireflies');
const hint = element('hint');
const notice = element('notice');
const chapterName = element('chapter-name');
const pauseButton = element<HTMLButtonElement>('pause');
const studio = '../../#/';
const jumpKeys = new Set(['Space', 'ArrowUp', 'KeyW']);
const movementKeys = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', ...jumpKeys]);
const held = new Set<string>();
let jumpPressed = false;
let currentLevel = fernlight;
const playable = campaignPreview ? levels : [fernlight];
let screen: 'loading' | 'menu' | 'playing' | 'paused' | 'restart' | 'results' | 'settings' | 'error' = 'loading';

function resetInput() {
  held.clear();
  jumpPressed = false;
}

function jumpDown() {
  return held.has('Space') || held.has('ArrowUp') || held.has('KeyW');
}

function display(title: string, text: string, actions: { label: string; run: () => void }[], chapter = '', content?: HTMLElement) {
  panel.dataset.screen = screen;
  panel.replaceChildren();
  if (chapter) {
    const line = document.createElement('p');
    line.className = 'location';
    line.textContent = chapter;
    panel.append(line);
  }
  const heading = document.createElement('h1');
  heading.id = 'panel-title';
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.textContent = text;
  panel.append(heading, copy);
  if (screen === 'menu') {
    const keyboardNote = document.createElement('p');
    keyboardNote.className = 'keyboard-note';
    keyboardNote.textContent = 'Play with a keyboard in landscape.';
    panel.append(keyboardNote);
  }
  if (content) panel.append(content);
  if (save.unavailable && campaignPreview) {
    const warning = document.createElement('p');
    warning.className = 'storage-note';
    warning.textContent = 'Progress and settings can only be kept until this tab reloads.';
    panel.append(warning);
  }
  const group = document.createElement('div');
  group.className = 'actions';
  for (const { label, run } of actions) {
    const button = document.createElement('button');
    button.textContent = label;
    if (label === 'Settings') button.dataset.settings = '';
    button.type = 'button';
    button.addEventListener('pointerenter', () => audio?.effect('hover'));
    button.addEventListener('click', () => {
      audio?.effect('confirm');
      run();
    });
    group.append(button);
  }
  const back = document.createElement('a');
  back.href = studio;
  back.textContent = 'Back to Studio';
  group.append(back);
  panel.append(group);
  if (!panel.open) panel.showModal();
  (content?.querySelector('input') ?? group.querySelector('button') ?? back).focus();
}

function write(node: HTMLElement, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

function describe(session: Session) {
  if (session.phase === 'recovering') return session.checkpoint ? 'Back to the lantern' : 'Back to the trailhead';
  if (session.atGate && !session.gateOpen) return `Heartseeds needed: ${3 - session.seeds.size}`;
  if (session.gateOpen) return 'Portal open. Reach the gate.';
  if (session.level === fernlight && session.player.x >= 205 && session.player.x <= 432 && session.seeds.size === 0) return 'Hold Jump to go higher.';
  return '';
}

function time(ticks: number) {
  return (ticks * STEP_MS / 1000).toFixed(1) + ' s';
}

function showResults(result: Result) {
  screen = 'results';
  hud.hidden = true;
  resetInput();
  trail.setRunning(false);
  audio?.setActive(false, true);
  const next = playable[playable.indexOf(currentLevel) + 1];
  const classicFinale = campaignPreview && currentLevel === classicLevels.at(-1);
  const finale = campaignPreview && currentLevel === expansionLevels.at(-1);
  const run = `${time(result.ticks)} · ${result.fireflies}/8 fireflies · ${result.deaths} ${result.deaths === 1 ? 'fall or defeat' : 'falls or defeats'}`;
  const summary = [run];
  if (result.fireflies === 8) summary.push('Firefly stamp');
  if (result.flawless) summary.push('Flawless');
  const actions = next ? [{ label: 'Next Trail', run: () => start(next) }] : [];
  actions.push({ label: 'Replay', run: () => start(currentLevel) });
  let record: HTMLElement | undefined;
  if (campaignPreview) {
    save.record(currentLevel.id, result, next?.id);
    const best = save.data.bestByLevel[currentLevel.id];
    record = document.createElement('p');
    record.className = 'record';
    if (best) record.textContent = `Best time ${time(best.ticks)} · Best fireflies ${best.fireflies}/8`;
    actions.push({ label: 'Trail selection', run: chooseTrail });
    if (classicFinale || finale) {
      const ending = document.createElement('p');
      ending.textContent = finale
        ? 'Pip returned the last Heartseeds and explored every trail.'
        : 'Pip returned the Heartseeds. Light has come back to the forest.';
      const finaleDetails = document.createElement('div');
      finaleDetails.append(ending, record);
      record = finaleDetails;
    }
  }
  const title = finale ? 'Forest Adventure complete' : classicFinale ? 'The Lantern Oak wakes' : 'Trail cleared';
  display(title, summary.join(' · '), actions, currentLevel.name, record);
}

const [previewArt, audioModule] = campaignPreview
  ? await Promise.all([import('./preview-art.ts').then(module => module.art), import('./audio.ts').catch(() => undefined)])
  : [undefined, undefined];
if (previewArt) {
  document.documentElement.style.setProperty('--panel-art', `url("${previewArt.panel}")`);
  document.documentElement.style.setProperty('--hud-art', `url("${previewArt.hud}")`);
}
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const save = new SaveStore(
  playable.map(({ id }) => id),
  motionPreference.matches,
  undefined,
  campaignPreview ? classicLevels.map(({ id }) => id) : undefined,
);
function applyMotionPreference() {
  document.documentElement.dataset.reducedMotion = String(campaignPreview ? save.data.settings.reducedMotion : motionPreference.matches);
}
applyMotionPreference();
motionPreference.addEventListener('change', applyMotionPreference);

const audio = audioModule ? new audioModule.TrailAudio(save.data.settings) : undefined;

function menu() {
  screen = 'menu';
  const unlocked = playable.filter(({ id }) => save.data.unlockedLevelIds.includes(id));
  const latest = unlocked.at(-1) ?? fernlight;
  const actions = [{ label: latest === fernlight ? 'Play' : 'Continue', run: () => start(latest) }];
  if (unlocked.length > 1) actions.push({ label: 'Choose a trail', run: chooseTrail });
  display('Forest Adventure',
    'The Lantern Oak has gone dark. Help Pip collect three Heartseeds to open each portal. Move with A/D or ←/→. Jump with Space, W or ↑. Pause with Esc.',
    [...actions, ...settingsAction(menu)], latest.name);
}

function chooseTrail() {
  screen = 'menu';
  const actions = playable
    .filter(({ id }) => save.data.unlockedLevelIds.includes(id))
    .map((level) => ({ label: level.name, run: () => start(level) }));
  display('Choose a trail', 'Return to a trail to look for more fireflies or beat your best time.',
    [...actions, { label: 'Title screen', run: menu }]);
}

function settingsAction(back: () => void) {
  return campaignPreview ? [{ label: 'Settings', run: () => showSettings(back) }] : [];
}

function showSettings(back: () => void) {
  screen = 'settings';
  closeSettings = back;
  const settings = save.data.settings;
  const controls = document.createElement('div');
  controls.className = 'settings';
  for (const [key, name] of [['master', 'Master volume'], ['music', 'Music volume'], ['sfx', 'Effects volume']] as const) {
    const label = document.createElement('label');
    const slider = document.createElement('input');
    const amount = document.createElement('span');
    amount.setAttribute('aria-hidden', 'true');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(settings[key] * 100));
    amount.textContent = slider.value + '%';
    slider.setAttribute('aria-label', name);
    slider.addEventListener('input', () => {
      settings[key] = slider.valueAsNumber / 100;
      amount.textContent = slider.value + '%';
      audio?.applySettings();
    });
    slider.addEventListener('change', () => save.persist());
    label.append(name, slider, amount);
    controls.append(label);
  }
  for (const [key, name] of [['muted', 'Mute audio'], ['reducedMotion', 'Reduced motion']] as const) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => {
      settings[key] = checkbox.checked;
      audio?.applySettings();
      applyMotionPreference();
      save.persist();
    });
    label.append(checkbox, name);
    controls.append(label);
  }
  display('Settings', 'Audio and motion preferences are saved on this device.', [{ label: 'Done', run: leaveSettings }], '', controls);
}

let closeSettings = menu;

function leaveSettings() {
  closeSettings();
  panel.querySelector<HTMLButtonElement>('button[data-settings]')?.focus();
}
const trail = mountTrail(world, {
  reducedMotion: () => campaignPreview ? save.data.settings.reducedMotion : motionPreference.matches,
  sampleInput() {
    const input = {
      left: held.has('KeyA') || held.has('ArrowLeft'),
      right: held.has('KeyD') || held.has('ArrowRight'),
      jump: jumpDown(),
      pressedJump: jumpPressed,
    };
    jumpPressed = false;
    return input;
  },
  onReady: menu,
  onLoadError() {
    screen = 'error';
    display('Trail could not load', 'Some game files could not be loaded. Check the connection and try again.',
      [{ label: 'Retry', run: () => location.reload() }]);
  },
  onStep(session, events) {
    audio?.onEvents(events);
    write(hearts, `Hearts ${session.hearts}/3`);
    write(seeds, `Heartseeds ${session.seeds.size}/3`);
    write(fireflies, `Fireflies ${session.fireflies.size}/8`);
    write(hint, describe(session));
    hearts.classList.toggle('empty', session.hearts === 0);
    seeds.classList.toggle('empty', session.seeds.size === 0);
    if (events.includes('seedCollected')) {
      seeds.dataset.charged = String(session.gateOpen);
    }
    if (session.phase === 'recovering' && (events.includes('fall') || events.includes('healthChanged'))) {
      write(notice, describe(session));
    } else if (events.includes('respawn')) write(notice, 'Pip is ready. All hearts restored.');
    else if (events.includes('gateOpened')) write(notice, 'The portal is open.');
    else if (events.includes('lanternLit')) write(notice, 'Checkpoint lit.');
    else if (events.includes('seedCollected')) write(notice, seeds.textContent ?? '');
    else if (events.includes('fireflyCollected')) write(notice, fireflies.textContent ?? '');
    else if (events.includes('healthChanged')) write(notice, hearts.textContent ?? '');
    if (session.result) showResults(session.result);
  },
}, previewArt);

function enterGame() {
  screen = 'playing';
  resetInput();
  panel.close();
  hud.hidden = false;
  playfield.focus();
}

function start(level: Level) {
  audio?.unlock();
  if (!trail.needsBackdrop(level)) {
    beginAttempt(level);
    return;
  }
  screen = 'loading';
  hud.hidden = true;
  display('Entering the trail', 'Loading the trail…', [], level.name);
  void trail.loadBackdrop(level).then(() => {
    beginAttempt(level);
    if (document.hidden || !document.hasFocus()) pause();
  }, () => {
    screen = 'error';
    display('Trail could not load', 'The trail backdrop could not be loaded. Check the connection and try again.',
      [{ label: 'Retry', run: () => start(level) }, { label: 'Trail selection', run: chooseTrail }], level.name);
  });
}

function beginAttempt(level: Level) {
  currentLevel = level;
  chapterName.textContent = level.name;
  playfield.setAttribute('aria-label', `${level.name} playfield`);
  audio?.stopEffects();
  audio?.playLevel(level.backdrop === 'oak');
  enterGame();
  write(notice, '');
  seeds.dataset.charged = 'false';
  trail.startAttempt(level);
}

function resume() {
  enterGame();
  trail.setRunning(true);
  audio?.unlock();
  audio?.setActive(true);
  audio?.effect('resume');
}

function pause() {
  if (screen !== 'playing') return;
  screen = 'paused';
  resetInput();
  trail.setRunning(false);
  audio?.setActive(false);
  display('Paused', 'Resume when you’re ready. Press R here to restart.',
    [{ label: 'Resume', run: resume }, { label: 'Restart', run: confirmRestart }, ...settingsAction(pauseFromConfirmation)], currentLevel.name);
}

function confirmRestart() {
  screen = 'restart';
  display('Restart trail?', 'This clears your current attempt.',
    [{ label: 'Cancel', run: pauseFromConfirmation }, { label: 'Start over', run: () => start(currentLevel) }]);
}

function pauseFromConfirmation() {
  screen = 'playing';
  pause();
}

pauseButton.addEventListener('click', pause);
world.addEventListener('click', () => {
  if (screen === 'playing') playfield.focus();
});
panel.addEventListener('cancel', (event) => event.preventDefault());
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

window.addEventListener('keydown', (event) => {
  if (screen === 'settings' && event.code === 'Escape' && !event.repeat) {
    event.preventDefault();
    leaveSettings();
    return;
  }
  if (screen === 'paused' && event.code === 'KeyR' && !event.repeat) {
    event.preventDefault();
    confirmRestart();
    return;
  }
  if (screen !== 'playing') return;
  if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
    event.preventDefault();
    pause();
    return;
  }
  if (document.activeElement !== playfield || !movementKeys.has(event.code)) return;
  event.preventDefault();
  if (event.repeat) return;
  if (jumpKeys.has(event.code) && !jumpDown()) jumpPressed = true;
  held.add(event.code);
});

window.addEventListener('keyup', (event) => {
  if (held.delete(event.code)) event.preventDefault();
});
playfield.addEventListener('blur', resetInput);

if (screen === 'loading') display('Entering Fernlight Trail', 'Loading the trail…', []);
