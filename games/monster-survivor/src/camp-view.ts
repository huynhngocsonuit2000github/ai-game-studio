import { gear, items, slots, stages, statLabels, statsFor } from './campaign-content.ts';
import type { Gear, Slot, Stage, Stats } from './campaign-content.ts';
import type { CampaignRecords, Settlement } from './campaign-save.ts';

const starter = { weapon: 'Wick’s Lantern', armor: 'Wick’s Coat', boots: 'Garden Boots', charm: 'Empty Charm Slot' };
const button = (text: string, action: string, attrs = '') => `<button type="button" data-action="${action}" ${attrs}>${text}</button>`;
const selected = (on: boolean) => `aria-pressed="${on}"`;
const panels = ['stages', 'equipment', 'upgrades'] as const;
export type CampPanel = typeof panels[number];
export type CampSelection = { stage: Stage; panel: CampPanel; slot: Slot; item?: string; message: string };
export type Quote = { item: Gear; rank: number; cost: number };

function deltas(to: Stats, from = statsFor()) {
  return (Object.keys(statLabels) as (keyof Stats)[]).flatMap(key => {
    const delta = Number((to[key] - from[key]).toFixed(2));
    const [label, unit] = statLabels[key];
    return delta ? [`<li>${delta > 0 ? '+' : '−'}${Math.abs(delta)}${unit} ${label}</li>`] : [];
  }).join('');
}

function level(item: Gear | undefined, records: CampaignRecords) {
  return item ? records.data.ranks[item.id] ?? 0 : 0;
}

export function campHtml(state: CampSelection, records: CampaignRecords, time: (seconds: number) => string) {
  const { stage, panel, slot } = state;
  const wallet = records.data.wallet;
  const current = items.get(records.data.equipment[slot] ?? '');
  const item = state.item === 'starter' ? undefined : items.get(state.item ?? '') ?? current;
  const rank = level(item, records);
  const wearing = item?.id === current?.id;
  const stock = [...items.values()].filter(candidate => candidate.slot === slot && Object.hasOwn(records.data.ranks, candidate.id));
  const cost = gear.upgradeCostByTargetRank[(rank + 1) as 1 | 2 | 3];
  const weapon = panel === 'equipment' && slot === 'weapon' ? item : items.get(records.data.equipment.weapon ?? '');
  const chosen = item?.name ?? starter[slot];
  const exact = item ? deltas(statsFor(item, rank)) : '';
  const next = item && cost ? deltas(statsFor(item, rank + 1), statsFor(item, rank)) : '';
  const comparison = item && !wearing ? deltas(statsFor(item, rank), statsFor(current, level(current, records))) : '';
  return `<div class="camp-head"><h2 id="screen-title">Lantern Camp</h2><div class="camp-gold" aria-label="${wallet} gold">◉ ${wallet} gold</div></div>
    <div class="actions camp-tabs" aria-label="Camp sections">${panels.map((key, index) =>
      button(['Stage Select', 'Equipment', 'Upgrades'][index], 'camp-panel-' + key, selected(panel === key))).join('')}</div>
    ${panel === 'stages' ? `<div class="camp-stages" aria-label="Campaign stages">${stages.map((entry, index) => {
      const best = records.data.bestMs[entry.id];
      const open = records.unlocked(entry.id);
      const subtitle = open ? best === undefined ? 'Ready' : 'Cleared · ' + time(best / 1000) : 'Clear ' + stages[index - 1].name;
      return button(`<span>${entry.order}. ${entry.name}</span><small>${subtitle}</small>`, 'stage-' + entry.id,
        `${selected(stage.id === entry.id)} class="stage-choice" ${open ? '' : 'disabled'}`);
    }).join('')}</div>
    <p class="stage-look">${stage.look}</p>
    <div class="actions">${button('Enter ' + stage.name, 'campaign-start', 'class="primary" data-focus')}
      ${button('Title', 'title')}</div>` : `<div class="camp-slots" aria-label="Equipment slots">${slots.map(key => {
      const worn = items.get(records.data.equipment[key] ?? '');
      return button(`<small>${key}</small><span>${worn ? worn.name + ' +' + level(worn, records) : starter[key]}</span>`,
        'slot-' + key, `${selected(slot === key)} class="slot-choice" data-rarity="${worn?.rarity ?? 'common'}"`);
    }).join('')}</div>
    <div class="camp-inventory"><div class="camp-items actions" aria-label="Owned items">
      ${panel === 'equipment' ? button(starter[slot], 'item-starter', selected(!item)) : ''}
      ${stock.map(candidate => button(`${candidate.name} +${level(candidate, records)}`, 'item-' + candidate.id, selected(item?.id === candidate.id))).join('')}
      ${!stock.length ? '<p>Find gear in chests and elite drops.</p>' : ''}
    </div><div class="camp-compare">
      <strong data-rarity="${item?.rarity ?? 'common'}">${chosen}${item ? ' +' + rank : ''}</strong>
      <small>${wearing && panel === 'equipment' ? 'Equipped' : item?.rarity ?? 'Beginner gear'}</small>
      ${item ? `<p>${item.effect}</p><ul>${exact}</ul>` : ''}
      ${comparison ? `<p>Compared with equipped</p><ul>${comparison}</ul>` : ''}
      ${panel === 'upgrades' && item ? cost ? `<p>At +${rank + 1}</p><ul>${next}</ul>` : '<p>Maximum rank</p>' : ''}
    </div>${slot === 'weapon' ? `<div class="camp-weapon" role="img" aria-label="${weapon?.name ?? starter.weapon} shot preview" data-weapon="${weapon?.id ?? 'starter'}" data-rank="${level(weapon, records)}"><i></i><b></b></div>` : ''}</div>
    <div class="actions">
      ${panel === 'equipment' && !wearing && item ? button('Equip ' + item.name, 'equip-item', 'class="primary"') : ''}
      ${panel === 'equipment' && !item && current ? button('Equip ' + starter[slot], 'equip-starter', 'class="primary"') : ''}
      ${panel === 'upgrades' && item && cost ? button(`Upgrade · ${cost} gold`, 'upgrade-item', wallet >= cost ? 'class="primary"' : 'disabled title="More gold required"') : ''}
      ${button('Back to stages', 'camp-panel-stages', 'data-focus')}</div>`}
    <p class="camp-note" role="status">${[state.message, records.status].filter(Boolean).join(' ')}</p>`;
}

export function quoteHtml(quote: Quote) {
  return `<p>Spend ${quote.cost} gold to upgrade ${quote.item.name} to +${quote.rank + 1}?</p>
    <ul>${deltas(statsFor(quote.item, quote.rank + 1), statsFor(quote.item, quote.rank))}</ul>
    <div class="actions">${button('Confirm upgrade', 'upgrade-confirm', 'class="primary"')}
      ${button('Cancel', 'upgrade-cancel', 'data-focus')}</div>`;
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
