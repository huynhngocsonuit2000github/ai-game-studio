import type { Layout, Stage } from './campaign-content.ts';
import type { Encounter, Pack } from './campaign-encounters.ts';

type Stop = { id: string; label: string; at: number[]; kind: 'cache' | 'cage'; treats: number };
const wave = (seedling: number, moth: number, scarab = 0): Pack => ({ seedling, moth, scarab });
const encounter = (id: string, label: string, at: number[], packs: Pack[], details: Partial<Encounter> = {}): Encounter =>
  ({ id, label, at, waves: packs.map(pack => ({ pack })), ...details });

export const kinStages: Stage[] = [
  {
    id: 'mistwood', order: 6, name: 'Mistwood', size: [2080, 1340], start: [220, 900], exit: [1900, 450],
    look: 'Light the waymarks in order and follow the clearings to the Fog Keeper.',
    safetyTimeout: 570, ambientCap: 22, ambientSec: 7.5, firstClearGear: '', goldClear: 0, enemyGoldCap: 0, chests: [],
    sweeps: [
      { id: 'west-waymark', label: 'Light the willow waymark', encounters: [
        encounter('willow', 'Willow Waymark', [540, 880], [wave(12, 6), wave(10, 9, 2), { ...wave(9, 7, 2), 'ash-burrower': 1 }, wave(13, 8, 3), wave(12, 10, 2)], { waymark: true }),
      ] },
      { id: 'ford-waymark', label: 'Light the ford waymark', encounters: [
        encounter('ford-light', 'Ford Waymark', [940, 570], [wave(12, 9, 3), { ...wave(10, 7, 2), 'bulwark-beetle': 1 }, wave(12, 9, 3), { ...wave(8, 10, 3), 'ash-burrower': 1 }, wave(10, 11, 4)], { waymark: true }),
      ] },
      { id: 'ridge-waymark', label: 'Light the ridge waymark', encounters: [
        encounter('ridge-light', 'Ridge Waymark', [1300, 780], [wave(11, 9, 2), { ...wave(8, 8, 3), 'moth-shaman': 1 }, wave(13, 9, 3), wave(9, 10, 3), { ...wave(10, 8, 4), 'bulwark-beetle': 1 }], { waymark: true }),
      ] },
      { id: 'fog-keeper', label: 'Defeat the Fog Keeper', encounters: [
        encounter('keeper-court', 'Fog Keeper', [1740, 500], [wave(10, 9, 2), { ...wave(9, 8, 3), 'moth-shaman': 1 }], { enemy: 'fog-keeper' }),
      ] },
    ],
  },
  {
    id: 'ash-mine', order: 7, name: 'Ash Mine', size: [2200, 1400], start: [220, 700], exit: [2000, 710],
    look: 'Defeat both foundry guards, then take the furnace court. A cage and supply cache lie off the main route.',
    safetyTimeout: 590, ambientCap: 23, ambientSec: 7.6, firstClearGear: '', goldClear: 0, enemyGoldCap: 0, chests: [],
    sweeps: [
      { id: 'foundry-guards', label: 'Defeat both foundry guards', encounters: [
        encounter('north-foundry', 'North Foundry Guard', [710, 450], [
          wave(11, 9, 3), { ...wave(11, 9, 3), 'bulwark-beetle': 1 }, wave(10, 10, 4), wave(9, 10, 3), wave(12, 8, 3), { ...wave(8, 9, 3), bells: 4 },
        ], { enemy: 'thornback', hpScale: 1.24 }),
        encounter('south-foundry', 'South Foundry Guard', [850, 930], [
          wave(10, 8, 4), { ...wave(10, 10, 3), 'ash-burrower': 2 }, { ...wave(10, 8, 3), 'moth-shaman': 1 }, wave(9, 10, 4), wave(12, 8, 4), { ...wave(8, 8, 4), bottle: 4 },
        ], { enemy: 'discord', hpScale: 1.05 }),
      ] },
      { id: 'furnace', label: 'Defeat the Furnace Overseer', encounters: [
        encounter('furnace-court', 'Furnace Overseer', [1650, 690], [
          wave(12, 10, 3), { ...wave(10, 9, 3), 'ash-burrower': 1 }, wave(13, 9, 4), { ...wave(10, 9, 3), 'bulwark-beetle': 1, 'moth-shaman': 1 }, wave(10, 10, 4),
        ], { enemy: 'furnace-overseer' }),
      ] },
    ],
  },
  {
    id: 'eclipse-temple', order: 8, name: 'Eclipse Temple', size: [2250, 1380], start: [240, 700], exit: [2060, 700],
    look: 'Break both pillars, defeat the Eclipse Warden and leave through the temple gate.',
    safetyTimeout: 610, ambientCap: 24, ambientSec: 8, firstClearGear: '', goldClear: 0, enemyGoldCap: 0, chests: [],
    sweeps: [
      { id: 'eclipse-pillars', label: 'Break both eclipse pillars', encounters: [
        encounter('north-pillar', 'North Pillar', [740, 480], [
          wave(14, 9, 2), { ...wave(11, 9, 3), 'moth-shaman': 1 }, wave(11, 11, 3), { ...wave(10, 10, 3), bells: 4 }, wave(10, 10, 4),
        ], { nestHp: 240 }),
        encounter('south-pillar', 'South Pillar', [920, 930], [
          wave(12, 10, 4), { ...wave(10, 8, 3), 'bulwark-beetle': 1 }, wave(13, 9, 4), { ...wave(10, 9, 4), bottle: 4 }, wave(9, 12, 3),
        ], { nestHp: 240 }),
      ] },
      { id: 'eclipse-court', label: 'Defeat the Eclipse Warden', encounters: [
        encounter('warden-court', 'Eclipse Warden', [1650, 690], [
          wave(14, 10, 3), { ...wave(12, 8, 3), 'ash-burrower': 2 }, wave(11, 11, 4), { ...wave(8, 9, 4), 'moth-shaman': 2 }, wave(10, 11, 5),
        ], { enemy: 'eclipse-warden' }),
      ] },
    ],
  },
];

export const stops: Record<string, Stop[]> = {
  mistwood: [{ id: 'flooded-cache', label: 'Flooded Cache', at: [880, 305], kind: 'cache', treats: 2 }],
  'ash-mine': [
    { id: 'rescue-cage', label: 'Moss Turtle Rescue', at: [1300, 390], kind: 'cage', treats: 0 },
    { id: 'mine-supplies', label: 'Mine Supplies', at: [1310, 1040], kind: 'cache', treats: 2 },
  ],
  'eclipse-temple': [{ id: 'temple-cache', label: 'Alcove Cache', at: [1110, 320], kind: 'cache', treats: 2 }],
};

export const kinLayouts: Record<string, Layout> = {
  mistwood: {
    tint: '#457d863e', path: '#a0cac792',
    routes: [[[220,900],[540,880],[730,744],[940,570],[1140,645],[1300,780],[1485,704],[1740,500],[1900,450]],
      [[625,835],[655,570],[735,395],[880,305],[1020,405],[940,570]]],
    props: [[476,702,37,'stump'],[625,940,38,'thorn'],[800,560,42,'arch'],[910,728,34,'stump'],[1070,490,42,'thorn'],
      [1190,820,47,'stump'],[1328,625,49,'arch'],[1480,535,36,'stump'],[1585,790,43,'thorn'],[1820,660,37,'arch']],
    decor: ['stones','stump','mushrooms'],
  },
  'ash-mine': {
    tint: '#a54b3650', path: '#e4aa896a',
    routes: [[[220,700],[420,700],[510,523],[710,450],[1050,450],[1300,390],[1430,540],[1500,690],[1650,690],[2000,710]],
      [[420,700],[525,887],[850,930],[1090,1020],[1310,1040],[1460,865],[1500,690]]],
    props: [[630,625,55,'stones'],[750,654,65,'broken-bell'],[885,670,64,'stones'],[1000,650,55,'arch'],
      [1125,690,65,'stones'],[1260,690,55,'broken-bell'],[1530,460,50,'arch'],[1570,900,44,'stones'],[1810,890,42,'broken-bell']],
    decor: ['stones','broken-bell','stump'],
  },
  'eclipse-temple': {
    tint: '#4d407b67', path: '#e3c4ee78',
    routes: [[[240,700],[420,705],[585,540],[740,480],[930,392],[1110,320],[1240,450],[1460,655],[1650,690],[2060,700]],
      [[420,705],[605,820],[920,930],[1140,915],[1430,790],[1460,655]]],
    props: [[570,670,45,'arch'],[747,691,52,'broken-bell'],[965,635,57,'arch'],[1102,713,50,'arch'],
      [1260,610,51,'broken-bell'],[1325,925,40,'arch'],[1520,410,44,'arch'],[1530,992,44,'arch'],[1870,455,44,'arch'],[1870,935,44,'arch']],
    decor: ['arch','stones','broken-bell'],
  },
};
