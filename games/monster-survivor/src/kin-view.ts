import { items } from './campaign-content.ts';
import type { CampaignRecords } from './campaign-save.ts';
import { kinArt } from './kin-art.ts';
import { engravings, pets } from './kin-save.ts';
import type { Engraving, KinRecords, Pet } from './kin-save.ts';
import { materials, name, t } from './locale.ts';
import type { Phrase } from './locale.ts';

export const petNames = { 'ember-fox': 'Ember Fox', 'moon-owl': 'Moon Owl', 'moss-turtle': 'Moss Turtle' } as const;
const roles: Record<Pet, Phrase> = {
  'ember-fox': 'A close-range flame strike. Higher bonds pierce more foes.',
  'moon-owl': 'Marks a target to increase hero damage. Prefers elites and bosses.',
  'moss-turtle': 'Blocks an incoming hit, then rests. Higher bonds block more damage.',
};
const unlocks: Record<Pet, Phrase> = {
  'ember-fox': 'Clear Bell Orchard and claim adoption here.',
  'moon-owl': 'Clear Mistwood on Normal.',
  'moss-turtle': 'Open the Ash Mine rescue cage and reach the exit.',
};
export const engravingNames: Record<Engraving, Phrase> = {
  'cinder-chain': 'Cinder Chain', 'searing-brand': 'Searing Brand', ricochet: 'Ricochet',
  refraction: 'Refraction', aftertoll: 'Aftertoll', 'shelter-bell': 'Shelter Bell',
};
const effects: Record<Engraving, Phrase> = {
  'cinder-chain': 'Direct Dart or Comet kills burst for 35% damage within 52 px. Cooldown 0.6 s.',
  'searing-brand': 'Repeated direct hits on a marked enemy deal 16% more damage. Hits refresh the 2.5 s mark.',
  ricochet: 'Direct hits send a shard at another visible foe within 115 px for 35% damage. Cooldown 0.45 s.',
  refraction: 'Rank II Dart splash gains 18 px radius and deals 10% more damage.',
  aftertoll: 'After a Burst hits, a smaller pulse at the original location deals 30% damage 0.45 s later.',
  'shelter-bell': 'When Burst hits, gain 12 guard HP for 3 s.',
};
const button = (text: string, action: string, disabled = false, pressed?: boolean) =>
  `<button type="button" data-action="${action}" ${disabled ? 'disabled' : ''} ${pressed === undefined ? '' : 'aria-pressed="' + pressed + '"'}>${text}</button>`;

export function habitat(kin: KinRecords, old: CampaignRecords, pet: Pet, act: boolean) {
  const equipped = kin.data.pet;
  const bond = kin.data.bonds[pet];
  const cost = bond === 1 ? 3 : 6;
  return `<div class="kin-choices" role="group" aria-label="${t('Companions')}">${pets.map(id =>
    button(t(petNames[id]), 'pet-' + id, false, pet === id)).join('')}</div>
    <div class="kin-habitat" data-pet="${pet}" data-playing="${act}"><img src="${kinArt[pet]}" alt=""></div>
    <div class="kin-info"><h3>${t(petNames[pet])}</h3><p>${t(roles[pet])}</p>
    ${bond ? `<p>${t('Bond {0}/3', bond)}</p><div class="actions">
      ${button(equipped === pet ? t('Unequip') : t('Equip'), equipped === pet ? 'unequip-pet' : 'equip-pet')}
      ${bond < 3 ? button(t('Feed · {0} Treats', cost), 'feed-' + pet + '-' + bond, kin.data.treats < cost) : ''}
      ${button(t('Preview ability'), 'preview-pet')}</div>` :
      `<p>${t(unlocks[pet])}</p>${pet === 'ember-fox' && old.data.cleared.includes('bell-orchard') ? button(t('Adopt Ember Fox'), 'adopt-fox') : ''}`}
    <p>${materials(kin.data.treats, kin.data.shards)}</p></div>`;
}

export function engravingView(kin: KinRecords, old: CampaignRecords) {
  const weapon = old.data.equipment.weapon;
  const options = (Object.keys(engravings) as Engraving[]).filter(id => engravings[id] === weapon);
  if (!weapon || !options.length || old.data.ranks[weapon] !== 3) return `<p>${t('Equip a +3 Ember, Prism or Warden Lantern in the Armory.')}</p>`;
  const equipped = kin.loadout(old).engraving;
  return `<h3>${name(items.get(weapon)!.name)} +3</h3><p>${materials(kin.data.treats, kin.data.shards)}</p>
    <div class="kin-engravings">${options.map(id => {
      const learned = kin.data.learned.includes(id);
      return `<article><h4>${t(engravingNames[id])}</h4><p>${t(effects[id])}</p>
        ${button(equipped === id ? t('Equipped') : learned ? t('Equip') : t('Learn and equip · 3 Sigil Shards'),
          'engrave-' + id, equipped === id || !learned && kin.data.shards < 3, equipped === id)}</article>`;
    }).join('')}</div>${button(t('Remove engraving'), 'erase-engraving', !equipped)}`;
}
