import layouts from '../design/LEVELS.json' with { type: 'json' };
import newTrails from '../features/exp-10-trails/layouts/TRAIL_LAYOUTS.json' with { type: 'json' };

export interface Marker {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type EnemySpec = Marker & (
  { readonly type: 'beetle'; readonly left: number; readonly right: number } |
  { readonly type: 'moth'; readonly phaseOffset: number }
);

const names: Record<string, string> = {
  'fernlight-trail': 'Fernlight Trail',
  'willow-run': 'Willow Run',
  'lantern-oak': 'Lantern Oak',
};

export type Backdrop = 'forest' | 'willow' | 'oak';

export interface Level {
  readonly backdrop: Backdrop;
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly killY: number;
  readonly solids: readonly Rect[];
  readonly hazards: readonly Rect[];
  readonly spawn: Marker;
  readonly checkpoint: Marker;
  readonly goal: Marker;
  readonly seeds: readonly Marker[];
  readonly fireflies: readonly Marker[];
  readonly enemies: readonly EnemySpec[];
}

function rectangles(rows: number[][]): Rect[] {
  return rows.map(([x, y, width, height]) => {
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      throw new Error('Incomplete terrain rectangle');
    }
    return { x, y, width, height };
  });
}

type Layout = (typeof layouts.levels)[number] | (typeof newTrails.levels)[number];

function parseLevel(layout: Layout, name: string, backdrop: Backdrop): Level {
  return {
    ...layout,
    name,
    backdrop,
    solids: rectangles(layout.solids),
    hazards: rectangles(layout.hazards),
    enemies: layout.enemies.map((enemy): EnemySpec => {
      if (enemy.type === 'moth' && enemy.phaseOffset !== undefined) {
        return { ...enemy, type: 'moth', phaseOffset: enemy.phaseOffset };
      }
      const [left, right] = enemy.patrolX ?? [];
      if (enemy.type === 'beetle' && left !== undefined && right !== undefined) {
        return { ...enemy, type: 'beetle', left, right };
      }
      throw new Error(`Invalid enemy layout: ${enemy.id}`);
    }),
  };
}

export const classicLevels = layouts.levels.map(layout => parseLevel(
  layout, names[layout.id] ?? layout.id,
  layout.id === 'willow-run' ? 'willow' : layout.id === 'lantern-oak' ? 'oak' : 'forest',
));
export const expansionLevels = newTrails.levels.map((layout, index) => parseLevel(
  layout, layout.name, index < 3 ? 'forest' : index < 8 ? 'willow' : 'oak',
));
export const levels: readonly Level[] = [...classicLevels, ...expansionLevels];

const first = classicLevels[0];
if (!first) throw new Error('Missing Fernlight Trail layout');
export const fernlight = first;
