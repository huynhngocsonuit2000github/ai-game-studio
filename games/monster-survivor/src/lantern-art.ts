import wick from '../assets/runtime/campaign-armory/wick-lantern.webp?url';
import ember from '../assets/runtime/campaign-armory/ember-lantern.webp?url';
import prism from '../assets/runtime/campaign-armory/prism-lantern.webp?url';
import warden from '../assets/runtime/campaign-armory/warden-lantern.webp?url';

const portraits = { 'wick-lantern': wick, 'ember-lantern': ember, 'prism-lantern': prism, 'warden-lantern': warden };
export type LanternId = keyof typeof portraits;
export function lanternId(id?: string): LanternId {
  return id && Object.hasOwn(portraits, id) ? id as LanternId : 'wick-lantern';
}
export const lanternPortrait = (id?: string) => portraits[lanternId(id)];
