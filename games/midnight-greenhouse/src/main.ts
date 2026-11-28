import { COLUMNS, descriptions, HZ, LANES, levels } from './content.js';
import type { Campaign, CardId, Content, LevelId } from './content.js';
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
const stages = {
  raincourt: {
    beat: 'Giữ đèn lên', description: 'Tập chuyển nước giữa Bình Hứng và Lan Sét.',
    tip: 'Tưới Bình Hứng khi cần Ánh Hạt, rồi chuyển nước sang Lan Sét lúc địch tụ lại.',
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

let view: 'title' | 'map' | 'brief' | 'play' | 'ending' = 'title';
let campaign: Campaign;
let content: Content;
const arenaPromises = new Map<LevelId, ReturnType<typeof loadArena>>();
let activeTip = '';
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
    <div class="stage-list">${levels.map((id, index) => {
      const { level, arena } = campaign[id];
      const record = save.record(id);
      const available = save.unlocked(id);
      return `<article class="stage ${available ? 'playable' : 'locked'}">
        <img src="./art/${arena.boardAsset}" alt="">
        <p class="kicker">Màn 0${index + 1} · ${record ? 'Đã qua' : available ? 'Có thể chơi' : 'Chưa mở'}</p>
        <h2>${level.title}</h2><p>${stages[id].description}</p>
        ${record ? `<p>${'★'.repeat(record.stars)} · Nhanh nhất ${clock(Math.round(record.fastest))}</p>` : ''}
        ${available ? `<button data-stage="${id}" class="primary">${record ? 'Chơi lại' : 'Chọn'} ${level.title}</button>`
          : `<p>Hoàn thành ${campaign[levels[index - 1]].level.title} để mở.</p>`}
      </article>`;
    }).join('')}</div>
    <p class="map-note">${storageMessage()}</p></section>`;
  for (const id of levels) {
    const button = app.querySelector<HTMLButtonElement>(`[data-stage="${id}"]`);
    if (button) button.onclick = () => briefing(id);
  }
  head();
}

const tutorial = `<ol>
  <li>Chọn hạt giống rồi chọn ô trống. Địch đi từ phải sang trái.</li>
  <li>Chạm van bên trái để tưới một luống. Đợi 4 giây trước khi chuyển.</li>
  <li>Bình Hứng có nước thu thêm Ánh Hạt. Lan Sét có nước nối tia qua nhiều địch.</li>
  <li>Dùng Dương Xỉ khi gặp Chậu Giáp hoặc Áo Mưa.</li>
</ol>`;

function briefing(id: LevelId) {
  if (!save.unlocked(id)) return;
  closeDialog();
  leaveBoard();
  content = campaign[id];
  const { level, arena } = content;
  const stage = stages[id];
  const chapter = levels.indexOf(id) + 1;
  view = 'brief';
  sound.setScene('brief');
  app.innerHTML = `<section class="brief"><img src="./art/${arena.boardAsset}" alt="Các luống và bộ van ở ${level.title}">
    <div><p class="kicker">Màn 0${chapter} · ${stage.beat}</p><h1 tabindex="-1">${level.title}</h1>
    <p>Giữ Hạt Tim qua ${level.waves.length} đợt nấm. Bạn có ${content.preparationSeconds} giây chuẩn bị.</p>
    <p class="brief-tip">${stage.tip}</p>
    <details><summary>Ôn cách chơi</summary>${tutorial}</details>
    <div class="actions"><button id="start" class="primary">Bắt đầu ca trực</button>
    <button id="back" class="secondary">Bản đồ</button></div></div></section>`;
  byId('start').onclick = () => { void start(); };
  byId('back').onclick = map;
  head();
  void getArena(content).catch(() => {});
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
  openDialog('Cách giữ nhà kính', `${tutorial}<p>${stages[content.level.id].tip}</p><p>Phím 1–6 chọn cây đang có. Phím mũi tên di chuyển trong luống, Enter hoặc Space đặt cây, Esc bỏ chọn hoặc tạm dừng.</p>
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
    if (view !== source || content !== chosen) return;
    closeDialog();
    leaveBoard();
    view = 'play';
    selection = null;
    focusTile = 0;
    selectedTile = null;
    lastFeedback = '';
    garden = new Garden(content);
    const { id, title } = content.level;
    activeTip = save.record(id) || introduced.has(id) ? '' : stages[id].tip;
    introduced.add(id);
    app.innerHTML = `<section class="game" data-arena="${id}" aria-label="${title}">
      <header class="game-header"><div><p class="kicker">Màn 0${levels.indexOf(id) + 1} · ${stages[id].beat}</p><h1 tabindex="-1">${title}</h1></div>
      <div class="badges"><div id="stock" class="badge">Ánh Hạt <strong></strong></div>
      <div id="core" class="badge">Hạt Tim <strong></strong></div><div id="time" class="badge"></div><button id="help" class="plain">Cách chơi</button></div></header>
      <p class="rotate">Xoay ngang màn hình để có ô trồng và chữ lớn hơn.</p>
      <div class="playfield"><div class="board-column">
        <div id="board" class="board">${boardMarkup()}</div><div id="threat" class="threat">
          <div><strong id="wave"></strong><span id="next-threat"></span></div><progress id="wave-progress" aria-label="Tiến độ đợt"></progress>
        </div>
        <div id="keeper-hud" class="keeper-hud" hidden>
          <span id="keeper-status"></span><meter id="keeper-health" min="0" aria-label="Sức bền Thợ Vườn Gốm"></meter>
        </div>
        <p id="readout" class="readout" role="status"></p>
      </div><aside class="deck" aria-label="Hạt giống và công cụ">
      ${content.cards.map((card, index) => `<button class="seed-card" data-card="${card.id}" aria-pressed="false" aria-describedby="card-help">
        <img src="./art/${content.sprites[card.id].asset}" alt=""><span><strong><span class="shortcut">${index + 1} · </span>${card.label}</strong><span class="cost">${card.cost}<span class="cost-unit"> Ánh Hạt</span></span></span></button>`).join('')}
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

let lastHudTick = -1;
function updateHud(game: Garden) {
  const preparing = game.now < game.prep;
  renderText(byId('stock').querySelector('strong')!, String(game.stock));
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
    const status = game.now < game.prep && activeTip ? activeTip
      : water + (lock ? ' Van hồi sau ' + lock + ' giây.' : ' Có thể chuyển nước.');
    renderText(byId('readout'), status);
  }
}

function results(game: Garden) {
  sound.setScene('off');
  const win = game.result === 'victory';
  const duration = (game.now - game.prep) / HZ;
  const stars = 1 + Number(game.core >= 2) + Number(game.bestChain >= 3);
  const { id, title, coreHealth } = content.level;
  const next = levels[levels.indexOf(id) + 1];
  if (win) save.win(id, stars, duration);
  const summary = win ? `<p>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${clock(Math.round(duration))} · Hạt Tim ${game.core}/${coreHealth}</p>
    <p>Tia Lan Sét nối nhiều nhất ${game.bestChain} mục tiêu. ${title} an toàn qua đêm.</p>`
    : `<p>Địch vượt qua luống ${(game.firstBreach ?? 0) + 1} đầu tiên. Hạt Tim tắt khi địch tràn qua luống ${(game.lastBreach ?? 0) + 1}.</p>`;
  const advance = (next ? 'Tiếp tục · ' + campaign[next].level.title : 'Xem kết thúc');
  openDialog(win ? stages[id].beat + '!' : 'Hạt Tim đã tắt', `${summary}<p>${storageMessage()}</p>
    <div class="actions">${win ? `<button id="advance" class="primary">${advance}</button>` : ''}
    <button id="retry" class="${win ? 'secondary' : 'primary'}">Chơi lại</button>
    <button id="result-map" class="secondary">Bản đồ</button></div>`, () => {
    if (win) byId('advance').onclick = () => { if (next) briefing(next); else ending(); };
    byId('retry').onclick = () => { void start(); };
    byId('result-map').onclick = () => { closeDialog(); map(); };
  }, true);
}

function ending() {
  closeDialog();
  leaveBoard();
  view = 'ending';
  app.innerHTML = `<section class="ending">
    <div id="bloom" class="bloom ${save.settings.reduced ? 'still' : ''}" aria-hidden="true">✿</div>
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
    byId('bloom').classList.add('still');
    skip.hidden = true;
    byId('ending-map').focus();
  };
  byId('bloom').onanimationend = () => {
    if (document.activeElement === skip) byId('ending-map').focus();
    skip.hidden = true;
  };
  byId('ending-map').onclick = map;
  head();
}

const cues = new Set<string>(['plant', 'fern', 'root', 'shock', 'water', 'warning', 'breach', 'victory', 'defeat', 'pod', 'valve-lock']);

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
        if (effect.at !== game.now) continue;
        if (cues.has(effect.kind)) void sound.cue(effect.kind as Cue);
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
  if (!/^[1-6]$/.test(event.key)) return;
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
    campaign = await response.json() as Campaign;
    if (save.record('raincourt') || settingExists) map();
    else title();
  } catch (error) {
    console.error('Greenhouse content failed to load', error);
    app.innerHTML = '<p class="loading">Không tải được dữ liệu nhà kính. <button id="retry-boot" class="secondary">Thử lại</button></p>';
    byId('retry-boot').onclick = () => { void init(); };
  }
}
void init();
