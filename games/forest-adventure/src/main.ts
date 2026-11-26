import './style.css';
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
const pauseButton = element<HTMLButtonElement>('pause');
const studio = '../../#/';
const jumpKeys = new Set(['Space', 'ArrowUp', 'KeyW']);
const movementKeys = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', ...jumpKeys]);
const held = new Set<string>();
let jumpPressed = false;
let screen: 'loading' | 'menu' | 'playing' | 'paused' | 'restart' | 'results' | 'error' = 'loading';

function resetInput() {
  held.clear();
  jumpPressed = false;
}

function jumpDown() {
  return held.has('Space') || held.has('ArrowUp') || held.has('KeyW');
}

function display(title: string, text: string, actions: { label: string; run: () => void }[], chapter = '') {
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
  const group = document.createElement('div');
  group.className = 'actions';
  for (const { label, run } of actions) {
    const button = document.createElement('button');
    button.textContent = label;
    button.type = 'button';
    button.addEventListener('click', run);
    group.append(button);
  }
  const back = document.createElement('a');
  back.href = studio;
  back.textContent = 'Back to Studio';
  group.append(back);
  panel.append(group);
  if (!panel.open) panel.showModal();
  (group.querySelector('button') ?? back).focus();
}

function write(node: HTMLElement, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

function describe(session: Session) {
  if (session.phase === 'recovering') return session.checkpoint ? 'Back to the lantern' : 'Back to the trailhead';
  if (session.atGate && !session.gateOpen) return `Heartseeds needed: ${3 - session.seeds.size}`;
  if (session.gateOpen) return 'Portal open. Reach the gate.';
  if (session.player.x >= 205 && session.player.x <= 432 && session.seeds.size === 0) return 'Hold Jump to go higher.';
  return '';
}

function showResults(result: Result) {
  screen = 'results';
  hud.hidden = true;
  resetInput();
  trail.setRunning(false);
  const seconds = (result.ticks * STEP_MS / 1000).toFixed(1);
  const run = `${seconds} s · ${result.fireflies}/8 fireflies · ${result.deaths} ${result.deaths === 1 ? 'fall or defeat' : 'falls or defeats'}`;
  display('Trail cleared', result.flawless ? `${run} · Flawless` : run, [{ label: 'Replay', run: start }], 'Fernlight Trail');
}

const trail = mountTrail(world, {
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
  onReady() {
    screen = 'menu';
    display('Forest Adventure',
      'The Lantern Oak has gone dark. Help Pip collect three Heartseeds to open the portal. Move with A/D or ←/→. Jump with Space, W or ↑. Pause with Esc.',
      [{ label: 'Play', run: start }], 'Fernlight Trail');
  },
  onLoadError() {
    screen = 'error';
    display('Trail could not load', 'Some game files could not be loaded. Check the connection and try again.',
      [{ label: 'Retry', run: () => location.reload() }]);
  },
  onStep(session, events) {
    write(hearts, `Hearts ${session.hearts}/3`);
    write(seeds, `Heartseeds ${session.seeds.size}/3`);
    write(fireflies, `Fireflies ${session.fireflies.size}/8`);
    write(hint, describe(session));
    if (session.phase === 'recovering' && (events.includes('fall') || events.includes('healthChanged'))) {
      write(notice, describe(session));
    } else if (events.includes('gateOpened')) write(notice, 'The portal is open.');
    else if (events.includes('lanternLit')) write(notice, 'Checkpoint lit.');
    else if (events.includes('seedCollected')) write(notice, seeds.textContent ?? '');
    else if (events.includes('fireflyCollected')) write(notice, fireflies.textContent ?? '');
    else if (events.includes('healthChanged')) write(notice, hearts.textContent ?? '');
    if (session.result) showResults(session.result);
  },
});

function enterGame() {
  screen = 'playing';
  resetInput();
  panel.close();
  hud.hidden = false;
  playfield.focus();
}

function start() {
  enterGame();
  write(notice, '');
  trail.startAttempt();
}

function resume() {
  enterGame();
  trail.setRunning(true);
}

function pause() {
  if (screen !== 'playing') return;
  screen = 'paused';
  resetInput();
  trail.setRunning(false);
  display('Paused', 'Resume when you’re ready. Press R here to restart.',
    [{ label: 'Resume', run: resume }, { label: 'Restart', run: confirmRestart }], 'Fernlight Trail');
}

function confirmRestart() {
  screen = 'restart';
  display('Restart trail?', 'This clears your current attempt.',
    [{ label: 'Keep playing', run: pauseFromConfirmation }, { label: 'Start over', run: start }]);
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
