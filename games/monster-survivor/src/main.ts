import './style.css';
import { enemies, garden, rules, skills, validateContent } from './content.ts';
import { GardenRun } from './slice.ts';
import { Clock, distance, heading } from './sim.ts';
import { Renderer, loadArt, skillIcon } from './render.ts';
import { Records } from './save.ts';
import { Sound } from './audio.ts';
import keyArt from '../assets/runtime/art/key-art.webp?url';

const game = document.querySelector<HTMLElement>('#game')!;
const board = document.querySelector<HTMLCanvasElement>('#board')!;
const screen = document.querySelector<HTMLElement>('#screen')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const touch = document.querySelector<HTMLElement>('#touch')!;
const stick = document.querySelector<HTMLElement>('#stick')!;
const knob = stick.querySelector<HTMLElement>('i')!;
const dashControl = document.querySelector<HTMLButtonElement>('#dash')!;
const coarse = matchMedia('(pointer: coarse)');
const portrait = matchMedia('(orientation: portrait)');
const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
const clock = new Clock();
const records = new Records(() => localStorage);
const sound = new Sound(records.data.settings);
const keys = new Set<string>();
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const library = '<a class="nav-link" href="../../#/">← Game Library</a>';

type Mode = 'loading' | 'title' | 'running' | 'reward' | 'paused' | 'settings' | 'guide' | 'result' | 'rotate' | 'confirm';
let mode: Mode = 'loading';
let run: GardenRun | null = null;
let renderer: Renderer;
let runId = '';
let settingsOrigin: 'title' | 'paused' = 'title';
let confirming: 'restart' | 'quit' = 'restart';
let dash = false;
let stickId: number | null = null;
let touchVector = { x: 0, y: 0 };
let inputAfter = 0;
let last = 0;
let dirty = true;
let renderedBuild = '';
let guidePage = 'Controls';
let eventText = '';
let eventUntil = 0;

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const time = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};
const fmt = (number: number) => Number(number.toFixed(2));
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
const focusable = 'button:not([disabled]), input:not([disabled]), a[href]';
const title = '<h1>Monster <span>Survivor</span></h1>';
const startLabel = 'Start Run';
const normalButton = (text: string, action: string, extra = '') =>
  `<button type="button" data-action="${action}" ${extra}>${text}</button>`;
const primary = (text: string, action: string) => normalButton(text, action, 'class="primary" data-focus');
const headingPanel = (name: string, body: string, extra = '') =>
  `<div class="panel ${extra}"><h2 id="screen-title">${name}</h2>${body}</div>`;

hud.innerHTML = `
  <div class="hud-top">
    <div class="hud-chip vitals"><div class="readout"><span>Wick</span><span id="health"></span></div><small id="guards" hidden></small><div class="meter hp"><span id="hp-fill"></span></div></div>
    <div class="hud-chip clock"><strong id="run-time">00:00</strong><small id="run-chapter">Bellgrave Garden</small></div>
    <div class="objective-stack">
      <div class="hud-chip objective"><span id="ward-arrow" aria-hidden="true">➜</span><div><b id="ward-title">Orchard Ward</b><small id="ward-info"></small></div></div>
      <button id="pause" type="button" aria-label="Pause" title="Pause (Esc)"><span class="pause-icon" aria-hidden="true"></span></button>
    </div>
  </div>
  <div class="hud-chip boss-meter" id="boss-meter" hidden>
    <div class="readout"><span>The Hollow Warden</span><span id="boss-phase"></span></div><div class="meter"><span id="boss-fill"></span></div>
  </div>
  <div id="run-hint" class="hud-chip" hidden></div>
  <div class="hud-bottom">
    <div class="hud-chip vitals"><div class="readout"><span id="level"></span><span id="xp"></span></div><div class="meter xp"><span id="xp-fill"></span></div></div>
    <div id="hud-build" aria-label="Current build"></div>
    <div class="hud-chip" id="dash-state"></div>
  </div>`;

function setText(id: string, value: string) {
  const node = get(id);
  if (node.textContent !== value) node.textContent = value;
}
function meter(id: string, ratio: number) { get(id).style.width = percent(Math.min(1, ratio)); }

const shortSynergies: Record<string, string> = {
  'wick-dart': 'Marks enemies for Prism Ring. At rank V it can evolve with Thread Lens II.',
  'prism-ring': '+9 damage when a blade hits a target marked by Wick Dart.',
  'bog-bloom': 'Lantern Oil widens pools. Root Charm extends the poison.',
  'thread-lens': 'Thread Lens II pairs with Wick Dart V for Comet Thread.',
  'lantern-oil': 'Widens Prism Ring, Bog Bloom and Comet Thread’s splash.',
  'root-charm': 'Keeps Bog Bloom pools and poison active longer.',
  'gale-laces': 'Move faster between the swarm and its fallen embers.',
  'comet-thread': 'The braided bolts still mark targets for Prism Ring.',
};
const cardNotes: Record<string, [string, string, string]> = {
  hearth: ['Hearth', '+10 maximum HP and heal 34 HP.', 'A second breath for the final fight.'],
  wind: ['Wind', '+8% move speed and −0.45 s dash cooldown.', 'More room to kite and dodge.'],
  gather: ['Gather', '+55 px pickup reach and +10% XP.', 'Collect from the edge of a swarm.'],
  patch: ['Patch', 'Restore 20 HP.', ''],
  haste: ['Haste', 'Cut the current dash cooldown by 0.35 s.', ''],
  'wick-oil': ['Wick Oil', '+3% damage, up to +15%.', ''],
  skip: ['Skip', 'Keep the current build.', ''],
  later: ['Later', 'Keep your catalyst for another draft.', ''],
};
function spellStats(id: string, rank: Record<string, number>) {
  switch (id) {
    case 'wick-dart': return `${rank.count} dart${rank.count === 1 ? '' : 's'} × ${rank.damage} damage every ${rank.intervalSec} s${rank.pierce ? ` · Pierce +${rank.pierce}` : ''}.`;
    case 'comet-thread': return `3 bolts × ${rank.damage} damage · ${rank.splashDamage} splash on final hit.`;
    case 'crown-of-glass': return `${rank.count} blades at ${rank.damage} damage · ${rank.pulseDamage} damage per full orbit.`;
    case 'green-midnight': return `${rank.tickDamage} damage per tick · ${percent(rank.moveSlow)} chill · poison spreads on a kill.`;
    case 'lantern-pack': return `${rank.count} familiars at ${rank.damage} damage · ${rank.dashBurstDamage} damage at the dash endpoint.`;
    case 'foxfire': return `${rank.count} familiar${rank.count === 1 ? '' : 's'} · ${rank.damage} damage per shot · ${rank.intervalSec} s recast.`;
    case 'hex-bell': return `${rank.damage} pulse damage · ${rank.radius} px radius · +35% against poisoned enemies.`;
    case 'mirror-ward': return `${rank.charges} guard · ${rank.rechargeSec} s recharge · ${rank.burstDamage} damage on block.`;
    case 'starfall': return `${rank.damage} impact damage · ${rank.radius} px radius · ${rank.delaySec} s tell.`;
    case 'heart-husk': return `+${rank.maxHpBonus} maximum HP · +${rank.pickupRadiusBonus} px ember reach.`;
    case 'prism-ring': return `${rank.count} orbiting blades · ${rank.damage} damage per hit · ${rank.radius} px orbit.`;
    case 'bog-bloom': return `${rank.tickDamage} damage per poison tick · ${rank.radius} px pool · ${rank.intervalSec} s recast.`;
    case 'gale-laces': return `+${percent(rank.speedBonus)} speed and −${rank.dashCooldownReductionSec} s dash cooldown.`;
    default: return `+${percent(Object.values(rank)[0] - 1)} ${id === 'thread-lens' ? 'spell damage' : id === 'lantern-oil' ? 'spell area' : 'status and bloom duration'}.`;
  }
}

function titleView() {
  return `<div class="title-shell">
    <img class="title-art" src="${keyArt}" alt="">
    <div class="title-content">
      <p class="eyebrow">Bellgrave Garden</p>${title}
      <p>Carry Wick’s lantern through the swarm. Rekindle two wards and defeat the Hollow Warden.</p>
      <div class="actions">${primary(startLabel, 'start')}${normalButton('Field Guide', 'guide')}${normalButton('Settings', 'settings')}</div>
      ${library}
    </div>
  </div>`;
}

function settingsView() {
  const settings = records.data.settings;
  const range = (id: 'master' | 'music' | 'sfx', label: string) =>
    `<label class="setting" for="set-${id}"><span>${label}</span><input id="set-${id}" name="${id}" type="range" min="0" max="1" step=".01" value="${settings[id]}"><output>${percent(settings[id])}</output></label>`;
  const check = (id: 'mute' | 'reducedMotion' | 'highContrast' | 'damageNumbers', label: string) =>
    `<label class="setting"><input name="${id}" type="checkbox" ${settings[id] ? 'checked' : ''}>${label}</label>`;
  return headingPanel('Settings', `
    <fieldset><legend>Audio</legend>
      ${range('master', 'Master volume')}${range('music', 'Music')}${range('sfx', 'Effects')}${check('mute', 'Mute audio')}
    </fieldset>
    <fieldset><legend>Display</legend>
      ${check('reducedMotion', 'Reduce motion')}${check('highContrast', 'High contrast')}${check('damageNumbers', 'Damage numbers')}
    </fieldset>
    ${records.data.cosmetics.unlocked.includes('dawn-scarf') ? `<fieldset><legend>Wick’s scarf</legend>
      ${normalButton('Original', 'scarf-original', `aria-pressed="${records.data.cosmetics.selected === ''}"`)}
      ${normalButton('Dawn Scarf', 'scarf-dawn', `aria-pressed="${records.data.cosmetics.selected === 'dawn-scarf'}"`)}
    </fieldset>` : ''}
    <p class="settings-note" id="storage-note" role="status">${records.status}</p>
    <div class="actions">${primary('Back', 'settings-back')}</div>`);
}

function guideView() {
  const known = new Set(records.data.discoveredSkillIds);
  const collection = [...skills.values()].map(skill => `<li><b>${skill.name}</b> · ${known.has(skill.id) ? skill.behavior
    : skill.recipe ? `Evolve ${skills.get(skill.recipe.active)!.name} V with ${skills.get(skill.recipe.passive)!.name} II and a catalyst.`
    : 'Learn this from an upgrade draft.'}</li>`).join('');
  const lifetime = records.data.lifetime;
  const data: Record<string, string> = {
    Controls: `<ul><li><b>Move</b> with WASD, arrows, or the touch joystick. <b>Dash</b> with Space.</li><li>Spells cast automatically. Sweep back over fallen monsters to collect their embers.</li><li>Stand inside any two ward circles for nine seconds each. After 12:00 the Warden can awaken. Finish the rites by 13:30 and defeat him by 15:30.</li><li>Defeat Thornback and Discord Bell to collect evolution catalysts.</li></ul>`,
    Threats: `<ul>${[...enemies.values()].map(enemy => `<li><b>${enemy.name}</b> · ${enemy.cue}</li>`).join('')}</ul>`,
    Spells: `<ul>${collection}</ul>`,
    Records: `<dl class="summary"><div><dt>Runs</dt><dd>${lifetime.runs}</dd></div><div><dt>Victories</dt><dd>${lifetime.wins}</dd></div><div><dt>Best clear</dt><dd>${lifetime.bestClearMs === null ? '—' : time(lifetime.bestClearMs / 1000)}</dd></div><div><dt>Longest run</dt><dd>${time(lifetime.longestMs / 1000)}</dd></div><div><dt>Record kills</dt><dd>${lifetime.recordKills}</dd></div></dl>
      <p>${records.data.cosmetics.unlocked.includes('dawn-scarf') ? 'Dawn Scarf unlocked. Equip it in Settings.' : 'Defeat the Hollow Warden to unlock the Dawn Scarf.'}</p>`,
  };
  return headingPanel('Field Guide', `
    <div class="guide-nav actions" aria-label="Guide topics">${Object.keys(data).map(name => normalButton(name, 'tab-' + name, `aria-pressed="${name === guidePage}"`)).join('')}</div>
    <div class="guide-tab">${data[guidePage]}</div><div class="actions">${primary('Back', 'title')}</div>`);
}

function rewardView() {
  const offer = run!.offer!;
  const headings = { level: 'Choose an upgrade', boon: 'Choose a ward boon', evolution: 'Evolve your lantern' };
  const lead = {
    level: `Level ${offer.level} · Choose one card.`,
    boon: `${run!.lastWard?.name ?? 'The ward'} is lit. Choose a boon for this run.`,
    evolution: `${run!.catalysts} catalyst${run!.catalysts === 1 ? '' : 's'} available · Replace one spell.`,
  };
  return headingPanel(headings[offer.kind], `
    <p>${lead[offer.kind]}</p>
    <div class="reward-cards">${offer.cards.map((id, i) => {
      const def = skills.get(id);
      const rank = (run!.build.get(id) ?? 0) + 1;
      const [name, details, synergy] = def
        ? [def.name, spellStats(id, def.ranks[rank - 1]), shortSynergies[id] ?? def.synergy]
        : cardNotes[id];
      const label = def ? (def.type === 'evolution' ? 'Evolution' : rank > 1 ? `Rank ${rank - 1} → ${rank}` : 'Learn · Rank 1') : '';
      return `<button type="button" class="card" data-card="${i}" ${i ? '' : 'data-focus'}>${def ? skillIcon(id) : ''}
        <kbd aria-hidden="true">${i + 1}</kbd><strong>${name}</strong>${label ? `<span class="rank">${label}</span>` : ''}
        <span class="detail">${details}</span>${synergy ? `<span class="synergy">${synergy}</span>` : ''}
      </button>`;
    }).join('')}</div>
    <div class="actions">
      ${offer.kind === 'level' && run!.picks >= 2 ? normalButton(`Reroll · ${run!.rerolls} left`, 'reroll', run!.rerolls ? '' : 'disabled') : ''}
      <span class="spacer"></span>${normalButton('Pause', 'pause')}
    </div>`, 'wide');
}

function resultView() {
  const active = run!;
  const copy = {
    victory: ['Garden rekindled', 'The Hollow Warden fell. Wick’s lantern lights the garden again.'],
    hp: ['The lantern went out', 'Wick ran out of health. Keep moving and dash through danger.'],
    rite: ['The wards fell silent', 'Two wards had to be rekindled by 13:30.'],
    time: ['The final toll', 'The Warden was still standing at 15:30.'],
  }[active.result!];
  return headingPanel(copy[0], `<p>${copy[1]}</p>
    <dl class="summary"><div><dt>Time</dt><dd>${time(active.elapsed)}</dd></div><div><dt>Monsters</dt><dd>${active.kills}</dd></div><div><dt>Ward rites</dt><dd>${active.rites}/${active.settings.ritesRequired}</dd></div></dl>
    <h3>Final build</h3>
    <div class="final-build">${[...active.build].map(([id, rank]) => {
      const damage = active.damage.get(skills.get(id)?.recipe?.active ?? id);
      return `<div><span>${skills.get(id)!.name} · R${rank}</span><span>${damage === undefined ? '' : `${damage.toLocaleString('en')} damage`}</span></div>`;
    }).join('')}</div>
    <div class="actions">${primary('Retry', 'start')}${normalButton('Title', 'title')}${library}</div>`);
}

function clearInput() {
  keys.clear();
  dash = false;
  const id = stickId;
  stickId = null;
  if (id !== null && stick.hasPointerCapture(id)) stick.releasePointerCapture(id);
  touchVector = { x: 0, y: 0 };
  knob.style.transform = '';
}

function view(next: Mode) {
  mode = next;
  clearInput();
  clock.reset();
  dirty = true;
  const overlay = run && !['title', 'guide', 'loading'].includes(next);
  game.dataset.view = next === 'running' ? 'arena' : next === 'title' || next === 'loading' ? 'title' : overlay ? 'overlay' : 'menu';
  screen.hidden = next === 'running';
  hud.hidden = !overlay;
  touch.hidden = !coarse.matches || next !== 'running';
  get<HTMLButtonElement>('pause').disabled = next !== 'running';
  screen.removeAttribute('role');
  screen.removeAttribute('aria-modal');
  screen.removeAttribute('aria-labelledby');
  if (next === 'title') screen.innerHTML = titleView();
  if (next === 'settings') screen.innerHTML = settingsView();
  if (next === 'guide') screen.innerHTML = guideView();
  if (next === 'reward') {
    screen.innerHTML = rewardView();
    inputAfter = performance.now() + 140;
  }
  if (next === 'paused') screen.innerHTML = headingPanel('Paused', `
    <p>Your run is frozen.</p><div class="actions">${primary('Resume', 'resume')}${normalButton('Settings', 'settings')}
    ${normalButton('Restart', 'restart')}${normalButton('Quit', 'quit')}</div>`);
  if (next === 'rotate') screen.innerHTML = headingPanel('Rotate to play', `
    <p>Use landscape orientation to see the garden and both controls.</p>
    <div class="actions">${primary(run ? 'Resume' : startLabel, run ? 'resume' : 'start')}${normalButton('Back', run ? 'pause' : 'title')}</div>`);
  if (next === 'confirm') screen.innerHTML = headingPanel(confirming === 'restart' ? 'Restart this run?' : 'Quit this run?', `
    <p>Your current run will end.</p><div class="actions">${primary('Cancel', 'pause')}${normalButton(confirming === 'restart' ? 'Restart' : 'Quit', 'confirm')}</div>`);
  if (next === 'result') screen.innerHTML = resultView();
  if (next === 'running') {
    screen.replaceChildren();
    game.focus({ preventScroll: true });
  } else {
    if (!['title', 'loading'].includes(next)) {
      screen.setAttribute('role', 'dialog');
      screen.setAttribute('aria-modal', 'true');
      screen.setAttribute('aria-labelledby', 'screen-title');
    }
    screen.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }
  const paused = next === 'paused' || next === 'confirm' || next === 'rotate' && Boolean(run) || next === 'settings' && Boolean(run);
  sound.suspend(paused);
  sound.apply(records.data.settings, next === 'reward' ? .42 : 1);
  renderHud();
}

function announce(text: string, duration = 300) {
  notice.textContent = text;
  eventText = text;
  eventUntil = (run?.tick ?? 0) + duration;
}

function start() {
  if (coarse.matches && portrait.matches) { view('rotate'); return; }
  run = new GardenRun(crypto.getRandomValues(new Uint32Array(1))[0]);
  runId = crypto.randomUUID();
  sound.clearEffects();
  sound.theme('through-the-garden');
  announce(coarse.matches ? 'Move with the joystick · Dash with your right thumb' : 'WASD or arrows to move · Space to dash', 365);
  view('running');
}
function backToTitle() {
  run = null;
  sound.clearEffects();
  sound.theme('moonlit-gate');
  view('title');
}
function resume() {
  if (coarse.matches && portrait.matches) { view('rotate'); return; }
  view(run?.offer ? 'reward' : 'running');
}
function select(index: number) {
  if (performance.now() < inputAfter) return;
  const id = run?.offer?.cards[index];
  if (!id || !run?.choose(id)) return;
  if (id === 'comet-thread') announce('Comet Thread evolved');
  if (run.picks === 1 && !run.wardComplete) announce('Follow the arrow to the nearest ward');
  view(run.offer ? 'reward' : 'running');
}
function finish() {
  records.finalize(run!, runId);
  sound.theme(null);
  sound.clearEffects();
  sound.play(run!.result === 'victory' ? 'win' : 'lose');
  notice.textContent = run!.result === 'victory' ? 'Victory. Garden rekindled.' : 'Run ended.';
  view('result');
}

screen.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!target) return;
  if (target.dataset.card !== undefined) { select(Number(target.dataset.card)); return; }
  const action = target.dataset.action;
  if (action === 'title') backToTitle();
  if (action === 'start') start();
  if (action === 'pause') view('paused');
  if (action === 'resume') resume();
  if (action === 'settings') { settingsOrigin = run ? 'paused' : 'title'; view('settings'); }
  if (action === 'settings-back') view(settingsOrigin);
  if (action === 'guide') view('guide');
  if (action?.startsWith('tab-')) {
    guidePage = action.slice(4);
    view('guide');
    screen.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
  }
  if (action === 'restart' || action === 'quit') { confirming = action; view('confirm'); }
  if (action === 'confirm') { if (confirming === 'restart') start(); else backToTitle(); }
  if (action === 'scarf-original' || action === 'scarf-dawn') {
    records.selectScarf(action === 'scarf-dawn' ? 'dawn-scarf' : '');
    applySettings();
    view('settings');
  }
  if (action === 'reroll') { run?.reroll(); view('reward'); }
});

screen.addEventListener('input', event => {
  if (mode !== 'settings' || !(event.target instanceof HTMLInputElement)) return;
  const input = event.target;
  const value = input.type === 'range' ? input.valueAsNumber : input.checked;
  records.update({ ...records.data.settings, [input.name]: value });
  if (typeof value === 'number') input.parentElement!.querySelector('output')!.textContent = percent(value);
  get('storage-note').textContent = records.status;
  applySettings();
});

function applySettings() {
  const s = records.data.settings;
  if (renderer) {
    renderer.motion = !s.reducedMotion && !systemReduced.matches;
    renderer.numbers = s.damageNumbers;
    renderer.contrast = s.highContrast;
    renderer.dawnScarf = records.data.cosmetics.selected === 'dawn-scarf';
  }
  game.classList.toggle('high-contrast', s.highContrast);
  sound.apply(s);
  dirty = true;
}

const focusPause = () => {
  if (mode === 'running' || mode === 'reward') view('paused');
};
get('pause').addEventListener('click', focusPause);
window.addEventListener('blur', focusPause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) focusPause();
});
window.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
window.addEventListener('keydown', event => {
  if (!event.repeat) sound.unlock();
  if (mode === 'running' && movementKeys.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
    return;
  }
  if (event.repeat) return;
  if (mode === 'running' && event.code === 'Space') {
    event.preventDefault();
    dash = true;
  }
  if (event.code === 'Escape') {
    if (mode === 'running' || mode === 'reward' || mode === 'confirm') view('paused');
    else if (mode === 'paused') resume();
    else if (mode === 'settings') view(settingsOrigin);
    else if (mode === 'guide' || mode === 'rotate' && !run) backToTitle();
    return;
  }
  if (mode === 'reward' && /^Digit[1-4]$/.test(event.code)) {
    event.preventDefault();
    select(Number(event.code.at(-1)) - 1);
    return;
  }
  if (mode === 'reward' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    const cards = [...screen.querySelectorAll<HTMLButtonElement>('.card')];
    const index = cards.indexOf(document.activeElement as HTMLButtonElement);
    const delta = ['ArrowRight', 'ArrowDown'].includes(event.code) ? 1 : -1;
    cards[(Math.max(0, index) + delta + cards.length) % cards.length]?.focus();
    event.preventDefault();
  }
  if (event.code === 'Tab' && screen.getAttribute('role') === 'dialog') {
    const targets = screen.querySelectorAll<HTMLElement>(focusable);
    const first = targets[0];
    const end = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { end?.focus(); event.preventDefault(); }
    if (!event.shiftKey && document.activeElement === end) { first?.focus(); event.preventDefault(); }
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
systemReduced.addEventListener('change', applySettings);
portrait.addEventListener('change', () => {
  if (mode === 'running' && coarse.matches && portrait.matches) view('rotate');
  else if (mode === 'rotate' && !portrait.matches) view(run ? 'paused' : 'title');
  dirty = true;
});

function slideStick(event: PointerEvent) {
  if (event.pointerId !== stickId) return;
  const rect = stick.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const magnitude = Math.hypot(x, y);
  const reach = Math.max(32, magnitude);
  touchVector = magnitude < 5 ? { x: 0, y: 0 } : { x: x / reach, y: y / reach };
  knob.style.transform = `translate(${touchVector.x * 30}px, ${touchVector.y * 30}px)`;
}
stick.addEventListener('pointerdown', event => {
  if (stickId !== null) return;
  stickId = event.pointerId;
  stick.setPointerCapture(stickId);
  slideStick(event);
});
stick.addEventListener('pointermove', slideStick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  stick.addEventListener(type, event => {
    if ((event as PointerEvent).pointerId !== stickId) return;
    stickId = null;
    touchVector = { x: 0, y: 0 };
    knob.style.transform = '';
  });
}
dashControl.addEventListener('pointerdown', event => {
  event.preventDefault();
  if (mode === 'running') dash = true;
});
dashControl.addEventListener('click', event => {
  if (event.detail === 0 && mode === 'running') dash = true;
});

function renderHud() {
  if (!run || hud.hidden) return;
  const { tick, player, boss } = run;
  game.dataset.state = mode;
  setText('health', `${player.hp} / ${player.maxHp} HP`);
  meter('hp-fill', player.hp / player.maxHp);
  setText('run-time', time(run.elapsed));
  setText('run-chapter', boss
    ? run.elapsed >= rules.normal.enrageSec ? `Final toll in ${time(Math.ceil(run.settings.hardLimitSec - run.elapsed))}` : 'Warden duel'
    : run.overrun ? `Overrun · ${time(Math.ceil(run.settings.riteDeadlineSec - run.elapsed))}` : 'Bellgrave Garden');
  setText('level', `Lv ${run.level}`);
  setText('xp', `${Math.floor(run.xp)} / ${run.xpGoal} XP`);
  meter('xp-fill', run.xp / run.xpGoal);
  const dashReady = tick >= run.dashReady;
  setText('dash-state', dashReady ? 'Dash ready' : `Dash ${((run.dashReady - tick) / 60).toFixed(1)} s`);
  dashControl.dataset.ready = String(dashReady);
  const ward = run.nearestWard;
  const arrow = get('ward-arrow');
  arrow.hidden = Boolean(boss);
  arrow.style.transform = ward ? `rotate(${heading(player, ward)}rad)` : '';
  arrow.textContent = ward ? '➜' : '✓';
  setText('ward-title', ward?.name ?? `Ward Rites ${run.rites} / ${run.settings.ritesRequired}`);
  setText('ward-info', ward
    ? distance(player, ward) <= ward.radius || ward.charge > 0
      ? `${fmt(ward.charge)} / ${run.settings.riteChargeSec} s · Rites ${run.rites}/2`
      : `${Math.round(distance(player, ward))} px · Rites ${run.rites}/2`
    : boss ? 'The Warden is awake' : 'Hold until 12:00');
  get('guards').hidden = !run.build.has('mirror-ward');
  setText('guards', `Guard ${run.guards}/${run.rank('mirror-ward').charges ?? 0}`);
  get('boss-meter').hidden = !boss;
  if (boss) {
    setText('boss-phase', ['Sentinel', 'Briar', 'Midnight'][boss.phase - 1]);
    meter('boss-fill', boss.hp / boss.maxHp);
  }
  const build = [...run.build].map(([id, rank]) => `${id}:${rank}`).join('/');
  if (build !== renderedBuild) {
    renderedBuild = build;
    get('hud-build').innerHTML = [...run.build].filter(([id]) => skills.get(id)?.type !== 'passive').map(([id, rank]) =>
      `<span class="hud-skill" title="${skills.get(id)!.name} · Rank ${rank}">${skillIcon(id)}<small>${rank}</small></span>`).join('');
  }
  const hint = get('run-hint');
  hint.hidden = tick >= eventUntil || mode !== 'running';
  if (!hint.hidden) setText('run-hint', eventText);
}

function frame(now: number) {
  if (run && mode === 'running') {
    const axis = (one: string, two: string) => Number(keys.has(one) || keys.has(two));
    clock.advance((now - last) / 1000, () => {
      run!.step({
        x: Math.max(-1, Math.min(1, axis('KeyD', 'ArrowRight') - axis('KeyA', 'ArrowLeft') + touchVector.x)),
        y: Math.max(-1, Math.min(1, axis('KeyS', 'ArrowDown') - axis('KeyW', 'ArrowUp') + touchVector.y)),
        dash,
      });
      dash = false;
      dirty = true;
      if (run!.result) { finish(); return false; }
      if (run!.offer) { view('reward'); return false; }
      return true;
    });
  }
  last = now;
  if (run && dirty) {
    const cues = run.cues.splice(0);
    for (const cue of cues) {
      if (cue.id === 'boss-arrival') {
        announce('The Hollow Warden awakens');
        sound.theme('warden-toll');
      }
      if (cue.id === 'boss-phase') announce(run.boss?.phase === 3 ? 'Midnight · Watch for the second toll' : 'Briar · Find the gap between lanes', 210);
      if (cue.id === 'elite') announce(`${run.elite?.def.name ?? 'Elite'} · Defeat it for a catalyst`);
      if (cue.id === 'ward') announce(`${run.lastWard?.name ?? 'Ward'} rekindled`);
      sound.play(cue.id);
    }
    renderer.draw(run, cues);
    renderHud();
    dirty = false;
  }
  requestAnimationFrame(frame);
}

async function boot() {
  mode = 'loading';
  game.dataset.view = 'title';
  screen.innerHTML = `<div class="title-shell"><img class="title-art" src="${keyArt}" alt=""><div class="title-content">${title}<p role="status">Opening Bellgrave Garden…</p></div></div>`;
  try {
    validateContent();
    const art = await loadArt();
    const expected = garden.logicalView;
    if (expected[0] !== board.width || expected[1] !== board.height) throw new Error('Invalid view dimensions');
    renderer = new Renderer(board, art);
    applySettings();
    sound.theme('moonlit-gate');
    view('title');
    requestAnimationFrame(frame);
  } catch {
    screen.innerHTML = headingPanel('The garden could not load', '<p>Check the connection and retry loading the garden artwork.</p><div class="actions">' + primary('Retry', 'load') + library + '</div>');
    screen.querySelector('button')!.onclick = () => { void boot(); };
    screen.querySelector('button')!.focus();
  }
}
void boot();
