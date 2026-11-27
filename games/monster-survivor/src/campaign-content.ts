import gear from '../production/features/ms-campaign-v1/gear.json' with { type: 'json' };
import data from '../production/features/ms-campaign-v1/stages.json' with { type: 'json' };
import { kinLayouts, kinStages } from './kin-maps.ts';
import { pacing } from './campaign-encounters.ts';
import type { Sweep } from './campaign-encounters.ts';
import type { Point } from './sim.ts';

export const slots = ['weapon', 'armor', 'boots', 'charm'] as const;
export type Slot = typeof slots[number];
type Rarity = keyof typeof gear.duplicatesGoldByRarity;
export type Stats = {
  flatMainDamage: number; splashRadiusAddPx: number; burstRadiusAddPx: number;
  maxHpAdd: number; contactReductionPercent: number; projectileReductionPercent: number;
  moveSpeedPercent: number; slowReductionPercent: number; dashCooldownReductionSec: number;
  pickupRadiusAddPx: number; burstDamageAdd: number; spellCooldownReductionPercent: number;
};
export type Gear = { id: string; slot: Slot; rarity: Rarity; name: string; effect: string; stats: Partial<Record<keyof Stats, number[]>> };
export const items = new Map((gear.items as Gear[]).map(item => [item.id, item]));
export const statLabels: Record<keyof Stats, [string, string]> = {
  flatMainDamage: ['Main-shot damage', ''], splashRadiusAddPx: ['Splash radius', ' px'],
  burstRadiusAddPx: ['Burst radius', ' px'], maxHpAdd: ['Maximum HP', ''],
  contactReductionPercent: ['Contact resistance', '%'], projectileReductionPercent: ['Shot resistance', '%'],
  moveSpeedPercent: ['Move speed', '%'], slowReductionPercent: ['Slow resistance', '%'],
  dashCooldownReductionSec: ['Dash cooldown reduction', ' s'], pickupRadiusAddPx: ['Pickup reach', ' px'],
  burstDamageAdd: ['Burst damage', ''], spellCooldownReductionPercent: ['Spell cooldown reduction', '%'],
};
export function statsFor(item?: Gear, rank = 0): Stats {
  const stats = Object.fromEntries(Object.keys(statLabels).map(key => [key, 0])) as Stats;
  for (const key of Object.keys(stats) as (keyof Stats)[]) stats[key] = item?.stats[key]?.[rank] ?? 0;
  return stats;
}

type Chest = { id: string; at: number[]; pool: keyof typeof gear.chests.pools; after?: string };
export type Stage = {
  id: string; order: number; name: string; size: number[]; start: number[]; exit: number[];
  look: string; sweeps: Sweep[]; safetyTimeout: number; ambientCap: number; ambientSec: number;
  chests: Chest[]; firstClearGear: string; goldClear: number; enemyGoldCap: number;
};
export const stages: Stage[] = data.stages.map(({ objectives, ...stage }) => {
  void objectives;
  const chests: Chest[] = stage.chests as Chest[];
  return {
    ...stage, ...pacing[stage.id], chests: chests.map(chest =>
      stage.order === 1 && chest.id === 'orchard-fork' ? { ...chest, at: [850, 553], after: 'patrols' } : chest),
  };
});
export const campaignStages = [...stages, ...kinStages];
export { gear };
export const point = ([x, y]: number[]): Point => ({ x, y });
export const campaignHash = (id: string) => Array.from(id).reduce((hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

type Prop = [number, number, number, string];
export type Layout = { tint: string; path: string; routes: number[][][]; props: Prop[]; decor: string[] };
export const layouts: Record<string, Layout> = {
  ...kinLayouts,
  'bell-orchard': {
    tint: '#69834a38', path: '#caca9474',
    routes: [[[200,570],[430,615],[520,690],[780,635],[1130,730],[1390,560],[1570,560]], [[430,615],[550,390],[790,270],[870,470],[1150,455],[1390,560]]],
    props: [[565,535,34,'arch'],[694,456,29,'thorn'],[735,757,24,'stump'],[1010,560,36,'arch'],[1190,510,27,'stump'],[1230,830,32,'thorn'],[1440,410,36,'arch']],
    decor: ['mushrooms','stump','stones'],
  },
  'venom-marsh': {
    tint: '#137a805c', path: '#76b1a98b',
    routes: [[[210,790],[530,800],[870,570],[1210,450],[1440,360],[1600,330]], [[470,825],[665,1015],[955,1020],[1225,840],[1320,600],[1440,360]]],
    props: [[670,735,38,'broken-bell'],[775,838,48,'thorn'],[945,760,55,'stump'],[1080,676,43,'broken-bell'],[1130,579,42,'thorn'],[1160,953,35,'arch'],[1535,505,41,'thorn']],
    decor: ['thorn','mushrooms','stones'],
  },
  'candle-crypt': {
    tint: '#54578768', path: '#a3a1c587',
    routes: [[[225,620],[565,620],[725,650],[855,650],[1120,650],[1510,630]], [[450,620],[540,390],[650,310],[780,440],[855,650]], [[725,650],[810,839],[1090,824],[1120,650]]],
    props: [[619,483,42,'arch'],[750,510,38,'broken-bell'],[925,515,46,'arch'],[950,778,40,'arch'],[1140,530,35,'broken-bell'],[1140,763,38,'arch'],[1360,794,34,'broken-bell']],
    decor: ['stones','broken-bell','mushrooms'],
  },
  'thorn-gate': {
    tint: '#903c2c70', path: '#a1a7698c',
    routes: [[[220,650],[510,650],[740,480],[1030,340],[1270,300],[1540,475],[1735,650]], [[510,650],[745,838],[1120,960],[1360,1020],[1550,680],[1735,650]]],
    props: [[662,610,46,'thorn'],[760,704,48,'thorn'],[903,615,53,'thorn'],[1020,751,45,'arch'],[1120,550,48,'thorn'],[1250,645,46,'thorn'],[1420,740,33,'thorn'],[1535,600,44,'arch']],
    decor: ['thorn','stump','mushrooms'],
  },
  belltower: {
    tint: '#a56d3750', path: '#dfb98681',
    routes: [[[215,620],[520,600],[915,620],[1080,625],[1450,625],[1820,620]], [[520,600],[580,408],[820,285],[995,440],[1080,625]]],
    props: [[495,450,46,'broken-bell'],[675,555,43,'arch'],[700,730,39,'arch'],[1005,500,42,'arch'],[1000,777,42,'broken-bell'],[1290,365,46,'arch'],[1660,902,44,'broken-bell'],[1800,390,41,'arch']],
    decor: ['stones','broken-bell','stump'],
  },
};
