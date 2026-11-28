import { cardDescription, COLUMNS, HZ, LANES, levels, roles } from './content.js';
import type { Campaign, CardId, Content, LevelId } from './content.js';
import { Garden } from './simulation.js';
import type { Command, Cue } from './simulation.js';
import { loadArena, Painter } from './renderer.js';
import { Save } from './save.js';
import { Sound } from './audio.js';
import { FieldGuide } from './guide.js';
import { drawPose, loadMotion } from './motion.js';

const app = document.querySelector<HTMLElement>('#app')!;
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const announce = document.querySelector<HTMLParagraphElement>('#announce')!;
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const seconds = (ticks: number) => Math.max(0, Math.ceil(ticks / HZ));
const clock = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const renderText = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };

const save = new Save();
const sound = new Sound(save.settings);
const stages = {
  raincourt: {
    beat: 'Giữ đèn lên', description: 'Trồng Dương Xỉ, nhặt Ánh Hạt rồi mở Lan Sét ở đợt 3.',
    tip: 'Đặt Dương Xỉ ở luống có cờ để đón nhóm đầu.',
  },
  'pump-gallery': {
    beat: 'Bơm chạy lại', description: 'Giữ thế trận khi van bơm gặp sự cố.',
    tip: 'Khi van báo đóng, chuyển nước sang luống khác. Dùng Rêu Thành giữ chân địch để Dương Xỉ bắn qua giáp.',
  },
  'lightning-dome': {
    beat: 'Hạt Tim nảy mầm', description: 'Đón Thợ Vườn Gốm trên mái nhà kính.',
    tip: 'Đợi Thợ Vườn Gốm đánh dấu luống rồi đổi hướng nước. Dùng Lựu Cầu Chì khi địch đi sát nhau.',
  },
} satisfies Record<LevelId, { beat: string; description: string; tip: string }>;

let view: 'title' | 'map' | 'play' | 'ending' = 'title';
let campaign: Campaign;
let content: Content;
const arenaPromises = new Map<LevelId, ReturnType<typeof loadArena>>();
let activeTip = '';
let guide: FieldGuide | undefined;
let guideOrigin: HTMLElement | null = null;
let guideFocus: HTMLElement | null = null;
let guideFromPause = false;
let endingFrame = 0;
const introduced = new Set<LevelId>();
let garden: Garden | undefined;
let painter: Painter | undefined;
let selection: CardId | 'remove' | null = null;
let focusTile = 0;
let selectedTile: number | null = null;
let previous: HTMLElement | null = null;
let paused = false;
let busy = false;
let animation = 0;
let lastFrame = 0;
let accumulated = 0;
let lastFeedback = '';
let cardNodes: HTMLButtonElement[] = [];
let valveNodes: HTMLButtonElement[] = [];
let tileNodes: HTMLButtonElement[] = [];
let tokenNodes = new Map<number, HTMLButtonElement>();
let tutorialStep: 'plant' | 'drop' | 'done' = 'done';
let lastResultFrame = 0;
let resultMotion = 0;
let collectedAt = -Infinity;
let collectedAmount = 0;
let lastCreditAnnouncement = -Infinity;

const icon = (name: string) => `<img class="icon" src="./art/retro/icons/${name}.webp" alt="">`;
const guidePath = '#so-tay';
const inGuide = () => location.hash === guidePath || location.hash.startsWith(guidePath + '/');

function showGuide(id?: CardId) {
  if (guide) return;
  guideFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  guideFromPause = dialog.open && guideFocus?.id === 'pause-guide';
  history.pushState({}, '', guidePath + '/plants' + (id ? '/' + id : ''));
  mountGuide();
}

function mountGuide() {
  if (guide) { guide.route(); return; }
  guideOrigin = app.firstElementChild as HTMLElement | null;
  if (garden && !garden.result) {
    closeDialog();
    pause();
  }
  if (guideOrigin) guideOrigin.hidden = true;
  guide = new FieldGuide(() => {
    history.pushState({}, '', location.pathname + location.search);
    dismissGuide();
  }, () => save.settings.reduced);
  app.append(guide.node);
  document.title = 'Sổ tay Nhà Kính';
  void guide.open();
}

function dismissGuide() {
  if (!guide) return;
  guide.close();
  guide = undefined;
  if (guideOrigin) guideOrigin.hidden = false;
  document.title = 'Nhà Kính Sau Nửa Đêm';
  if (garden && !garden.result) {
    pauseMenu();
    if (guideFromPause) byId('pause-guide').focus();
  } else if (guideFocus?.isConnected) guideFocus.focus();
  else head();
  guideOrigin = null;
  guideFocus = null;
  guideFromPause = false;
}

window.addEventListener('hashchange', () => {
  if (!campaign) return;
  if (inGuide()) mountGuide();
  else dismissGuide();
});

function head() { app.querySelector<HTMLElement>('h1')?.focus(); }
function storageMessage() { return save.unavailable ? 'Trình duyệt đang chặn lưu. Tiến độ chỉ giữ trong phiên này.' : ''; }

function leaveBoard() {
  cancelAnimationFrame(animation);
  cancelAnimationFrame(endingFrame);
  garden = undefined;
  painter = undefined;
  paused = false;
  tokenNodes.clear();
  sound.clearVoices();
  sound.setScene('off');
  sound.setPaused(false);
}

function title() {
  leaveBoard();
  view = 'title';
  app.innerHTML = `<section class="hero">
    <img class="hero-art" src="./cover.webp" alt="">
    <div class="hero-page">
      <h1 tabindex="-1">Nhà Kính<br>Sau Nửa Đêm</h1>
      <p>Chăm cây và giữ Hạt Tim qua ba ca trực.</p>
      <button id="enter" class="primary">Chơi</button>
      <div class="actions"><button id="choose-stage" class="secondary">Chọn màn</button>
        <button id="title-guide" class="secondary">Sổ tay</button></div>
    </div></section>`;
  byId('enter').onclick = () => {
    const next = levels.find((id) => save.unlocked(id) && !save.record(id) && !save.legacy(id));
    if (next) enterStage(next);
    else map();
  };
  byId('choose-stage').onclick = map;
  byId('title-guide').onclick = () => showGuide();
  head();
}

function map() {
  leaveBoard();
  view = 'map';
  app.innerHTML = `<section class="map"><header class="map-header">
    <div><h1 tabindex="-1">Bản đồ nhà kính</h1><button id="map-guide" class="secondary">Sổ tay</button></div>
  </header><div class="stage-list">${levels.map((id, index) => {
      const { level, arena } = campaign[id];
      const record = save.record(id);
      const old = save.legacy(id);
      const available = save.unlocked(id);
      return `<article class="stage ${available ? 'playable' : 'locked'}">
        <img src="./art/${arena.boardAsset}" alt="">
        <p class="kicker">Màn ${index + 1} · ${record || old ? 'Đã qua' : available ? 'Có thể chơi' : 'Chưa mở'}</p>
        <h2>${level.title}</h2><p>${stages[id].description}</p>
        ${record ? `<p aria-label="${record.stars} sao"> ${'★'.repeat(record.stars)} · Nhanh nhất ${clock(Math.round(record.fastest))}</p>` : ''}
        ${old ? `<details><summary>Kỷ lục cũ</summary><p>${old.stars} sao · ${clock(Math.round(old.fastest))}</p></details>` : ''}
        ${available ? `<button data-stage="${id}" class="primary">${record || old ? 'Chơi lại' : 'Chơi'} ${level.title}</button>`
          : `<p>Hoàn thành ${campaign[levels[index - 1]].level.title} để mở.</p>`}
      </article>`;
    }).join('')}</div>
    <p class="map-note">${storageMessage()}</p></section>`;
  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-stage]')) {
    button.onclick = () => enterStage(button.dataset.stage as LevelId);
  }
  byId('map-guide').onclick = () => showGuide();
  head();
}

function enterStage(id: LevelId) {
  if (busy || !save.unlocked(id)) return;
  content = campaign[id];
  void start();
}

function getArena(stage: Content) {
  const id = stage.level.id;
  let promise = arenaPromises.get(id);
  if (!promise) {
    promise = loadArena(stage).catch((error: unknown) => {
      arenaPromises.delete(id);
      throw error;
    });
    arenaPromises.set(id, promise);
  }
  return promise;
}

function openDialog(title: string, body: string, bind: () => void, lock = false) {
  if (!dialog.open) previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (garden && !garden.result) pause();
  dialog.innerHTML = `<h2 id="dialog-title" tabindex="-1">${title}</h2>${body}`;
  if (!dialog.open) dialog.showModal();
  dialog.dataset.lock = String(lock);
  byId('dialog-title').focus();
  bind();
}

function closeDialog() {
  if (!dialog.open) return;
  dialog.close();
  previous?.focus();
  previous = null;
}

function pause() {
  paused = true;
  sound.setPaused(true);
  if (view === 'play') byId('pause').textContent = 'Tiếp tục';
}

function resume() {
  closeDialog();
  paused = false;
  lastFrame = 0;
  accumulated = 0;
  if (view === 'play') byId('pause').textContent = 'Tạm dừng';
  sound.setPaused(false);
}

function pauseMenu() {
  if (!garden || garden.result || dialog.open) return;
  openDialog('Ca trực tạm dừng', `<div class="actions">
    <button id="resume" class="primary">Tiếp tục</button><button id="pause-guide" class="secondary">Sổ tay</button><button id="return-map" class="secondary">Về bản đồ</button>
  </div>`, () => {
    byId('resume').onclick = resume;
    byId('pause-guide').onclick = () => showGuide();
    byId('return-map').onclick = confirmExit;
  });
}

function confirmExit() {
  if (!garden || garden.result) { closeDialog(); map(); return; }
  openDialog('Rời ca trực?', '<p>Lần chơi hiện tại sẽ kết thúc.</p><div class="actions"><button id="stay" class="primary">Tiếp tục ca trực</button><button id="leave" class="secondary">Về bản đồ</button></div>', () => {
    byId('stay').onclick = resume;
    byId('leave').onclick = () => { closeDialog(); map(); };
  });
}

function settings() {
  if (dialog.open) return;
  openDialog('Cài đặt', `<div class="mixer">
    ${([['master', 'Âm lượng'], ['music', 'Nhạc và mưa'], ['sfx', 'Hiệu ứng']] as const).map(([key, label]) =>
      `<label class="slider">${label}<input id="mix-${key}" type="range" min="0" max="100" value="${Math.round(save.settings[key] * 100)}"></label>`).join('')}
    <label class="toggle"><input id="mix-mute" type="checkbox" ${save.settings.mute ? 'checked' : ''}>Tắt tiếng</label>
    <label class="toggle"><input id="mix-reduced" type="checkbox" ${save.settings.reduced ? 'checked' : ''}>Giảm chuyển động</label>
    <p id="save-status">${storageMessage()}</p>
    <div class="actions"><button id="settings-done" class="primary">Xong</button></div></div>`, () => {
    const changed = () => {
      save.storeSettings();
      renderText(byId('save-status'), storageMessage());
      sound.sync();
    };
    for (const key of ['master', 'music', 'sfx'] as const) {
      const input = byId<HTMLInputElement>('mix-' + key);
      input.oninput = () => { save.settings[key] = input.valueAsNumber / 100; changed(); };
    }
    for (const key of ['mute', 'reduced'] as const) {
      const input = byId<HTMLInputElement>('mix-' + key);
      input.onchange = () => { save.settings[key] = input.checked; changed(); };
    }
    byId('settings-done').onclick = () => { if (guide) closeDialog(); else resume(); };
  });
}

function boardMarkup() {
  const arena = content.arena;
  const percent = (value: number) => (value * 100).toFixed(5) + '%';
  return `<div class="board-layer"><canvas aria-hidden="true"></canvas>
    ${Array.from({ length: LANES }, (_, lane) => {
      const top = arena.visualRowEdges[lane];
      const bottom = arena.visualRowEdges[lane + 1];
      return `${content.level.waterEnabled ? `<button class="valve" aria-pressed="false" style="top:${percent((top + bottom) / 2)};left:${percent(arena.valveX)}">${icon('valve')}${lane + 1}<span>◇</span></button>` : ''}
        <div class="tiles" role="group" aria-label="Luống ${lane + 1}"
          style="top:${percent(top)};height:${percent(bottom - top)};left:${percent(arena.xPlantSpan[0])};width:${percent(arena.xPlantSpan[1] - arena.xPlantSpan[0])}">
          ${Array.from({ length: COLUMNS }, (_, col) => `<button class="tile" tabindex="${lane === 0 && col === 0 ? 0 : -1}" aria-label="Luống ${lane + 1}, ô ${col + 1}"></button>`).join('')}
        </div>`;
    }).join('')}<div id="tokens" class="tokens"></div></div>`;
}

function select(value: typeof selection) {
  if (paused || !garden || garden.result) return;
  if (value && value !== 'remove' && garden.cardStatus(value)) {
    renderText(byId('readout'), garden.cardStatus(value));
  }
  selection = selection === value ? null : value;
  lastFeedback = '';
  updateSelection();
}

function updateSelection() {
  for (const button of cardNodes) button.setAttribute('aria-pressed', String(button.dataset.card === selection));
  byId('remove').setAttribute('aria-pressed', String(selection === 'remove'));
  const message = selection === 'remove' ? 'Chọn cây để tháo và lấy lại 25% giá.'
    : selection ? cardDescription(garden!.cards.get(selection)!, content) : 'Chọn cây rồi chọn một ô trống.';
  renderText(byId('card-help'), message);
  paintPreview();
}

function tileCommand(index: number): Command | undefined {
  if (!selection) return;
  const lane = Math.floor(index / COLUMNS), col = index % COLUMNS;
  if (selection === 'remove') return { kind: 'remove', lane, col };
  return { kind: 'plant', card: selection, lane, col };
}

function paintPreview() {
  for (const node of tileNodes) delete node.dataset.preview;
  if (selectedTile === null || !garden) return;
  const node = tileNodes[selectedTile];
  const command = tileCommand(selectedTile);
  node.dataset.invalid = String(command ? Boolean(garden.check(command)) : false);
  if (command?.kind !== 'plant' || node.dataset.invalid === 'true') return;
  const card = garden.cards.get(command.card);
  if (!card) return;
  if (card.id === 'pod') {
    for (const offset of [-1, 1]) {
      if (command.col + offset >= 0 && command.col + offset < COLUMNS) tileNodes[selectedTile + offset].dataset.preview = 'true';
    }
    return;
  }
  if (!('rangeTiles' in card)) return;
  for (let i = 1; i <= Math.min(Math.floor(card.rangeTiles), COLUMNS - 1 - command.col); i++) {
    tileNodes[selectedTile + i].dataset.preview = 'true';
  }
}

async function start() {
  if (busy) return;
  busy = true;
  const source = view;
  const chosen = content;
  try {
    const media = await getArena(chosen);
    if (view !== source || content !== chosen || guide) return;
    closeDialog();
    leaveBoard();
    view = 'play';
    window.scrollTo(0, 0);
    selection = null;
    focusTile = 0;
    selectedTile = null;
    lastFeedback = '';
    garden = new Garden(content);
    const { id, title } = content.level;
    activeTip = save.record(id) || introduced.has(id) ? '' : stages[id].tip;
    tutorialStep = id === 'raincourt' && activeTip ? 'plant' : 'done';
    introduced.add(id);
    collectedAt = -Infinity;
    lastCreditAnnouncement = -Infinity;
    resultMotion = 0;
    lastResultFrame = 0;
    app.innerHTML = `<section class="game" data-arena="${id}" aria-label="${title}">
      <header class="game-header"><h1 tabindex="-1">${title}</h1>
      <div class="badges"><button id="compact-help" class="plain">Sổ tay</button><div id="core" class="badge">${icon('heart')} Hạt Tim <strong></strong></div>
      <div id="time" class="badge"></div></div></header>
      <p class="rotate">Xoay ngang màn hình để dễ chạm các ô trồng.</p>
      <div class="playfield"><aside class="deck" aria-label="Hạt giống và công cụ">
        <div class="notebook-head"><div id="stock" class="badge">${icon('seed')} <span>Ánh Hạt</span> <strong></strong><small id="stock-credit"></small></div>
        <div id="bell-state" class="badge">${icon('bell')} <span>Chuông</span> <strong></strong></div></div>
        <button id="collect" class="secondary" aria-keyshortcuts="S">Thu Ánh Hạt <kbd>S</kbd></button>
        <div class="seed-grid">${(['fern', 'pitcher', 'bramble', 'orchid', 'moss', 'pod'] as const).map((id, index) => {
          const card = garden!.cards.get(id);
          return card ? `<button class="seed-card" data-card="${id}" aria-pressed="false" aria-describedby="card-help" aria-keyshortcuts="${index + 1}">
            <img src="./art/${content.sprites[id].asset}" alt=""><strong>${card.label}</strong>
            <span class="cost">${card.cost}</span><small class="card-role">${roles[id]}</small>
            <small class="card-state"></small><span class="cooldown" aria-hidden="true"></span></button>`
            : `<div class="seed-empty" aria-hidden="true">${icon('seed')}</div>`;
        }).join('')}</div>
        <div class="toolbelt"><button id="remove" class="secondary" aria-pressed="false">${icon('hoe')} Tháo cây</button>
          <button id="pause" class="secondary">Tạm dừng</button></div>
        <p id="card-help" class="help"></p>
        <button id="help" class="plain">Xem trong Sổ tay</button>
      </aside><div class="board-column">
        <div id="board" class="board">${boardMarkup()}</div>
        <div id="threat" class="threat">${icon('flag')}
          <div><strong id="wave"></strong><span id="next-threat"></span></div><progress id="wave-progress" aria-label="Tiến độ đợt"></progress>
        </div>
        <div id="keeper-hud" class="keeper-hud" hidden>
          <span id="keeper-status"></span><meter id="keeper-health" min="0" aria-label="Sức bền Thợ Vườn Gốm"></meter>
        </div>
        <p id="readout" class="readout" role="status"></p>
      </div></div>
    </section>`;
    painter = new Painter(app.querySelector('canvas')!, content, media);
    cardNodes = [...app.querySelectorAll<HTMLButtonElement>('.seed-card')];
    valveNodes = [...app.querySelectorAll<HTMLButtonElement>('.valve')];
    tileNodes = [...app.querySelectorAll<HTMLButtonElement>('.tile')];
    for (const button of cardNodes) {
      button.onclick = () => select(button.dataset.card as CardId);
      button.title = cardDescription(garden.cards.get(button.dataset.card as CardId)!, content);
    }
    valveNodes.forEach((button, lane) => { button.onclick = () => garden?.queue({ kind: 'water', lane }); });
    tileNodes.forEach((button, index) => {
      button.onclick = () => {
        const command = tileCommand(index);
        if (command) garden?.queue(command);
        else renderText(byId('readout'), 'Chọn hạt giống trước khi trồng.');
      };
      button.onpointerenter = () => { selectedTile = index; paintPreview(); };
      button.onpointerleave = () => { if (document.activeElement !== button) { selectedTile = null; paintPreview(); } };
      button.onfocus = () => {
        tileNodes[focusTile].tabIndex = -1;
        focusTile = index;
        button.tabIndex = 0;
        selectedTile = index;
        paintPreview();
      };
      button.onblur = () => { selectedTile = null; paintPreview(); };
      button.onkeydown = (event) => {
        const move = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUMNS, ArrowDown: COLUMNS })[event.key];
        if (move === undefined) return;
        event.preventDefault();
        const next = focusTile + move;
        if (next < 0 || next >= tileNodes.length || (Math.abs(move) === 1 && Math.floor(next / COLUMNS) !== Math.floor(focusTile / COLUMNS))) return;
        tileNodes[next].focus();
      };
    });
    byId('board').oncontextmenu = (event) => { event.preventDefault(); selection = null; updateSelection(); };
    byId('remove').onclick = () => select('remove');
    byId('pause').onclick = pauseMenu;
    byId('collect').onclick = () => garden?.queue({ kind: 'collect' });
    const cardGuide = () => showGuide(selection && selection !== 'remove' ? selection : undefined);
    byId('help').onclick = cardGuide;
    byId('compact-help').onclick = cardGuide;
    updateSelection();
    updateHud(garden);
    painter.draw(garden, save.settings.reduced);
    head();
    lastHudTick = -1;
    lastFrame = 0;
    accumulated = 0;
    sound.setScene('watch');
    animation = requestAnimationFrame(frame);
  } catch (error) {
    if (content !== chosen || (view !== source && view !== 'play')) return;
    console.error('Greenhouse arena failed to load', error);
    openDialog('Không tải được nhà kính', '<p>Hãy thử tải lại hình ảnh và vào ca trực.</p><button id="retry-assets" class="primary">Thử lại</button>', () => {
      byId('retry-assets').onclick = () => { void start(); };
    });
  } finally { busy = false; }
}

function updateTokens(game: Garden) {
  for (const [id, node] of tokenNodes) if (!game.drops.some((drop) => drop.id === id)) {
    node.remove();
    tokenNodes.delete(id);
  }
  const layer = byId('tokens');
  const { xPlantSpan, feetY, visualRowEdges } = content.arena;
  for (const drop of game.drops) {
    let node = tokenNodes.get(drop.id);
    if (!node) {
      node = document.createElement('button');
      node.className = 'token';
      node.tabIndex = -1; // The persistent S button collects the same drops from the keyboard.
      node.setAttribute('aria-label', `Thu ${drop.value} Ánh Hạt`);
      node.innerHTML = `${icon('seed')}<b>${drop.value}</b>`;
      node.style.left = (xPlantSpan[0] + drop.x / COLUMNS * (xPlantSpan[1] - xPlantSpan[0])) * 100 + '%';
      node.style.top = (feetY[drop.lane] * 0.55 + visualRowEdges[drop.lane] * 0.45) * 100 + '%';
      node.onclick = () => game.queue({ kind: 'collect', id: drop.id });
      tokenNodes.set(drop.id, node);
      layer.append(node);
    }
    node.style.setProperty('--life', String((drop.expires - game.now) / (drop.expires - drop.created)));
  }
}

function ghost(game: Garden) {
  if (selectedTile !== null) {
    const command = tileCommand(selectedTile);
    if (command?.kind === 'plant' && !game.check(command)) return { id: command.card, lane: command.lane, col: command.col };
  }
  if (tutorialStep === 'plant' && !selection && !save.settings.reduced) return { id: 'fern' as const, lane: game.threats[0].lane, col: 3 };
}

let lastHudTick = -1;
function updateHud(game: Garden) {
  const preparing = game.now < game.prep;
  renderText(byId('stock').querySelector('strong')!, String(game.stock));
  renderText(byId('bell-state').querySelector('strong')!, game.bell ? 'Sẵn' : 'Đã dùng');
  renderText(byId('stock-credit'), game.now - collectedAt <= HZ ? '+' + collectedAmount : '');
  byId('bell-state').dataset.spent = String(!game.bell);
  updateTokens(game);
  renderText(byId('core').querySelector('strong')!, game.core + '/' + content.level.coreHealth);
  renderText(byId('time'), preparing ? 'Chuẩn bị · ' + seconds(game.prep - game.now) + ' giây'
    : 'Ca trực · ' + clock(Math.floor((game.now - game.prep) / HZ)));
  renderText(byId('wave'), game.wave === 0 ? 'Đợt đầu' : 'Đợt ' + game.wave + '/' + content.level.waves.length);
  const next = game.nextThreat;
  const valves = valveNodes.map((_, lane) => game.valveState(lane));
  const hazardLane = valves.findIndex((valve) => Number.isFinite(valve.closesAt));
  const hazard = valves[hazardLane];
  const warning = Boolean(hazard || (next && next.at - game.now <= 6 * HZ));
  byId('threat').dataset.warning = String(warning);
  const forecast = hazard ? `Luống ${hazardLane + 1} sắp đóng · ${seconds(hazard.closesAt - game.now)} giây`
    : next ? `Luống ${next.lane + 1} · ${next.count} ${next.spec.label} sau ${seconds(next.at - game.now)} giây` : 'Dọn địch còn lại';
  renderText(byId('next-threat'), ' · ' + forecast);
  const keeper = game.keeper;
  byId('keeper-hud').hidden = !keeper;
  if (keeper) {
    renderText(byId('keeper-status'), `Thợ Vườn Gốm · Pha ${game.keeperPhase} · ${Math.ceil(keeper.hp)} HP`);
    const health = byId<HTMLMeterElement>('keeper-health');
    health.max = keeper.spec.hp;
    health.value = keeper.hp;
  }
  const progress = byId<HTMLProgressElement>('wave-progress');
  const from = content.level.waves[game.wave - 1]?.atSeconds ?? 0;
  const to = content.level.waves[game.wave]?.atSeconds ?? content.level.waves.at(-1)!.atSeconds + 72;
  progress.max = preparing ? game.prep : Math.max(1, (to - from) * HZ);
  progress.value = preparing ? game.now : game.now - game.prep - from * HZ;

  const lock = seconds(game.waterReady - game.now);
  valveNodes.forEach((button, lane) => {
    const wet = lane === game.wet;
    const state = valves[lane];
    const closed = seconds(state.opensAt - game.now);
    const warning = Number.isFinite(state.closesAt) ? seconds(state.closesAt - game.now) : 0;
    const cause = state.sources.includes('keeper') && state.sources.includes('pump') ? 'Bơm và Thợ Vườn Gốm'
      : state.sources.includes('keeper') ? 'Thợ Vườn Gốm' : 'Sự cố bơm';
    const status = closed ? `${cause} · Van đóng ${closed} giây`
      : warning ? `${cause} · Sắp đóng van sau ${warning} giây`
      : wet ? 'Đang có nước' : lock ? 'Van hồi sau ' + lock + ' giây' : 'Luống khô';
    const label = `Tưới luống ${lane + 1}. ${status}.`;
    if (button.getAttribute('aria-label') !== label) {
      button.dataset.valve = closed ? 'closed' : warning ? 'warning' : 'open';
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(wet));
      button.title = label;
      renderText(button.querySelector('span')!, closed ? '×' + closed : warning ? '!' + warning : wet ? '≈' : lock ? String(lock) + 's' : '◇');
    }
  });
  cardNodes.forEach((button) => {
    const id = button.dataset.card as CardId;
    const status = game.cardStatus(id);
    const card = game.cards.get(id)!;
    const remaining = Math.max(0, (game.placementReady.get(id) ?? 0) - game.now);
    button.dataset.available = String(!status);
    button.dataset.locked = String(status.startsWith('Mở'));
    button.setAttribute('aria-disabled', String(Boolean(status)));
    button.setAttribute('aria-label', `${card.label}, ${card.cost} Ánh Hạt. ${roles[id]}. ${status || 'Sẵn sàng.'}`);
    button.style.setProperty('--cooldown', String(remaining / (card.placementCooldownSeconds * HZ)));
    renderText(button.querySelector('.card-state')!, remaining ? `${seconds(remaining)}s` : status.replaceAll('.', ''));
  });
  tileNodes.forEach((button, index) => {
    const lane = Math.floor(index / COLUMNS), col = index % COLUMNS;
    const plant = game.plants.find((unit) => unit.lane === lane && unit.col === col);
    const enemy = game.enemies.find((unit) => unit.lane === lane && Math.abs(unit.x - col - 0.5) <= 0.5);
    const label = `Luống ${lane + 1}, ô ${col + 1}` + (plant ? ', ' + plant.card.label : enemy ? ', ' + enemy.spec.label : ', trống');
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
  });
  if (selectedTile !== null) paintPreview();
  if (game.feedback && game.feedback !== lastFeedback) {
    lastFeedback = game.feedback;
    renderText(byId('readout'), game.feedback);
  } else if (!game.feedback) {
    lastFeedback = '';
    const water = game.wet === null ? 'Các luống đang khô.' : `Đang tưới luống ${game.wet + 1}.`;
    const status = tutorialStep === 'plant' ? stages.raincourt.tip
      : tutorialStep === 'drop' && game.drops.length ? 'Chạm hạt hoặc nhấn S để thu Ánh Hạt.'
      : game.now < game.prep && activeTip && content.level.waterEnabled ? activeTip
      : content.level.waterEnabled ? water : '';
    renderText(byId('readout'), status);
  }
}

function results(game: Garden) {
  sound.setScene('off');
  const win = game.result === 'victory';
  const duration = (game.now - game.prep) / HZ;
  const stars = 1 + Number(game.core >= 2) + Number(game.bestChain >= (content.level.waterEnabled ? 3 : 2));
  const { id, title, coreHealth } = content.level;
  const next = levels[levels.indexOf(id) + 1];
  if (win) save.win(id, stars, duration);
  const summary = win ? `<p>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${clock(Math.round(duration))} · Hạt Tim ${game.core}/${coreHealth}</p>
    <p>Tia Lan Sét nối nhiều nhất ${game.bestChain} mục tiêu. ${title} an toàn qua đêm.</p>`
    : `<p>Địch vượt qua luống ${(game.firstBreach ?? 0) + 1} đầu tiên. Hạt Tim tắt khi địch tràn qua luống ${(game.lastBreach ?? 0) + 1}.</p>`;
  const advance = (next ? 'Tiếp tục · ' + campaign[next].level.title : 'Xem kết thúc');
  openDialog(win ? stages[id].beat + '!' : 'Hạt Tim đã tắt', `${summary}<p>${storageMessage()}</p>
    <div class="actions">${win ? `<button id="advance" class="primary">${advance}</button>` : ''}
    <button id="retry" class="${win ? 'secondary' : 'primary'}">${win ? 'Chơi lại' : 'Thử lại'}</button>
    <button id="result-map" class="secondary">Bản đồ</button></div>`, () => {
    if (win) byId('advance').onclick = () => { if (next) enterStage(next); else ending(); };
    byId('retry').onclick = () => { void start(); };
    byId('result-map').onclick = () => { closeDialog(); map(); };
  }, true);
}

function ending() {
  closeDialog();
  leaveBoard();
  view = 'ending';
  app.innerHTML = `<section class="ending">
    <div class="finale-art" aria-hidden="true">
      <canvas id="retreat" width="170" height="145" hidden></canvas>
      <img id="bloom" class="bloom ${save.settings.reduced ? 'still' : ''}" src="./art/retro/plants/fern.webp" alt="">
    </div>
    <h1 tabindex="-1">Hạt Tim nảy mầm</h1>
    <p>Ba ca trực đã qua. Bình minh rọi qua mái kính, và Hạt Tim đâm chồi.</p>
    <ul class="ending-records">${levels.map((id) => {
      const record = save.record(id);
      return `<li>${campaign[id].level.title} · ${'★'.repeat(record?.stars ?? 0)} · ${clock(Math.round(record?.fastest ?? 0))}</li>`;
    }).join('')}</ul>
    <p>Tác phẩm của AI Game Studio. Hình ảnh và âm thanh gốc của dự án.</p>
    <div class="actions">
      <button id="skip-bloom" class="secondary" ${save.settings.reduced ? 'hidden' : ''}>Bỏ qua hiệu ứng</button>
      <button id="ending-map" class="primary">Về bản đồ</button>
    </div>
  </section>`;
  const skip = byId<HTMLButtonElement>('skip-bloom');
  skip.onclick = () => {
    cancelAnimationFrame(endingFrame);
    byId('retreat').hidden = true;
    byId('bloom').classList.add('still');
    skip.hidden = true;
    byId('ending-map').focus();
  };
  byId('bloom').onanimationend = () => {
    if (document.activeElement === skip) byId('ending-map').focus();
    skip.hidden = true;
  };
  byId('ending-map').onclick = map;
  if (!save.settings.reduced) {
    const canvas = byId<HTMLCanvasElement>('retreat');
    const context = canvas.getContext('2d');
    if (context) void loadMotion('keeper').then((frames) => {
      if (!frames || !canvas.isConnected || skip.hidden) return;
      let start = 0;
      const draw = (time: number) => {
        if (!start) start = time;
        const age = (time - start) * HZ / 1000;
        if (age >= 45 || save.settings.reduced) { canvas.hidden = true; return; }
        canvas.hidden = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(85 - age * 0.55, 133);
        context.globalAlpha = Math.min(1, (45 - age) / 14);
        drawPose(context, frames, { clip: 'fall', age }, 149);
        context.restore();
        endingFrame = requestAnimationFrame(draw);
      };
      endingFrame = requestAnimationFrame(draw);
    });
  }
  head();
}

const cues = new Set<string>(['plant', 'fern', 'root', 'shock', 'water', 'warning', 'breach', 'victory', 'defeat', 'pod', 'valve-lock', 'bell', 'collect', 'shield-chip', 'unlock']);

function frame(timestamp: number) {
  const game = garden;
  if (!game || !painter) return;
  if (game.result) {
    if (lastResultFrame && !document.hidden) resultMotion += Math.min(timestamp - lastResultFrame, 80) * HZ / 1000;
    lastResultFrame = timestamp;
    painter.draw(game, false, resultMotion);
    if (resultMotion < 45) animation = requestAnimationFrame(frame);
    return;
  }
  if (!paused) {
    if (lastFrame) accumulated += Math.min(timestamp - lastFrame, 5 * 1000 / HZ);
    const interval = 1000 / HZ;
    while (accumulated >= interval && !game.result) {
      game.step();
      accumulated -= interval;
      const currentEffects = game.effects.filter(({ at }) => at === game.now);
      const credit = currentEffects.reduce((total, effect) => total + (effect.kind === 'collect' ? effect.value ?? 0 : 0), 0);
      if (credit) {
        collectedAt = game.now;
        collectedAmount = credit;
        if (tutorialStep === 'drop') tutorialStep = 'done';
        if (game.now - lastCreditAnnouncement >= HZ) {
          lastCreditAnnouncement = game.now;
          announce.textContent = `Đã thu ${collectedAmount} Ánh Hạt.`;
        }
      }
      for (const effect of currentEffects) {
        if (cues.has(effect.kind)) void sound.cue(effect.kind as Cue);
        if (effect.kind === 'plant' && tutorialStep === 'plant') tutorialStep = 'drop';
        if (effect.kind === 'unlock') announce.textContent = 'Lan Sét đã mở.';
        if (effect.kind === 'bell') announce.textContent = `Chuông Gốm đã dùng ở luống ${effect.lane + 1}.`;
        if (effect.kind === 'phase') announce.textContent = 'Thợ Vườn Gốm bước vào pha hai.';
        if (effect.kind === 'keeper-down') announce.textContent = 'Thợ Vườn Gốm đã gục. Hãy dọn địch còn lại.';
        if (effect.kind === 'valve-lock') announce.textContent = `Van luống ${effect.lane + 1} đã đóng.`;
        if (effect.kind === 'breach') announce.textContent = `Địch đã lọt qua luống ${effect.lane + 1}. Hạt Tim còn ${game.core}.`;
        if (effect.kind === 'warning') announce.textContent = effect.x === 0
          ? `Van luống ${effect.lane + 1} sắp đóng.` : `Đợt mới sắp đến luống ${effect.lane + 1}.`;
      }
    }
    if (lastHudTick !== game.now) {
      lastHudTick = game.now;
      updateHud(game);
    }
    sound.setScene(game.wave >= 5 ? 'storm' : 'watch');
    sound.sync();
    painter.draw(game, save.settings.reduced, 0, ghost(game));
  }
  lastFrame = timestamp;
  if (game.result) {
    results(game);
    if (!save.settings.reduced && game.fallen.length) animation = requestAnimationFrame(frame);
  } else animation = requestAnimationFrame(frame);
}

document.addEventListener('pointerdown', () => sound.unlock(), { once: true });
document.addEventListener('keydown', () => sound.unlock(), { once: true });
document.addEventListener('keydown', (event) => {
  if (dialog.open || !garden || garden.result || paused || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') {
    if (selection) { selection = null; updateSelection(); }
    else pauseMenu();
    event.preventDefault();
    return;
  }
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key.toLowerCase() === 's') { garden.queue({ kind: 'collect' }); event.preventDefault(); return; }
  if (!/^[1-6]$/.test(event.key)) return;
  const card = (['fern', 'pitcher', 'bramble', 'orchid', 'moss', 'pod'] as const)[Number(event.key) - 1];
  if (garden.cards.has(card)) { select(card); event.preventDefault(); }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (garden && !garden.result && !guide) pauseMenu();
  else sound.setPaused(true);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !paused) sound.setPaused(false);
});
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  if (dialog.dataset.lock !== 'true') { if (guide) closeDialog(); else resume(); }
});
byId('brand').onclick = () => { if (guide) byId('guide-back').click(); else if (view === 'play') confirmExit(); else if (view !== 'title') title(); };
byId('settings').onclick = settings;
document.querySelector<HTMLAnchorElement>('.top-actions a')!.onclick = (event) => {
  if (!garden || garden.result) return;
  event.preventDefault();
  openDialog('Quay về thư viện?', '<p>Lần chơi hiện tại sẽ kết thúc.</p><div class="actions"><button id="stay" class="primary">Tiếp tục ca trực</button><a class="plain" href="../../#/">Về thư viện game</a></div>', () => {
    byId('stay').onclick = () => { if (guide) closeDialog(); else resume(); };
  });
};

async function init() {
  try {
    const response = await fetch('./content.json');
    if (!response.ok) throw new Error('Content fetch: ' + response.status);
    campaign = await response.json() as Campaign;
    title();
    if (inGuide()) mountGuide();
  } catch (error) {
    console.error('Greenhouse content failed to load', error);
    app.innerHTML = '<p class="loading">Không tải được dữ liệu nhà kính. <button id="retry-boot" class="secondary">Thử lại</button></p>';
    byId('retry-boot').onclick = () => { void init(); };
  }
}
void init();
