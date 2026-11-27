import { gear, items, slots, campaignStages as stages, statLabels, statsFor } from './campaign-content.ts';
import { lanternId, lanternPortrait } from './lantern-art.ts';
import type { Gear, Slot, Stage, Stats } from './campaign-content.ts';
import type { CampaignRecords, Settlement } from './campaign-save.ts';

import { tiers } from './kin-save.ts';
import type { KinRecords, KinReward, Pet, Tier } from './kin-save.ts';
import { engravingView, habitat, petNames } from './kin-view.ts';
import { materials, name, number, t } from './locale.ts';

const starter = { weapon: 'Wick’s Lantern', armor: 'Wick’s Coat', boots: 'Garden Boots', charm: 'Empty charm slot' };
const slotPaths = {
  armor: 'M5 6 12 3l3 3h2l3-3 7 3 4 9-6 3-3-4v14H10V14l-3 4-6-3Z',
  boots: 'M10 4h10v13l9 4 1 6H3v-5l7-4Z',
  charm: 'M7 7a13 13 0 0 1 18 0l-9 10ZM16 17l6 6-6 7-6-7Z',
};
const button = (text: string, action: string, attrs = '') => `<button type="button" data-action="${action}" ${attrs}>${text}</button>`;
const selected = (on: boolean) => `aria-pressed="${on}"`;
export type CampSelection = { stage: Stage; tier: Tier; panel: 'stages' | 'armory' | 'habitat' | 'engravings'; pet: Pet; petDemo?: boolean; slot: Slot; item?: string; message: string; forged?: boolean; demo?: boolean };
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
    return `<div><dt>${name(label)}</dt><dd>+${number(current[key], 2)}${unit}${following ? ` <span aria-hidden="true">→</span><b>+${number(following[key], 2)}${unit}</b>` : ''}</dd></div>`;
  }).join('');
}

function stageMap(state: CampSelection, records: CampaignRecords, kin: KinRecords, time: (seconds: number) => string) {
  const { stage, tier } = state;
  const labels = { normal: t('Normal'), elite: t('Elite'), nightmare: t('Nightmare') };
  const best = kin.best(stage.id, tier, records);
  const bonus = tier === 'normal' && stage.order === 6 && best === undefined ? t(petNames['moon-owl'])
    : stage.order === 7 && !kin.data.bonds['moss-turtle'] ? t('Open the Ash Mine rescue cage and reach the exit.')
      : tier === 'normal' && stage.order === 8 && best === undefined ? t('Eclipse Trophy') : '';
  const trophy = kin.best('eclipse-temple', 'normal', records) !== undefined;
  const reward = tier === 'elite' ? best === undefined ? materials(2, 3) : t('Best time can improve')
    : tier === 'nightmare' ? materials(0, best === undefined ? 4 : 1)
      : stage.order >= 6 ? materials(best === undefined ? stage.order - 3 : 0, 0) : name('Campaign gear and gold');
  return `<div class="camp-route" aria-label="${name('Campaign stages')}">${stages.map((entry, index) => {
    const best = kin.best(entry.id, 'normal', records);
    const open = kin.unlocked(entry.id, 'normal', records);
    const status = open ? best === undefined ? t('Ready') : t('Best · {0}', time(best / 1000)) : t('Clear {0}', name(stages[index - 1].name));
    return button(`<i aria-hidden="true">${entry.order}</i><span>${name(entry.name)}</span><small>${status}</small>`, 'stage-' + entry.id,
      `${selected(stage.id === entry.id)} class="stage-choice" ${open ? '' : 'disabled'}`);
  }).join('')}</div>
  <div class="stage-summary"><h3>${name(stage.name)}</h3><p>${name(stage.look)}</p><ol>${stage.sweeps.map(sweep => '<li>' + name(sweep.label) + '</li>').join('')}</ol>
  <div class="tier-options" role="group" aria-label="${t('Difficulty')}">${tiers.map((choice, index) => {
    const open = kin.unlocked(stage.id, choice, records);
    return button(labels[choice] + (open ? '' : '<small>' + t('Clear {0}', labels[tiers[index - 1]]) + '</small>'),
      'tier-' + choice, selected(tier === choice) + (open ? '' : ' disabled'));
  }).join('')}</div><p>${t('Reward · {0}', reward)}${best === undefined ? '' : ' · ' + t('Best · {0}', time(best / 1000))}</p>
  ${bonus ? '<p>' + bonus + '</p>' : ''}
  ${stage.order >= 6 ? '<p>' + t('Treats from caches and rescue are kept on exit.') + '</p>' : ''}</div>
  ${trophy ? `<p class="kin-trophy">◆ ${t('Eclipse Trophy')}</p>` : ''}
  <div class="actions">${button(t('Enter {0}', name(stage.name)), 'campaign-start', 'class="primary" data-focus')}${button(t('Title'), 'title')}</div>`;
}

function armory(state: CampSelection, records: CampaignRecords, quote?: Quote) {
  const { slot } = state;
  const current = items.get(records.data.equipment[slot] ?? '');
  const selectedItem = items.get(state.item ?? '');
  const owned = (item: Gear) => Object.hasOwn(records.data.ranks, item.id);
  const item = state.item === 'starter' ? undefined : selectedItem?.slot === slot && owned(selectedItem) ? selectedItem : current;
  const rank = rankOf(item, records);
  const wearing = item?.id === current?.id;
  const itemName = name(item?.name ?? starter[slot]);
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
      <span class="gear-card-copy"><strong>${name(candidate?.name ?? starter[slot])}</strong>
      <small><span class="rarity-mark" aria-hidden="true"></span>${name(candidate ? grade : slot === 'charm' ? 'Empty' : 'Starter')}${candidate ? ' · +' + level : ''}</small>
      ${equipped ? `<span class="equipped-flag">${t('Equipped')}</span>` : ''}</span>
      ${candidate ? `<span class="gear-pips" aria-label="${t('Rank {0} of 3', level)}">${[1, 2, 3].map(value => `<i data-filled="${value <= level}"></i>`).join('')}</span>` : ''}`;
    return button(text, 'item-' + (candidate?.id ?? 'starter'), `class="gear-card" data-rarity="${grade}" ${selected(active)}`);
  }).join('');
  return `<div class="armory" aria-label="${t('Lantern Camp Armory')}">
    <section class="armory-inventory" aria-label="${t('Gear inventory')}">
      <div class="armory-slots" aria-label="${t('Equipment slots')}">${slots.map(key => {
        const equipped = items.get(records.data.equipment[key] ?? '');
        return button(`<span>${name(key)}</span><small>${equipped ? '+' + rankOf(equipped, records) : t(key === 'charm' ? 'Empty' : 'Starter')}</small>`,
          'slot-' + key, `class="slot-choice" ${selected(key === slot)}`);
      }).join('')}</div>
      <div class="armory-cards">${cards}</div>
      ${stock.length ? '' : `<p class="armory-hint">${t('Find gear in chests and elite drops.')}</p>`}
    </section>
    <section class="armory-showcase" aria-label="${t('Selected equipment')}" data-rarity="${item?.rarity ?? 'common'}"
      data-weapon="${lanternId(item?.id)}" data-rank="${rank}" data-slot="${slot}">
      <div class="showcase-portrait" aria-hidden="true">${ornament(slot, item)}</div>
      <div class="showcase-caption"><h3>${itemName}${item ? ' <span>+' + rank + '</span>' : ''}</h3>
      <p>${name(item?.effect ?? (slot === 'weapon' ? 'Wick’s warm brass starting lantern.' : slot === 'charm' ? 'Choose a charm to fill this slot.' : 'Wick’s starting kit.'))}</p>
      ${wearing ? `<span class="equipped-flag">${t('Equipped')}</span>` :
        button(t('Equip {0}', itemName), item ? 'equip-item' : 'equip-starter', 'class="primary"')}</div>
      ${slot === 'weapon' ? `<div class="attack-demo" data-playing="${Boolean(state.demo)}">
        <span class="test-projectile" aria-hidden="true"></span><span class="test-impact" aria-hidden="true"></span>
      </div>${button(t('Test shot'), 'demo-shot', 'class="demo-button"')}` : ''}
    </section>
    <section class="forge" aria-labelledby="forge-title" data-forged="${Boolean(state.forged)}">
      <div class="forge-header"><h3 id="forge-title">${t('Forge')}</h3><span class="forge-anvil" aria-hidden="true">◆</span></div>
      ${item ? `<div class="forge-path" aria-label="${t('Upgrade path')}">${[0, 1, 2, 3].map(value =>
        `<span data-rank-state="${value === rank ? 'current' : value < rank ? 'complete' : 'upcoming'}" ${value === rank ? 'aria-current="step"' : ''}>+${value}</span>`).join('')}</div>
        <dl class="forge-stats">${statsRows(item, rank, next)}</dl>
        ${quote ? `<div class="forge-quote"><p>${t('Spend {0} gold to forge {1} +{2}?', number(quote.cost), name(quote.item.name), quote.rank + 1)}</p>
          ${button(t('Confirm upgrade'), 'upgrade-confirm', 'class="primary"')}${button(t('Cancel'), 'upgrade-cancel', 'data-focus')}</div>` :
          next && cost ? `<p class="forge-cost">${enough ? t('+{0} to +{1} · {2} gold', rank, next, number(cost)) : t('Needs {0} more gold', number(cost - records.data.wallet))}</p>
          ${button(t('Forge +{0} · {1} gold', next, number(cost)), 'upgrade-item', enough ? 'class="primary"' : 'disabled')}` : `<p class="forge-cost">${t('Maximum rank')}</p>`}` :
        `<p class="forge-cost">${t(slot === 'charm' ? 'Select a charm to forge.' : 'Select collectible gear to forge.')}</p>`}
      <div class="forge-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="camp-note" role="status" tabindex="-1">${[state.message, name(records.status)].filter(Boolean).join(' ')}</p>
    </section>
  </div>`;
}

export function campHtml(state: CampSelection, records: CampaignRecords, kin: KinRecords, time: (seconds: number) => string, quote?: Quote) {
  const headings = { stages: 'Lantern Camp', armory: 'Lantern Armory', habitat: 'Companion Habitat', engravings: 'Engravings' } as const;
  const heading = quote ? 'Confirm upgrade' : headings[state.panel];
  return `<div class="camp-head"><div class="camp-heading"><h2 id="screen-title">${t(heading)}</h2>
    ${state.panel !== 'stages' && !quote ? button(t('Back to stages'), 'camp-panel-stages', 'data-focus') : ''}</div>
    <div class="camp-gold" aria-label="${t('{0} gold', number(records.data.wallet))}">◉ ${t('{0} gold', number(records.data.wallet))}</div></div>
    ${state.panel === 'stages' ? `<div class="kin-choices">
      ${button(t('Armory'), 'camp-panel-armory')}${button(t('Companion Habitat'), 'camp-panel-habitat')}
      ${button(t('Engravings'), 'camp-panel-engravings')}${button(t('Settings'), 'settings')}</div>
      ${stageMap(state, records, kin, time)}` : ''}
    ${state.panel === 'armory' ? armory(state, records, quote) : ''}
    ${state.panel === 'habitat' ? habitat(kin, records, state.pet, !!state.petDemo) : ''}
    ${state.panel === 'engravings' ? engravingView(kin, records) : ''}
    ${kin.status ? `<p class="camp-note" role="status">${name(kin.status)}</p>` : ''}
    ${state.panel === 'stages' && records.status ? `<p class="camp-note" role="status">${name(records.status)}</p>` : ''}`;
}

export function campaignResult(stage: Stage, result: string, elapsed: string, earned: Settlement | undefined, lanternLost: boolean, kinReward?: KinReward, tier: Tier = 'normal') {
  const title = kinReward?.completed ? t('Lantern Kin complete') : earned?.completed ? t('Chapter complete') : result === 'victory' ? t('{0} cleared', name(stage.name)) :
    t(lanternLost ? 'The defense lantern fell' : result === 'time' ? 'Time ran out' : 'Wick’s lantern went out');
  const next = (earned?.firstClear || kinReward?.first && stage.order >= 6 && tier === 'normal') && stages[stage.order];
  return { title, body: `<dl class="summary"><div><dt>${t('Time')}</dt><dd>${elapsed}</dd></div>
    <div><dt>${t('Gold banked')}</dt><dd>+${number(earned?.gold ?? 0)}</dd></div></dl>
    ${tier !== 'normal' ? '<p>' + t(tier === 'elite' ? 'Elite' : 'Nightmare') + '</p>' : ''}
    ${kinReward ? `<p>${t('Reward · {0}', materials(kinReward.treats, kinReward.shards))}</p>
      ${kinReward.pet ? `<p>${t('Companion unlocked · {0}', t(petNames[kinReward.pet]))}</p>` : ''}
      ${kinReward.completed ? `<p class="kin-trophy">◆ ${t('Eclipse Trophy')} · ${t('Wick and the Lantern Kin rekindled the temple.')}</p>` : ''}` : ''}
    ${earned?.completed ? `<p>${t('Bellgrave chapter complete. Mistwood is now open.')}</p>` : ''}
    ${earned?.firstClear ? `<p>${t('First-clear reward · {0}.', earned.firstClearDuplicate ? t('{0} converted to gold', name(items.get(stage.firstClearGear)!.name)) : name(items.get(stage.firstClearGear)!.name))}</p>` : ''}
    ${earned?.items.length ? `<p>${t('New equipment · {0}', earned.items.map(id => name(items.get(id)!.name)).join(' · '))}</p>` : ''}
    ${next ? `<p>${t('Unlocked · {0}', name(next.name))}</p>` : ''}
    <div class="actions">${button(t('Continue'), 'campaign-continue', 'class="primary" data-focus')}
      ${button(t('Retry'), 'campaign-start')}${button(t('Title'), 'title')}</div>` };
}
