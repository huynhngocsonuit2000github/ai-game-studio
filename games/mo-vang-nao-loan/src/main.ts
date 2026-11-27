import { Art } from './art.js';
import { Mine, SHOP, STEP, newEntry } from './mine.js';
import type { Entry, MineEvent, Scenario, Supply } from './mine.js';
import { loadSettings, restore, save, saveSettings } from './save.js';
import type { Save } from './save.js';
import { Sound } from './sound.js';

function element<T extends HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

type GameOptions = {
  fixture?: Scenario & { title: string; intro: string; guide: string };
  diagnostics?: boolean;
};

export function startGame({ fixture, diagnostics = false }: GameOptions = {}) {
  const canvas = element<HTMLCanvasElement>('mine');
  const field = element('field');
  const panel = element('panel');
  const panelContent = element('panel-content');
  const clock = element('clock');
  const shortfall = element('shortfall');
  const wallet = element('wallet');
  const progress = element('progress');
  const effects = element('effects');
  const hint = element('hint');
  const action = element<HTMLButtonElement>('action');
  const soundButton = element<HTMLButtonElement>('sound');
  const motionButton = element<HTMLButtonElement>('motion');
  const feedback = element('feedback');
  const guide = document.createElement('p');
  if (fixture) {
    guide.id = 'fixture-guide';
    guide.className = 'fixture-guide';
    guide.textContent = fixture.guide;
    guide.hidden = true;
    field.append(guide);
  }
  const shift = element('shift');
  const art = new Art(canvas);
  const sound = new Sound();
  const settings = loadSettings();
  let stored: Save = fixture ? { version: 1, location: 'entry', entry: newEntry() } : restore();
  let mine = new Mine(stored.entry, fixture);
  let fixtureActive = !!fixture;
  type Screen = 'menu' | 'playing' | 'paused' | 'failed' | 'shop';
  let screen: Screen = 'menu';
  let lastFrame: number | undefined;
  let accumulator = 0;
  let feedbackUntil = 0;
  let eventCursor = 0;
  let scanOrigin = 0;
  let scanIndex = -1;
  let lastControl = -Infinity;
  let spaceDown = false;
  let shopMessage = 'Mỗi món dùng một lần. Thuốc và nam châm được bật cho ca tiếp theo khi mua.';
  const frameSamples: number[] = [];
  const number = new Intl.NumberFormat('vi-VN');
  const timeNumber = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function setText(node: HTMLElement, value: string) {
    if (node.textContent !== value) node.textContent = value;
  }

  function persist() {
    if (!fixture) save(stored);
  }

  function makeButton(label: string, handler: () => void, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = className;
    button.addEventListener('click', () => {
      sound.unlock();
      handler();
    });
    return button;
  }

  function showPanel(title: string, description: string) {
    panelContent.replaceChildren();
    const heading = document.createElement('h2');
    heading.id = 'panel-title';
    heading.textContent = title;
    panel.setAttribute('aria-labelledby', heading.id);
    const text = document.createElement('p');
    text.textContent = description;
    panelContent.append(heading, text);
    panel.hidden = false;
  }

  function panelButtons(...buttons: HTMLButtonElement[]) {
    const group = document.createElement('div');
    group.className = 'buttons';
    group.append(...buttons);
    panelContent.append(group);
  }

  function showMenu() {
    const fromShop = stored.location === 'shop';
    showPanel(
      fixture?.title ?? 'Vào ca đào',
      fixture?.intro ?? 'Căn hướng dây móc để kéo đủ 600 vàng trong 75 giây. Sau ca thành công, dùng vàng còn trong ví để mua tiếp tế.',
    );
    const buttons = [makeButton(fromShop ? 'Vào quầy tiếp tế' : 'Bắt đầu', begin, 'primary')];
    if (fromShop || stored.entry.practice) buttons.push(makeButton('Chơi lại từ đầu', fresh));
    panelButtons(...buttons);
  }

  function begin() {
    if (stored.location === 'shop') {
      showShop();
      syncHud();
      return;
    }
    start(stored.entry, fixture);
  }

  function start(entry: Entry, scenario?: Scenario) {
    stored = { version: 1, location: 'entry', entry };
    persist();
    mine = new Mine(entry, scenario);
    fixtureActive = !!scenario;
    screen = 'playing';
    frameSamples.length = 0;
    eventCursor = 0;
    feedbackUntil = 0;
    accumulator = 0;
    lastFrame = undefined;
    lastControl = performance.now();
    panel.hidden = true;
    feedback.hidden = true;
    syncHud();
  }

  function fresh() {
    start(newEntry(), fixture);
  }

  function pause() {
    screen = 'paused';
    accumulator = 0;
    lastFrame = undefined;
    spaceDown = false;
    showPanel('Tạm dừng', 'Đồng hồ đứng yên. Nhấn Space hoặc chạm để tiếp tục.');
    panelButtons(makeButton('Tiếp tục', resume, 'primary'));
    syncHud();
  }

  function resume() {
    if (document.hidden) return;
    screen = 'playing';
    panel.hidden = true;
    lastControl = performance.now();
    lastFrame = undefined;
    syncHud();
  }

  function practice() {
    start({ ...stored.entry, practice: true });
  }

  function purchase(id: Supply) {
    const item = SHOP.find((supply) => supply.id === id)!;
    const current = stored.entry;
    if (current.wallet < item.price) {
      shopMessage = 'Ví vàng chưa đủ để mua món này.';
    } else {
      const entry = structuredClone(current);
      entry.wallet -= item.price;
      entry.inventory[id]++;
      if (id !== 'scissors') entry.armed[id] = true;
      stored = { ...stored, entry };
      persist();
      shopMessage = 'Đã mua ' + item.name.toLocaleLowerCase('vi') + '.';
      sound.play('buy');
    }
    refreshShop();
    syncHud();
  }

  function toggleArm(id: 'potion' | 'magnet') {
    if (!stored.entry.inventory[id]) return;
    const entry = structuredClone(stored.entry);
    entry.armed[id] = !entry.armed[id];
    stored = { ...stored, entry };
    persist();
    shopMessage = entry.armed[id] ? 'Đã bật cho ca tiếp theo.' : 'Đã cất lại vào túi.';
    refreshShop();
  }

  function showShop() {
    screen = 'shop';
    scanOrigin = performance.now();
    scanIndex = -1;
    showPanel('Quầy tiếp tế', 'Dùng Space khi viền sáng đến lựa chọn, hoặc chạm trực tiếp.');
    const status = document.createElement('p');
    status.className = 'details';
    status.id = 'shop-status';
    status.setAttribute('role', 'status');
    const cards = document.createElement('div');
    cards.className = 'shop-grid';
    for (const item of SHOP) {
      const card = makeButton('', () => purchase(item.id), 'shop-card shop-target');
      card.id = 'buy-' + item.id;
      const title = document.createElement('span');
      title.className = 'item-title';
      const icon = document.createElement('img');
      icon.src = './art/' + item.id + '.png';
      icon.alt = '';
      title.append(icon, item.name);
      const detail = document.createElement('small');
      detail.textContent = item.detail;
      const price = document.createElement('b');
      price.textContent = item.price + ' vàng';
      const stock = document.createElement('b');
      stock.className = 'item-stock';
      stock.id = 'stock-' + item.id;
      card.append(title, detail, price, stock);
      cards.append(card);
    }
    panelContent.append(cards, status);
    panelButtons(
      makeButton('Bỏ qua · Tập lại Mỏ 1', practice, 'primary shop-target'),
      makeButton('Chơi lại từ đầu', fresh),
      ...(['potion', 'magnet'] as const).map((id) => {
        const button = makeButton('', () => toggleArm(id));
        button.id = 'arm-' + id;
        return button;
      }),
    );
    refreshShop();
    updateScan(scanOrigin);
  }

  function refreshShop() {
    setText(element('shop-status'), shopMessage);
    for (const item of SHOP) {
      const entry = stored.entry;
      const armed = item.id !== 'scissors' && entry.armed[item.id];
      const stock = element('stock-' + item.id);
      setText(stock, 'Có ' + entry.inventory[item.id] + (armed ? ' · Đã bật' : ''));
      element('buy-' + item.id).classList.toggle('conditional', entry.wallet < item.price);
      if (item.id !== 'scissors') {
        const button = element<HTMLButtonElement>('arm-' + item.id);
        button.hidden = entry.inventory[item.id] === 0;
        setText(button, (armed ? 'Cất ' : 'Bật ') + (item.id === 'potion' ? 'thuốc' : 'nam châm'));
        button.setAttribute('aria-pressed', String(armed));
      }
    }
  }

  function updateScan(now: number) {
    const buttons = Array.from(panelContent.querySelectorAll<HTMLButtonElement>('.shop-target'));
    const index = Math.floor((now - scanOrigin) / 1200) % buttons.length;
    if (scanIndex === index) return;
    scanIndex = index;
    buttons.forEach((button, buttonIndex) => button.classList.toggle('scanned', buttonIndex === index));
  }

  function notice(message: string) {
    feedbackUntil = mine.time + 2.7;
    setText(feedback, message);
    feedback.hidden = false;
  }

  function resolveShift(passed: boolean) {
    if (passed) {
      const entry = newEntry();
      entry.wallet = mine.wallet;
      entry.inventory = { ...mine.inventory };
      entry.practice = mine.entry.practice;
      stored = { version: 1, location: 'shop', entry };
      persist();
      shopMessage = 'Đủ chỉ tiêu. Vàng trong ví dùng được ở quầy.';
      sound.play('pass');
      showShop();
    } else {
      screen = 'failed';
      sound.play('fail');
      showPanel('Hết giờ!', 'Còn thiếu ' + number.format(mine.quota - mine.earnings) +
        ' vàng. Thử lại để trở về ví, túi đồ và kho báu lúc vào ca.');
      panelButtons(makeButton('Thử lại', () => start(mine.entry, fixtureActive ? fixture : undefined), 'primary'));
    }
  }

  function processEvent(event: MineEvent) {
    if (event.action === 'cast') sound.play('cast');
    if (event.action === 'latch' && event.target) sound.play('heavy');
    if (event.action === 'empty') {
      sound.play('empty');
      notice('Móc trống. Canh góc rồi thử lại.');
    }
    if (event.action === 'cut') {
      sound.play('cut');
      notice('Đã cắt dây · còn ' + mine.inventory.scissors + ' kéo');
    }
    if (event.action === 'bank') {
      sound.play(event.roll === 'cash' ? 'jackpot' : 'gold');
      if (event.roll === 'supply') notice('Rương có vật phẩm! Xem trong túi ở quầy.');
      else if (event.roll === 'rock') notice('Rương chỉ có đá · +15 vàng');
      else notice((event.roll === 'cash' ? 'Trúng rương vàng! · ' : '') + '+' + number.format(event.value ?? 0) + ' vàng');
    }
    if (event.action === 'result') resolveShift(event.passed === true);
  }

  function refreshEffects() {
    const active: string[] = [];
    if (mine.effects.potion > 0) active.push('Thuốc · ' + Math.ceil(mine.effects.potion) + ' s');
    if (mine.effects.magnet > 0) active.push('Nam châm · ' + Math.ceil(mine.effects.magnet) + ' s');
    effects.hidden = active.length === 0 || screen !== 'playing';
    if (effects.dataset.active === active.join('|')) return;
    effects.dataset.active = active.join('|');
    effects.replaceChildren(...active.map((label) => {
      const tag = document.createElement('span');
      tag.className = 'effect';
      tag.textContent = label;
      return tag;
    }));
  }

  function syncHud() {
    const playing = screen === 'playing';
    const shopping = screen === 'shop';
    const short = shopping ? 0 : Math.max(0, mine.quota - mine.earnings);
    const remaining = shopping ? 0 : mine.remaining;
    setText(clock, timeNumber.format(Math.ceil(Math.max(0, remaining - 1e-8) * 10) / 10) + ' s');
    const amount = short > 0 ? number.format(short) + ' vàng' : 'Đủ chỉ tiêu';
    setText(shortfall, amount);
    setText(wallet, number.format(shopping ? stored.entry.wallet : mine.wallet) + ' vàng');
    clock.classList.toggle('urgent', remaining <= 10 && short > 0);
    shortfall.classList.toggle('met', short === 0);
    progress.style.width = 100 * (mine.quota - short) / mine.quota + '%';
    progress.parentElement?.setAttribute('aria-valuenow', String(mine.quota - short));
    field.classList.toggle('playing', playing);
    guide.hidden = !(fixtureActive && playing && mine.phase === 'aim' && mine.earnings < mine.quota);
    feedback.hidden = !playing || mine.time >= feedbackUntil;
    action.hidden = !playing;
    action.disabled = mine.phase !== 'aim' && !mine.canCut;
    action.classList.toggle('cut', mine.canCut);
    setText(action, mine.canCut ? 'Cắt dây' : mine.phase === 'aim' ? 'Thả móc' : 'Đang kéo / thả');
    setText(shift, fixtureActive ? 'THỬ THÁCH' : mine.entry.practice ? 'TẬP LẠI · MỎ 01' : 'MỎ 01');
    if (playing) {
      const label = mine.canCut ? 'Space hoặc chạm để cắt dây và bỏ vật đang kéo.' :
        mine.phase !== 'aim' ? 'Vàng chỉ vào ví khi móc về tới mặt đất.' :
        'Canh hướng móc rồi nhấn Space hoặc chạm vào mỏ.';
      setText(hint, label);
    } else {
      setText(hint, screen === 'shop' ? 'Ca tập dùng vàng và đồ còn lại trong túi.' : 'Space hoặc chạm để chọn.');
    }
    refreshEffects();
  }

  function trigger() {
    sound.unlock();
    if (screen === 'menu') begin();
    else if (screen === 'failed') start(mine.entry, fixtureActive ? fixture : undefined);
    else if (screen === 'paused') resume();
    else if (screen === 'shop') panelContent.querySelector<HTMLButtonElement>('.scanned')?.click();
    else if (performance.now() - lastControl >= 85 && mine.press()) {
      lastControl = performance.now();
      syncHud();
    }
  }

  function syncSettings() {
    sound.setMuted(settings.mute);
    for (const [button, active, label] of [
      [soundButton, settings.mute, settings.mute ? 'Bật âm thanh' : 'Tắt âm thanh'],
      [motionButton, settings.reduced, settings.reduced ? 'Bật chuyển động trang trí' : 'Giảm chuyển động'],
    ] as const) {
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }

  soundButton.addEventListener('click', () => {
    settings.mute = !settings.mute;
    syncSettings();
    sound.unlock();
    saveSettings(settings);
  });
  motionButton.addEventListener('click', () => {
    settings.reduced = !settings.reduced;
    syncSettings();
    saveSettings(settings);
  });
  action.addEventListener('click', trigger);
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || spaceDown || screen !== 'playing') return;
    event.preventDefault();
    trigger();
  });
  addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLAnchorElement || target === soundButton || target === motionButton) return;
    event.preventDefault();
    if (event.repeat || spaceDown) return;
    spaceDown = true;
    if (target instanceof HTMLButtonElement && panelContent.contains(target)) target.click();
    else trigger();
  });
  addEventListener('keyup', (event) => {
    if (event.code === 'Space') spaceDown = false;
  });
  addEventListener('blur', () => { spaceDown = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'playing') pause();
  });

  if (diagnostics) {
    Object.defineProperty(window, 'mineDiagnostics', {
      value: () => structuredClone({
        screen, fixtureActive, time: mine.time, remaining: mine.remaining, earnings: mine.earnings,
        wallet: screen === 'shop' ? stored.entry.wallet : mine.wallet, inventory: mine.inventory,
        entry: screen === 'shop' ? stored.entry : mine.entry, angle: mine.angle, phase: mine.phase,
        target: mine.target?.id, distance: mine.distance, canCut: mine.canCut, treasure: mine.treasure,
        effects: mine.effects, result: mine.result, events: mine.events, frameSamples,
      }),
    });
  }

  function frame(now: number) {
    if (screen === 'playing') {
      if (lastFrame !== undefined) {
        const interval = now - lastFrame;
        if (diagnostics && interval > 0 && frameSamples.length < 900) frameSamples.push(interval);
        accumulator += Math.min(.1, interval / 1000);
      }
      lastFrame = now;
      while (accumulator >= STEP && mine.result === undefined) {
        mine.step();
        accumulator -= STEP;
      }
      while (eventCursor < mine.events.length) processEvent(mine.events[eventCursor++]);
      syncHud();
    } else if (screen === 'shop' && !document.hidden) updateScan(now);
    art.draw(mine, settings.reduced);
    requestAnimationFrame(frame);
  }

  syncSettings();
  if (stored.location === 'shop') showShop();
  else showMenu();
  syncHud();
  requestAnimationFrame(frame);
}
