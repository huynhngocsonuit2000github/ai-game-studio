import layouts from '../design/LEVELS.json' with { type: 'json' };

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

export interface Level {
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

export const levels: readonly Level[] = layouts.levels.map((layout) => ({
  ...layout,
  name: names[layout.id] ?? layout.id,
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
}));

const first = levels[0];
if (!first) throw new Error('Missing Fernlight Trail layout');
export const fernlight = first;
