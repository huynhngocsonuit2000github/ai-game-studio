export type Pack = Record<string, number>;

type Formation = { pack: Pack; flank?: number; reach?: number };
export type Encounter = {
  id: string;
  label: string;
  at: number[];
  waves: Formation[];
  enemy?: string;
  hpScale?: number;
  nestHp?: number;
  defenseHp?: number;
  recoveryAfter?: number;
};
export type Sweep = { id: string; label: string; encounters: Encounter[]; chooseCrossing?: true };
type Pacing = { safetyTimeout: number; ambientCap: number; ambientSec: number; sweeps: Sweep[] };

const pack = (seedling: number, moth = 0, scarab = 0, bottle = 0, bells = 0): Pack =>
  Object.fromEntries(Object.entries({ seedling, moth, scarab, bottle, bells }).filter(([, count]) => count > 0));
const encounter = (id: string, label: string, at: number[], waves: (Pack | Formation)[], detail: Partial<Encounter> = {}): Encounter =>
  ({ id, label, at, waves: waves.map(wave => typeof wave.pack === 'object' ? wave as Formation : { pack: wave as Pack }), ...detail });

export const pacing: Record<string, Pacing> = {
  'bell-orchard': {
    safetyTimeout: 480, ambientCap: 22, ambientSec: 7,
    sweeps: [
      { id: 'patrols', label: 'Sweep the orchard', encounters: [
        encounter('west', 'West Orchard', [515, 695], [pack(9, 2), pack(11, 3), pack(10, 4), pack(9, 7, 2)]),
        encounter('north', 'Broken Arches', [790, 385], [pack(12, 3), pack(8, 7, 1), pack(10, 4, 1), pack(8, 8, 2)]),
      ] },
      { id: 'checkpoint', label: 'Break the checkpoint', encounters: [
        encounter('checkpoint', 'Bramble Checkpoint', [1115, 712], [
          pack(10, 5, 2), { pack: pack(9, 8, 1), flank: -.9 }, { pack: pack(6, 9, 2), flank: .85 },
          pack(11, 5, 3), pack(9, 7, 3), pack(8, 10, 2), pack(9, 8, 2), { pack: pack(10, 10, 3), flank: .4, reach: 255 }, { pack: pack(9, 9, 3), flank: 1.4, reach: 300 }, pack(7, 9, 3),
        ], { nestHp: 185 }),
      ] },
      { id: 'thornback', label: 'Defeat Thornback', encounters: [
        encounter('thornback', 'Thornback Captain', [1390, 568], [pack(13, 7, 2), pack(10, 6, 2), { pack: pack(11, 10, 2), flank: -.8 }, pack(8, 10, 1)], { enemy: 'thornback', hpScale: 1.28 }),
      ] },
    ],
  },
  'venom-marsh': {
    safetyTimeout: 480, ambientCap: 22, ambientSec: 6,
    sweeps: [
      { id: 'near-nest', label: 'Destroy the near nest', encounters: [
        encounter('near-nest', 'Reedbank Nest', [515, 790], [pack(9, 4, 0, 2), pack(10, 6, 1, 3)], { nestHp: 165 }),
      ] },
      { id: 'crossing', label: 'Choose a crossing', chooseCrossing: true, encounters: [
        encounter('ridge', 'Reed Ridge', [844, 560], [pack(10, 7, 1, 2), pack(7, 8, 2, 3), pack(6, 9, 3, 3), pack(9, 8, 2, 3)]),
        encounter('ford', 'Flooded Causeway', [925, 936], [pack(10, 5, 0, 4), pack(8, 7, 2, 3), pack(7, 7, 2, 4), pack(8, 6, 2, 4)]),
      ] },
      { id: 'marsh-keeper', label: 'Duel the Marsh Keeper', encounters: [
        encounter('island-bank', 'Island Bank', [1170, 868], [pack(10, 8, 2, 4), pack(8, 10, 3, 3), pack(8, 9, 3, 3), { pack: pack(7, 10, 3, 4), flank: 1.6, reach: 260 }]),
        encounter('last-nest', 'Far Island Nest', [1210, 450], [pack(10, 5, 1, 3), pack(9, 8, 1, 3)], { nestHp: 190 }),
        encounter('keeper', 'Marsh Keeper', [1440, 360], [pack(10, 5, 2, 3), pack(9, 7, 3, 3), { pack: pack(9, 9, 3, 3), flank: .9, reach: 270 }], { enemy: 'bottle', hpScale: 7.8 }),
      ] },
    ],
  },
  'candle-crypt': {
    safetyTimeout: 480, ambientCap: 21, ambientSec: 6,
    sweeps: [
      { id: 'entrance', label: 'Clear the entrance', encounters: [
        encounter('entry', 'Candle Passage', [508, 621], [pack(8, 5, 2), pack(9, 6, 1, 0, 2), pack(9, 8, 2, 0, 2)]),
        encounter('vault', 'Ossuary Steps', [662, 355], [pack(9, 5, 2, 0, 2), pack(8, 7, 2, 0, 3), pack(9, 8, 2, 0, 4)]),
      ] },
      { id: 'hold-lantern', label: 'Light and defend the lantern', encounters: [
        encounter('lantern', 'Crypt Lantern', [855, 650], [
          { pack: pack(16, 8, 2), flank: Math.PI, reach: 285 },
          { pack: pack(11, 10, 2, 0, 3), flank: 0, reach: 275 },
          { pack: pack(10, 15, 4, 0, 5), flank: -Math.PI / 2, reach: 270 },
          { pack: pack(9, 10, 3, 0, 5), flank: Math.PI / 2, reach: 260 },
          { pack: pack(8, 9, 3, 0, 5), flank: 0, reach: 260 },
        ], { defenseHp: 200, recoveryAfter: 2 }),
      ] },
      { id: 'crypt-bell', label: 'Silence the Crypt Bell', encounters: [
        encounter('crypt-bell', 'Crypt Bell', [1310, 653], [pack(11, 7, 3, 0, 5), pack(10, 7, 3, 0, 5)], { enemy: 'discord', hpScale: .87 }),
      ] },
    ],
  },
  'thorn-gate': {
    safetyTimeout: 480, ambientCap: 22, ambientSec: 6.5,
    sweeps: [
      { id: 'fork', label: 'Open the briar fork', encounters: [
        encounter('briars', 'Briar Approach', [520, 652], [pack(10, 6, 3), pack(9, 7, 4, 0, 3), pack(9, 7, 3, 0, 4)]),
      ] },
      { id: 'two-keys', label: 'Hunt both gatekeepers', encounters: [
        encounter('north-key', 'North · Thornback', [1030, 340], [pack(8, 7, 4), pack(6, 9, 6), pack(9, 8, 5)], { enemy: 'thornback', hpScale: 1.55 }),
        encounter('south-key', 'South · Discord Bell', [1120, 960], [pack(9, 5, 0, 2, 4), pack(7, 7, 0, 2, 5), pack(6, 7, 2, 0, 6)], { enemy: 'discord', hpScale: 1.3 }),
      ] },
      { id: 'ambush', label: 'Hold the gate', encounters: [
        encounter('ambush', 'Gate Ambush', [1550, 680], [
          { pack: pack(12, 7, 3, 0, 3), flank: Math.PI }, { pack: pack(8, 10, 4, 0, 4), flank: -.9 },
          { pack: pack(8, 10, 3, 0, 5), flank: .9 }, { pack: pack(10, 10, 4, 0, 4), flank: -1.2 },
        ], { defenseHp: 185 }),
      ] },
    ],
  },
  belltower: {
    safetyTimeout: 720, ambientCap: 32, ambientSec: 6,
    sweeps: [
      { id: 'tower-chambers', label: 'Clear the outer rooms', encounters: [
        encounter('outer-hall', 'Outer Hall', [520, 605], [pack(11, 8, 4), pack(9, 9, 5, 0, 3), pack(9, 8, 6, 0, 3), pack(10, 8, 5, 0, 4)]),
        encounter('west-stairs', 'West Stairs', [815, 390], [pack(9, 10, 4, 4), pack(9, 11, 4, 4, 3), pack(9, 11, 4, 4, 4), pack(9, 11, 5, 4, 5), pack(9, 11, 5, 5, 5)]),
      ] },
      { id: 'gallery', label: 'Clear the guard gallery', encounters: [
        encounter('gallery', 'Guard Gallery', [1105, 625], [
          pack(10, 10, 5, 3, 3), { pack: pack(8, 12, 5, 3, 4), flank: -.8 }, pack(8, 10, 6, 4, 4),
          { pack: pack(8, 12, 5, 3, 5), flank: .8 }, pack(9, 11, 6, 4, 5),
        ]),
        encounter('east-guard', 'Bell Stair Guard', [1255, 815], [
          pack(8, 11, 6, 3, 5), pack(8, 10, 6, 4, 6), pack(8, 10, 6, 4, 6), pack(9, 10, 7, 4, 6), pack(8, 11, 6, 4, 6),
        ]),
      ] },
      { id: 'hollow-warden', label: 'Defeat the Hollow Warden', encounters: [
        encounter('warden', 'The Hollow Warden', [1450, 625], [pack(9, 8, 4, 3, 4)], { enemy: 'warden', hpScale: 1.65 }),
      ] },
    ],
  },
};
