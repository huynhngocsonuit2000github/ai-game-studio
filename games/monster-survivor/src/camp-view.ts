import { gear, items, slots, stages, statLabels, statsFor } from './campaign-content.ts';
import { lanternId, lanternPortrait } from './lantern-art.ts';
import type { Gear, Slot, Stage, Stats } from './campaign-content.ts';
import type { CampaignRecords, Settlement } from './campaign-save.ts';

const starter = { weapon: 'Wick’s Lantern', armor: 'Wick’s Coat', boots: 'Garden Boots', charm: 'Empty charm slot' };
const slotPaths = {
  armor: 'M5 6 12 3l3 3h2l3-3 7 3 4 9-6 3-3-4v14H10V14l-3 4-6-3Z',
  boots: 'M10 4h10v13l9 4 1 6H3v-5l7-4Z',
  charm: 'M7 7a13 13 0 0 1 18 0l-9 10ZM16 17l6 6-6 7-6-7Z',
};
const button = (text: string, action: string, attrs = '') => `<button type="button" data-action="${action}" ${attrs}>${text}</button>`;
const selected = (on: boolean) => `aria-pressed="${on}"`;
export type CampSelection = { stage: Stage; panel: 'stages' | 'armory'; slot: Slot; item?: string; message: string; forged?: boolean; demo?: boolean };
export type Quote = { item: Gear; rank: number; cost: number };

function rankOf(item: Gear | undefined, records: CampaignRecords) {
  return item ? records.data.ranks[item.id] ?? 0 : 0;
}

function ornament(slot: Slot, item?: Gear) {
  return slot === 'weapon'
    ? `<img src="${lanternPortrait(item?.id)}" alt="" width="384" height="384" decoding="async">`
    : `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${slotPaths[slot]}"/></svg>`;
}

function statsRows(item: Gear, rank: number, next?: number) {
  const current = statsFor(item, rank);
  const following = next === undefined ? undefined : statsFor(item, next);
  return (Object.keys(item.stats) as (keyof Stats)[]).map(key => {
    const [label, unit] = statLabels[key];
    return `<div><dt>${label}</dt><dd>+${current[key]}${unit}${following ? ` <span aria-hidden="true">→</span><b>+${following[key]}${unit}</b>` : ''}</dd></div>`;
  }).join('');
}

function stageMap(state: CampSelection, records: CampaignRecords, time: (seconds: number) => string) {
  const { stage } = state;
  return `<div class="camp-route" aria-label="Campaign stages">${stages.map((entry, index) => {
    const best = records.data.bestMs[entry.id];
    const open = records.unlocked(entry.id);
    const status = open ? best === undefined ? 'Ready' : 'Best · ' + time(best / 1000) : 'Clear ' + stages[index - 1].name;
    return button(`<i aria-hidden="true">${entry.order}</i><span>${entry.name}</span><small>${status}</small>`, 'stage-' + entry.id,
      `${selected(stage.id === entry.id)} class="stage-choice" ${open ? '' : 'disabled'}`);
  }).join('')}</div>
  <div class="stage-summary"><h3>${stage.name}</h3><p>${stage.look}</p><ol>${stage.sweeps.map(sweep => '<li>' + sweep.label + '</li>').join('')}</ol></div>
  <div class="actions">${button('Enter ' + stage.name, 'campaign-start', 'class="primary" data-focus')}${button('Title', 'title')}</div>`;
}

function armory(state: CampSelection, records: CampaignRecords, quote?: Quote) {
  const { slot } = state;
  const current = items.get(records.data.equipment[slot] ?? '');
  const selectedItem = items.get(state.item ?? '');
  const owned = (item: Gear) => Object.hasOwn(records.data.ranks, item.id);
  const item = state.item === 'starter' ? undefined : selectedItem?.slot === slot && owned(selectedItem) ? selectedItem : current;
  const rank = rankOf(item, records);
  const wearing = item?.id === current?.id;
  const name = item?.name ?? starter[slot];
  const stock = [...items.values()].filter(candidate => candidate.slot === slot && owned(candidate));
  const next = rank < gear.rankCap ? rank + 1 as 1 | 2 | 3 : undefined;
  const cost = next && gear.upgradeCostByTargetRank[next];
  const enough = Boolean(cost && records.data.wallet >= cost);
  const cards = [undefined, ...stock].map(candidate => {
    const equipped = candidate?.id === current?.id;
    const active = candidate?.id === item?.id;
    const grade = candidate?.rarity ?? 'common';
    const level = rankOf(candidate, records);
    const text = `<span class="gear-card-art">${ornament(slot, candidate)}</span>
      <span class="gear-card-copy"><strong>${candidate?.name ?? starter[slot]}</strong>
      <small><span class="rarity-mark" aria-hidden="true"></span>${candidate ? grade : slot === 'charm' ? 'Empty' : 'Starter'}${candidate ? ' · +' + level : ''}</small>
      ${equipped ? '<span class="equipped-flag">Equipped</span>' : ''}</span>
      ${candidate ? `<span class="gear-pips" aria-label="Rank ${level} of 3">${[1, 2, 3].map(value => `<i data-filled="${value <= level}"></i>`).join('')}</span>` : ''}`;
    return button(text, 'item-' + (candidate?.id ?? 'starter'), `class="gear-card" data-rarity="${grade}" ${selected(active)}`);
  }).join('');
  return `<div class="armory" aria-label="Lantern Camp Armory">
    <section class="armory-inventory" aria-label="Gear inventory">
      <div class="armory-slots" aria-label="Equipment slots">${slots.map(key => {
        const equipped = items.get(records.data.equipment[key] ?? '');
        return button(`<span>${key}</span><small>${equipped ? '+' + rankOf(equipped, records) : key === 'charm' ? 'Empty' : 'Starter'}</small>`,
          'slot-' + key, `class="slot-choice" ${selected(key === slot)}`);
      }).join('')}</div>
      <div class="armory-cards">${cards}</div>
      ${stock.length ? '' : '<p class="armory-hint">Find gear in chests and elite drops.</p>'}
    </section>
    <section class="armory-showcase" aria-label="Selected equipment" data-rarity="${item?.rarity ?? 'common'}"
      data-weapon="${lanternId(item?.id)}" data-rank="${rank}" data-slot="${slot}">
      <div class="showcase-portrait" aria-hidden="true">${ornament(slot, item)}</div>
      <div class="showcase-caption"><h3>${name}${item ? ' <span>+' + rank + '</span>' : ''}</h3>
      <p>${item?.effect ?? (slot === 'weapon' ? 'Wick’s warm brass starting lantern.' : slot === 'charm' ? 'Choose a charm to fill this slot.' : 'Wick’s starting kit.')}</p>
      ${wearing ? '<span class="equipped-flag">Equipped</span>' :
        button('Equip ' + name, item ? 'equip-item' : 'equip-starter', 'class="primary"')}</div>
      ${slot === 'weapon' ? `<div class="attack-demo" data-playing="${Boolean(state.demo)}">
        <span class="test-projectile" aria-hidden="true"></span><span class="test-impact" aria-hidden="true"></span>
      </div>${button('Test shot', 'demo-shot', 'class="demo-button"')}` : ''}
    </section>
    <section class="forge" aria-labelledby="forge-title" data-forged="${Boolean(state.forged)}">
      <div class="forge-header"><h3 id="forge-title">Forge</h3><span class="forge-anvil" aria-hidden="true">◆</span></div>
      ${item ? `<div class="forge-path" aria-label="Upgrade path">${[0, 1, 2, 3].map(value =>
        `<span data-rank-state="${value === rank ? 'current' : value < rank ? 'complete' : 'upcoming'}" ${value === rank ? 'aria-current="step"' : ''}>+${value}</span>`).join('')}</div>
        <dl class="forge-stats">${statsRows(item, rank, next)}</dl>
        ${quote ? `<div class="forge-quote"><p>Spend ${quote.cost} gold to forge ${quote.item.name} +${quote.rank + 1}?</p>
          ${button('Confirm upgrade', 'upgrade-confirm', 'class="primary"')}${button('Cancel', 'upgrade-cancel', 'data-focus')}</div>` :
          next && cost ? `<p class="forge-cost">${enough ? `+${rank} to +${next} · ${cost} gold` : `Needs ${cost - records.data.wallet} more gold`}</p>
          ${button(`Forge +${next} · ${cost} gold`, 'upgrade-item', enough ? 'class="primary"' : 'disabled')}` : '<p class="forge-cost">Maximum rank</p>'}` :
        `<p class="forge-cost">${slot === 'charm' ? 'Select a charm to forge.' : 'Select collectible gear to forge.'}</p>`}
      <div class="forge-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="camp-note" role="status" tabindex="-1">${[state.message, records.status].filter(Boolean).join(' ')}</p>
    </section>
  </div>`;
}

export function campHtml(state: CampSelection, records: CampaignRecords, time: (seconds: number) => string, quote?: Quote) {
  return `<div class="camp-head"><div class="camp-heading"><h2 id="screen-title">${quote ? 'Confirm upgrade' : state.panel === 'armory' ? 'Lantern Armory' : 'Lantern Camp'}</h2>
    ${state.panel === 'armory' ? quote ? '' : button('Back to stages', 'camp-panel-stages', 'data-focus') : button('Armory', 'camp-panel-armory')}</div>
    <div class="camp-gold" aria-label="${records.data.wallet} gold">◉ ${records.data.wallet} gold</div></div>
    ${state.panel === 'stages' ? stageMap(state, records, time) : armory(state, records, quote)}
    ${state.panel === 'stages' && records.status ? `<p class="camp-note" role="status">${records.status}</p>` : ''}`;
}

export function campaignResult(stage: Stage, result: string, elapsed: string, earned: Settlement | undefined, lanternLost: boolean) {
  const title = earned?.completed ? 'Campaign complete' : result === 'victory' ? stage.name + ' cleared' :
    lanternLost ? 'The defense lantern fell' : result === 'time' ? 'Time ran out' : 'Wick’s lantern went out';
  const next = earned?.firstClear && stages[stage.order];
  return { title, body: `<dl class="summary"><div><dt>Time</dt><dd>${elapsed}</dd></div>
    <div><dt>Gold banked</dt><dd>+${earned?.gold ?? 0}</dd></div></dl>
    ${earned?.firstClear ? `<p>First-clear reward · ${items.get(stage.firstClearGear)!.name}${earned.firstClearDuplicate ? ' converted to gold' : ''}.</p>` : ''}
    ${earned?.items.length ? '<p>New equipment · ' + earned.items.map(id => items.get(id)!.name).join(' · ') + '</p>' : ''}
    ${next ? '<p>Unlocked · ' + next.name + '</p>' : ''}
    <div class="actions">${button('Continue', 'campaign-continue', 'class="primary" data-focus')}
      ${button('Retry', 'campaign-start')}${button('Title', 'title')}</div>` };
}
