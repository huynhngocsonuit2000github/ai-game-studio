import { COLUMNS, descriptions, HZ, LANES } from './content.js';
import type { CardId, Content } from './content.js';
import { Garden } from './simulation.js';
import type { Command, Cue } from './simulation.js';
import { loadArena, Painter } from './renderer.js';
import { Save } from './save.js';
import { Sound } from './audio.js';

const app = document.querySelector<HTMLElement>('#app')!;
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const announce = document.querySelector<HTMLParagraphElement>('#announce')!;
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const seconds = (ticks: number) => Math.max(0, Math.ceil(ticks / HZ));
const clock = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const renderText = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };

const save = new Save();
const sound = new Sound(save.settings);
const stages = [
  ['Sân Mưa', 'Giữ đèn lên', 'Tập chuyển nước giữa Bình Hứng và Lan Sét.'],
  ['Hầm Bơm', 'Bơm chạy lại', 'Vượt sự cố van và giữ thế trận khi máy bơm ngừng.'],
  ['Đài Chớp', 'Hạt Tim nảy mầm', 'Đón Thợ Vườn Gốm trên mái nhà kính.'],
] as const;

let view: 'title' | 'map' | 'brief' | 'play' = 'title';
let content: Content;
let arenaPromise: ReturnType<typeof loadArena> | undefined;
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

function head() { app.querySelector<HTMLElement>('h1')?.focus(); }
function storageMessage() { return save.unavailable ? 'Trình duyệt đang chặn lưu. Tiến độ chỉ giữ trong phiên này.' : ''; }

function leaveBoard() {
  cancelAnimationFrame(animation);
  garden = undefined;
  painter = undefined;
  paused = false;
  sound.clearVoices();
  sound.setScene('off');
  sound.setPaused(false);
}

function title() {
  leaveBoard();
  view = 'title';
  app.innerHTML = `<section class="hero"><div>
    <p class="kicker">Phòng thủ bốn luống</p>
    <h1 tabindex="-1">Nhà Kính Sau Nửa Đêm</h1>
    <p>Đêm mưa, lũ nấm kéo lên mái. Trồng cây, chuyển nước và giữ Hạt Tim đến rạng sáng.</p>
    <button id="enter" class="primary">Vào nhà kính</button>
  </div></section>`;
  byId('enter').onclick = () => {
    try { sessionStorage.setItem('midnight-greenhouse.entered', '1'); } catch { /* storage is optional */ }
    map();
  };
  head();
}

function map() {
  leaveBoard();
  view = 'map';
  app.innerHTML = `<section class="map"><p class="kicker">Ca trực đêm</p><h1 tabindex="-1">Chiến dịch</h1>
    <div class="stage-list">${stages.map(([name, beat, description], index) => `
      <article class="stage ${index === 0 ? 'playable' : 'locked'}">
        ${index === 0 ? '<img src="./cover.webp" alt="">' : ''}
        <p class="kicker">Màn 0${index + 1} · ${index === 0 ? 'Có thể chơi' : 'Chưa mở'}</p>
        <h2>${name}</h2><p>${beat}. ${description}</p>
        ${index === 0 ? `${save.record ? `<p>${'★'.repeat(save.record.stars)} · Nhanh nhất ${clock(Math.round(save.record.fastest))}</p>` : ''}
        <button id="open-stage" class="primary">${save.record ? 'Chơi lại Sân Mưa' : 'Chọn Sân Mưa'}</button>`
        : '<p>Sau đợt playtest Sân Mưa</p>'}
      </article>`).join('')}</div>
    <p class="map-note">${storageMessage()}</p></section>`;
  byId('open-stage').onclick = briefing;
  head();
}

const tutorial = `<ol>
  <li>Chọn hạt giống rồi chọn ô trống. Địch đi từ phải sang trái.</li>
  <li>Chạm van bên trái để tưới một luống. Đợi 4 giây trước khi chuyển.</li>
  <li>Bình Hứng có nước thu thêm Ánh Hạt. Lan Sét có nước nối tia qua nhiều địch.</li>
  <li>Dùng Dương Xỉ khi gặp Chậu Giáp hoặc Áo Mưa.</li>
</ol>`;

function briefing() {
  view = 'brief';
  sound.setScene('brief');
  app.innerHTML = `<section class="brief"><img src="./art/boards/raincourt.webp" alt="">
    <div><p class="kicker">Màn 01 · Giữ đèn lên</p><h1 tabindex="-1">Sân Mưa</h1>
    <p>Giữ Hạt Tim qua 6 đợt nấm. Bạn có 20 giây để trồng trước khi vào ca trực.</p>
    ${tutorial}<div class="actions"><button id="start" class="primary">Bắt đầu ca trực</button>
    <button id="back" class="secondary">Bản đồ</button></div></div></section>`;
  byId('start').onclick = () => { void start(); };
  byId('back').onclick = map;
  head();
  // Load while the player reads. On failure the Start action offers a retry.
  void getArena().catch(() => {});
}

function getArena() {
  arenaPromise ??= loadArena(content).catch((error: unknown) => {
    arenaPromise = undefined;
    throw error;
  });
  return arenaPromise;
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
    <button id="resume" class="primary">Tiếp tục</button><button id="return-map" class="secondary">Về bản đồ</button>
  </div>`, () => {
    byId('resume').onclick = resume;
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
    byId('settings-done').onclick = resume;
  });
}

function showHelp() {
  openDialog('Cách giữ nhà kính', `${tutorial}<p>Phím 1–4 chọn cây. Phím mũi tên di chuyển trong luống, Enter hoặc Space đặt cây, Esc bỏ chọn hoặc tạm dừng.</p>
    <button id="help-done" class="primary">Tiếp tục</button>`, () => { byId('help-done').onclick = resume; });
}

function boardMarkup() {
  const arena = content.arena;
  const percent = (value: number) => (value * 100).toFixed(5) + '%';
  return `<div class="board-layer"><canvas aria-hidden="true"></canvas>
    ${Array.from({ length: LANES }, (_, lane) => {
      const top = arena.visualRowEdges[lane];
      const bottom = arena.visualRowEdges[lane + 1];
      return `<button class="valve" aria-pressed="false" style="top:${percent((top + bottom) / 2)};left:${percent(arena.valveX)}">${lane + 1}<span>◇</span></button>
        <div class="tiles" role="group" aria-label="Luống ${lane + 1}"
          style="top:${percent(top)};height:${percent(bottom - top)};left:${percent(arena.xPlantSpan[0])};width:${percent(arena.xPlantSpan[1] - arena.xPlantSpan[0])}">
          ${Array.from({ length: COLUMNS }, (_, col) => `<button class="tile" tabindex="${lane === 0 && col === 0 ? 0 : -1}" aria-label="Luống ${lane + 1}, ô ${col + 1}"></button>`).join('')}
        </div>`;
    }).join('')}</div>`;
}

function select(value: typeof selection) {
  if (paused || !garden || garden.result) return;
  selection = selection === value ? null : value;
  lastFeedback = '';
  updateSelection();
}

function updateSelection() {
  for (const button of cardNodes) button.setAttribute('aria-pressed', String(button.dataset.card === selection));
  byId('remove').setAttribute('aria-pressed', String(selection === 'remove'));
  const message = selection === 'remove' ? 'Chọn cây để tháo và lấy lại 25% giá.'
    : selection ? descriptions[selection] : 'Chọn cây để trồng. Chọn van số 1–4 để chuyển nước.';
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
  if (!card || !('rangeTiles' in card)) return;
  for (let i = 1; i <= Math.min(Math.floor(card.rangeTiles), COLUMNS - 1 - command.col); i++) {
    tileNodes[selectedTile + i].dataset.preview = 'true';
  }
}

async function start() {
  if (busy) return;
  busy = true;
  const source = view;
  try {
    const media = await getArena();
    if (view !== source) return;
    closeDialog();
    leaveBoard();
    view = 'play';
    selection = null;
    focusTile = 0;
    selectedTile = null;
    lastFeedback = '';
    garden = new Garden(content);
    app.innerHTML = `<section class="game" aria-label="Sân Mưa">
      <header class="game-header"><div><p class="kicker">Màn 01 · Giữ đèn lên</p><h1 tabindex="-1">Sân Mưa</h1></div>
      <div class="badges"><div id="stock" class="badge">Ánh Hạt <strong></strong></div>
      <div id="core" class="badge">Hạt Tim <strong></strong></div><div id="time" class="badge"></div><button id="help" class="plain">Cách chơi</button></div></header>
      <p class="rotate">Xoay ngang màn hình để có ô trồng và chữ lớn hơn.</p>
      <div class="playfield"><div class="board-column">
        <div id="board" class="board">${boardMarkup()}<div id="threat" class="threat">
          <div><strong id="wave"></strong><span id="next-threat"></span></div><progress id="wave-progress" aria-label="Tiến độ đợt"></progress>
        </div></div>
        <p id="readout" class="readout" role="status"></p>
      </div><aside class="deck" aria-label="Hạt giống và công cụ">
      ${content.cards.map((card, index) => `<button class="seed-card" data-card="${card.id}" aria-pressed="false" aria-describedby="card-help">
        <img src="./art/${content.sprites[card.id].asset}" alt=""><span><strong><span class="shortcut">${index + 1} · </span>${card.label}</strong><span class="cost">${card.cost} Ánh Hạt</span></span></button>`).join('')}
        <div class="toolbelt"><button id="remove" class="secondary" aria-pressed="false">Tháo cây</button>
          <button id="pause" class="secondary">Tạm dừng</button></div>
        <p id="card-help" class="help"></p>
      </aside></div>
    </section>`;
    painter = new Painter(app.querySelector('canvas')!, content, media);
    cardNodes = [...app.querySelectorAll<HTMLButtonElement>('.seed-card')];
    valveNodes = [...app.querySelectorAll<HTMLButtonElement>('.valve')];
    tileNodes = [...app.querySelectorAll<HTMLButtonElement>('.tile')];
    for (const button of cardNodes) {
      button.onclick = () => select(button.dataset.card as CardId);
      button.title = descriptions[button.dataset.card as CardId];
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
    byId('help').onclick = showHelp;
    updateSelection();
    updateHud(garden);
    painter.draw(garden, save.settings.reduced);
    head();
    lastFrame = 0;
    accumulated = 0;
    sound.setScene('watch');
    animation = requestAnimationFrame(frame);
  } catch (error) {
    console.error('Greenhouse arena failed to load', error);
    openDialog('Không tải được nhà kính', '<p>Hãy thử tải lại hình ảnh và vào ca trực.</p><button id="retry-assets" class="primary">Thử lại</button>', () => {
      byId('retry-assets').onclick = () => { void start(); };
    });
  } finally { busy = false; }
}

let lastHudTick = -1;
function updateHud(game: Garden) {
  const preparing = game.now < game.prep;
  renderText(byId('stock').querySelector('strong')!, String(game.stock));
  renderText(byId('core').querySelector('strong')!, game.core + '/' + content.level.coreHealth);
  renderText(byId('time'), preparing ? 'Chuẩn bị · ' + seconds(game.prep - game.now) + ' giây'
    : 'Ca trực · ' + clock(Math.floor((game.now - game.prep) / HZ)));
  renderText(byId('wave'), preparing ? 'Chuẩn bị đội hình' : 'Đợt ' + game.wave + '/' + content.level.waves.length);
  const next = game.nextThreat;
  const warning = Boolean(next && next.at - game.now <= 6 * HZ);
  byId('threat').dataset.warning = String(warning);
  const forecast = next ? `Luống ${next.lane + 1} · ${next.count} ${next.spec.label} sau ${seconds(next.at - game.now)} giây` : 'Dọn địch còn lại';
  renderText(byId('next-threat'), ' · ' + forecast);
  const progress = byId<HTMLProgressElement>('wave-progress');
  const from = content.level.waves[game.wave - 1]?.atSeconds ?? 0;
  const to = content.level.waves[game.wave]?.atSeconds ?? content.level.waves.at(-1)!.atSeconds + 72;
  progress.max = preparing ? game.prep : Math.max(1, (to - from) * HZ);
  progress.value = preparing ? game.now : game.now - game.prep - from * HZ;

  const lock = seconds(game.waterReady - game.now);
  valveNodes.forEach((button, lane) => {
    const wet = lane === game.wet;
    const label = `Tưới luống ${lane + 1}. ${wet ? 'Đang có nước' : lock ? 'Van hồi sau ' + lock + ' giây' : 'Luống khô'}.`;
    if (button.getAttribute('aria-label') !== label) {
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(wet));
      button.title = label;
      renderText(button.querySelector('span')!, wet ? '≈' : lock ? String(lock) + 's' : '◇');
    }
  });
  cardNodes.forEach((button) => {
    const id = button.dataset.card as CardId;
    button.dataset.affordable = String(game.stock >= game.cards.get(id)!.cost);
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
    const water = game.wet === null ? 'Mọi luống đang khô.' : `Đang tưới luống ${game.wet + 1}.`;
    renderText(byId('readout'), water + (lock ? ' Van hồi sau ' + lock + ' giây.' : ' Có thể chuyển nước.'));
  }
}

function results(game: Garden) {
  sound.setScene('off');
  const win = game.result === 'victory';
  const duration = (game.now - game.prep) / HZ;
  const stars = 1 + Number(game.core >= 2) + Number(game.bestChain >= 3);
  if (win) save.win(stars, duration);
  const summary = win ? `<p>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${clock(Math.round(duration))} · Hạt Tim ${game.core}/${content.level.coreHealth}</p>
    <p>Tia Lan Sét nối nhiều nhất ${game.bestChain} mục tiêu. Sân Mưa an toàn qua đêm.</p>`
    : `<p>Địch vượt qua luống ${(game.firstBreach ?? 0) + 1} đầu tiên. Luống ${(game.lastBreach ?? 0) + 1} mất Hạt Tim ở cú cuối.</p>`;
  openDialog(win ? 'Giữ đèn lên!' : 'Hạt Tim đã tắt', `${summary}<p>${storageMessage()}</p>
    <div class="actions"><button id="retry" class="primary">Chơi lại</button><button id="result-map" class="secondary">Bản đồ</button></div>`, () => {
    byId('retry').onclick = () => { void start(); };
    byId('result-map').onclick = () => { closeDialog(); map(); };
  }, true);
}

const cues = new Set<string>(['plant', 'fern', 'root', 'shock', 'water', 'warning', 'breach', 'victory', 'defeat']);
function frame(timestamp: number) {
  const game = garden;
  if (!game || !painter) return;
  if (!paused) {
    if (lastFrame) accumulated += Math.min(timestamp - lastFrame, 5 * 1000 / HZ);
    const interval = 1000 / HZ;
    while (accumulated >= interval && !game.result) {
      game.step();
      accumulated -= interval;
      for (const effect of game.effects) {
        if (effect.at !== game.now || !cues.has(effect.kind)) continue;
        sound.cue(effect.kind as Cue);
        if (effect.kind === 'breach') announce.textContent = `Địch đã lọt qua luống ${effect.lane + 1}. Hạt Tim còn ${game.core}.`;
        if (effect.kind === 'warning') announce.textContent = `Đợt mới sắp đến luống ${effect.lane + 1}.`;
      }
    }
    if (lastHudTick !== game.now) {
      lastHudTick = game.now;
      updateHud(game);
    }
    sound.setScene(game.wave >= 5 ? 'storm' : 'watch');
    sound.sync();
    painter.draw(game, save.settings.reduced);
  }
  lastFrame = timestamp;
  if (game.result) results(game);
  else animation = requestAnimationFrame(frame);
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
  if (!/^[1-4]$/.test(event.key)) return;
  const card = content.cards[Number(event.key) - 1];
  if (card) { select(card.id); event.preventDefault(); }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (garden && !garden.result) pauseMenu();
  else sound.setPaused(true);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !paused) sound.setPaused(false);
});
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  if (dialog.dataset.lock !== 'true') resume();
});
byId('brand').onclick = () => { if (view === 'play') confirmExit(); else if (view !== 'title') map(); };
byId('settings').onclick = settings;
document.querySelector<HTMLAnchorElement>('.top-actions a')!.onclick = (event) => {
  if (!garden || garden.result) return;
  event.preventDefault();
  openDialog('Quay về thư viện?', '<p>Lần chơi hiện tại sẽ kết thúc.</p><div class="actions"><button id="stay" class="primary">Tiếp tục ca trực</button><a class="plain" href="../../#/">Về thư viện game</a></div>', () => {
    byId('stay').onclick = resume;
  });
};

async function init() {
  const settingExists = (() => {
    try {
      return localStorage.getItem('midnight-greenhouse.settings.v1') !== null
        || sessionStorage.getItem('midnight-greenhouse.entered') === '1';
    } catch { return false; }
  })();
  try {
    const response = await fetch('./content.json');
    if (!response.ok) throw new Error('Content fetch: ' + response.status);
    content = await response.json() as Content;
    if (save.record || settingExists) map();
    else title();
  } catch (error) {
    console.error('Greenhouse content failed to load', error);
    app.innerHTML = '<p class="loading">Không tải được dữ liệu nhà kính. <button id="retry-boot" class="secondary">Thử lại</button></p>';
    byId('retry-boot').onclick = () => { void init(); };
  }
}
void init();
