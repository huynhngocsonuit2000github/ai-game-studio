import { HZ } from './content.js';
import type { Card, CardId, Content, EnemyId, Hostile } from './content.js';
import { drawPose, loadMotion } from './motion.js';

const sections = { plants: 'Cây', enemies: 'Quái', skills: 'Kỹ năng' };
type Section = keyof typeof sections;
type Entry = { id: string; name: string; role: string; firstSeen?: string; strength?: string; limitation?: string;
  howTo: string; tip: string; related: string[]; spoiler?: boolean; portrait?: string; stats?: Card | Hostile };
type Guide = Record<Section, Entry[]> & Pick<Content, 'drops' | 'bell' | 'rerouteCooldownSeconds'>;
const names: Record<string, string> = {
  idle: 'Đứng yên', walk: 'Di chuyển', windup: 'Lấy đà', gather: 'Gom hạt', release: 'Thả hạt',
  fire: 'Bắn', lash: 'Quất gai', charge: 'Tích điện', spark: 'Phóng sét', brace: 'Trụ vững', mend: 'Hồi sức',
  arm: 'Nạp', armed: 'Sẵn sàng', burst: 'Nổ', bite: 'Ra đòn', heal: 'Chữa đồng đội',
  insulated: 'Chặn điện', restrained: 'Bị giữ chân', signal: 'Báo khóa van', phase: 'Chuyển pha',
  hurt: 'Nhận đòn', fall: 'Gục ngã', enter: 'Xuất hiện', recover: 'Lấy lại thăng bằng',
  hitHeavy: 'Nhận đòn mạnh', wilt: 'Héo khi yếu', biteWindup: 'Lấy đà vồ',
  biteRecovery: 'Thu thế sau khi vồ', blocked: 'Dừng trước vật cản', stunned: 'Bị choáng',
  limp: 'Bước khập khiễng', phaseWalk: 'Bước ở pha hai',
};

export function guideRoute() {
  const [tab, id] = location.hash.split('/').slice(1);
  return { tab: tab && Object.hasOwn(sections, tab) ? tab as Section : 'plants' as Section, id };
}

let data: Promise<Guide> | undefined;
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('đ', 'd');
const number = (value: number) => new Intl.NumberFormat('vi').format(value);

export class FieldGuide {
  readonly node = document.createElement('section');
  private tab: Section = 'plants';
  private chosen = '';
  private reveal = false;
  private raf = 0;
  private generation = 0;
  private guide?: Guide;

  constructor(private back: () => void, private reduced: () => boolean) {
    this.node.className = 'field-guide';
    this.node.innerHTML = `<button id="guide-back" class="secondary">← Quay lại</button>
      <h1 tabindex="-1">Sổ tay Nhà Kính</h1>
      <nav aria-label="Mục sổ tay">${Object.entries(sections).map(([key, label]) =>
        `<button type="button" data-guide-tab="${key}">${label}</button>`).join('')}</nav>
      <div class="guide-layout">
        <div class="guide-list">
          <label>Tìm theo tên <input type="search" id="guide-search" placeholder="Ví dụ: Áo Mưa"></label>
          <label>Lọc vai trò <select id="guide-role"></select></label>
          <div id="guide-matches"></div>
        </div>
        <article id="guide-detail" class="guide-detail" aria-label="Chi tiết"></article>
      </div>`;
    this.get<HTMLButtonElement>('guide-back').onclick = this.back;
    for (const button of this.node.querySelectorAll<HTMLButtonElement>('[data-guide-tab]')) {
      button.onclick = () => this.navigate(button.dataset.guideTab as Section);
    }
    this.get<HTMLInputElement>('guide-search').oninput = () => this.renderList();
    this.get<HTMLSelectElement>('guide-role').onchange = () => this.renderList();
  }

  private get<T extends HTMLElement = HTMLElement>(id: string) {
    return this.node.querySelector<T>('#' + id)!;
  }

  async open() {
    this.node.querySelector('h1')?.focus();
    this.get('guide-detail').textContent = 'Đang mở sổ tay…';
    try {
      this.guide = await (data ??= fetch('./guide.json').then((response) => {
        if (!response.ok) throw new Error('Guide request: ' + response.status);
        return response.json() as Promise<Guide>;
      }).catch((error: unknown) => { data = undefined; throw error; }));
      if (this.node.isConnected) this.route();
    } catch {
      this.get('guide-detail').textContent = 'Chưa tải được sổ tay. Hãy quay lại rồi mở lại.';
    }
  }

  close() {
    this.stopPreview();
    this.reveal = false;
    this.node.remove();
  }

  route() {
    if (!this.guide) return;
    const { tab, id } = guideRoute();
    this.tab = tab;
    this.chosen = id ?? '';
    this.get<HTMLInputElement>('guide-search').value = '';
    const roles = [...new Set(this.guide[tab].map((entry) => entry.role))];
    this.get<HTMLSelectElement>('guide-role').replaceChildren(new Option('Tất cả'),
      ...roles.map((role) => new Option(role)));
    for (const button of this.node.querySelectorAll<HTMLButtonElement>('[data-guide-tab]')) {
      button.setAttribute('aria-pressed', String(button.dataset.guideTab === tab));
    }
    this.renderList();
  }

  private navigate(tab: Section, id?: string) {
    history.pushState(history.state, '', '#so-tay/' + tab + (id ? '/' + id : ''));
    this.route();
  }

  private renderList() {
    if (!this.guide) return;
    const query = normalize(this.get<HTMLInputElement>('guide-search').value.trim());
    const role = this.get<HTMLSelectElement>('guide-role').value;
    const matches = this.guide[this.tab].filter((entry) => normalize(entry.name).includes(query)
      && (role === 'Tất cả' || role === entry.role));
    const selected = matches.find((entry) => entry.id === this.chosen) ?? matches[0];
    this.chosen = selected?.id ?? '';
    const list = this.get('guide-matches');
    list.replaceChildren(...matches.map((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guide-entry';
      button.dataset.guideId = entry.id;
      button.setAttribute('aria-pressed', String(entry === selected));
      button.innerHTML = `${entry.portrait && (!entry.spoiler || this.reveal) ? `<img src="./art/${entry.portrait}" alt="" loading="lazy">` : ''}
        <span><strong>${entry.name}</strong><small>${entry.role}</small></span>`;
      button.onclick = () => {
        history.pushState(history.state, '', '#so-tay/' + this.tab + '/' + entry.id);
        this.chosen = entry.id;
        for (const item of list.querySelectorAll('button')) item.setAttribute('aria-pressed', String(item === button));
        this.renderDetail(entry);
      };
      return button;
    }));
    this.renderDetail(selected);
  }

  private badges(entry: Entry) {
    const guide = this.guide!;
    const stats = entry.stats;
    if (stats && 'cost' in stats) {
      const base = [`${stats.cost} Ánh Hạt`, `${stats.hp} HP`, `Hồi thẻ ${number(stats.placementCooldownSeconds)} giây`];
      switch (stats.id) {
        case 'pitcher': return [...base, `+${stats.payout} mỗi ${stats.payoutSeconds} giây`, `Tối đa ${guide.drops.maxPitchers} bình`];
        case 'orchid': return [...base, `${stats.dryAdditionalTargets + 1} địch khi khô · ${stats.wetAdditionalTargets + 1} khi tưới`];
        case 'moss': return [...base, `+${stats.wetHealPerSecond} HP/giây khi tưới`];
        case 'pod': return [...base, `Nạp ${number(stats.armSeconds)} giây`, `${stats.damage} sát thương`];
        case 'bramble': return [...base, `Giữ ${number(stats.rootSeconds)} giây`];
        case 'fern': return [...base, `Tầm ${number(stats.rangeTiles)} ô`];
      }
    }
    if (stats && 'speedTilesPerSecond' in stats) return [`${stats.hp} HP`, `${number(stats.speedTilesPerSecond)} ô/giây`];
    if (entry.id === 'collect') return [`Tự thu sau ${guide.drops.autoCreditSeconds} giây`];
    if (entry.id === 'water') return [`Đổi van sau ${guide.rerouteCooldownSeconds} giây`];
    if (entry.id === 'bell') return [`${guide.bell.charges} lần mỗi trận`, `Choáng ${number(guide.bell.ordinaryLaneStunSeconds)} giây`];
    return [];
  }

  private renderDetail(entry?: Entry) {
    this.stopPreview();
    const detail = this.get('guide-detail');
    if (!entry) { detail.textContent = 'Không tìm thấy mục phù hợp.'; return; }
    if (entry.spoiler && !this.reveal) {
      detail.innerHTML = `<h2>${entry.name}</h2><button id="guide-reveal" class="secondary">Hiện chi tiết boss</button>`;
      this.get<HTMLButtonElement>('guide-reveal').onclick = () => {
        this.reveal = true;
        this.renderList();
        this.get('guide-entry-title').focus();
      };
      return;
    }
    const related = entry.related.flatMap((id) => Object.keys(sections).flatMap((key) => {
      const tab = key as Section;
      const match = this.guide![tab].find((item) => item.id === id);
      return match ? [`<button class="plain" data-related="${id}" data-tab="${tab}">${match.name}</button>`] : [];
    }));
    detail.innerHTML = `<h2 id="guide-entry-title" tabindex="-1">${entry.name}</h2>
      <p class="guide-role">${entry.role}${entry.firstSeen ? ' · ' + entry.firstSeen : ''}</p>
      <div class="guide-badges">${this.badges(entry).map((badge) => `<span>${badge}</span>`).join('')}</div>
      ${entry.portrait ? `<div class="guide-portrait"><img src="./art/${entry.portrait}" alt="">
        <canvas width="190" height="156" aria-hidden="true" hidden></canvas></div>
        <div class="guide-motion"><label hidden>Động tác <select id="guide-clip"></select></label>
        <button id="guide-preview" class="secondary">Xem chuyển động</button></div>` : ''}
      <dl>${entry.strength ? `<dt>Thế mạnh</dt><dd>${entry.strength}</dd>` : ''}
        ${entry.limitation ? `<dt>Điểm yếu</dt><dd>${entry.limitation}</dd>` : ''}
        <dt>${this.tab === 'enemies' ? 'Đối phó' : 'Dùng khi'}</dt><dd>${entry.howTo}</dd>
        <dt>Mẹo</dt><dd>${entry.tip}</dd></dl>
      <div class="guide-links" aria-label="Mục liên quan">${related.join('')}</div>`;
    for (const button of detail.querySelectorAll<HTMLButtonElement>('[data-related]')) {
      button.onclick = () => {
        this.navigate(button.dataset.tab as Section, button.dataset.related);
        detail.querySelector('h2')?.focus();
      };
    }
    if (entry.portrait) this.get<HTMLButtonElement>('guide-preview').onclick = () => { void this.preview(entry.id as CardId | EnemyId); };
  }

  private stopPreview() {
    this.generation++;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private async preview(id: CardId | EnemyId) {
    const button = this.get<HTMLButtonElement>('guide-preview');
    if (button.dataset.playing) {
      this.stopPreview();
      delete button.dataset.playing;
      button.textContent = 'Xem chuyển động';
      return;
    }
    const generation = ++this.generation;
    button.dataset.playing = 'true';
    button.textContent = 'Dừng';
    const motion = await loadMotion(id);
    if (this.generation !== generation) return;
    if (!motion) { delete button.dataset.playing; button.textContent = 'Thử lại chuyển động'; return; }
    const canvas = this.node.querySelector('canvas')!;
    const ctx = canvas.getContext('2d');
    if (!ctx) { delete button.dataset.playing; button.textContent = 'Xem chuyển động'; return; }
    canvas.hidden = false;
    canvas.previousElementSibling?.setAttribute('hidden', '');
    const select = this.get<HTMLSelectElement>('guide-clip');
    const current = select.value;
    select.parentElement!.hidden = false;
    select.replaceChildren(...Object.keys(motion.unit.clips).map((clip) => new Option(names[clip] ?? clip, clip)));
    if (current) select.value = current;
    let elapsed = 0;
    let last = 0;
    select.onchange = () => {
      elapsed = 0;
      last = 0;
      if (!this.raf) draw(0);
    };
    const draw = (time: number) => {
      if (last && !document.hidden) elapsed += Math.min(time - last, 80);
      last = time;
      const clip = motion.unit.clips[select.value];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height - 19);
      drawPose(ctx, motion, { clip: select.value, age: (elapsed * HZ / 1000) % (clip.durationTicks + (clip.loop ? 0 : 12)) },
        151, this.reduced());
      ctx.restore();
      if (button.dataset.playing && !this.reduced()) this.raf = requestAnimationFrame(draw);
      else this.raf = 0;
    };
    draw(0);
  }
}
