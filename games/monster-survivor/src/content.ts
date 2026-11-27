import { kinEnemies } from './kin-enemies.ts';
import rules from '../design/data/rules.json' with { type: 'json' };
import garden from '../design/data/garden.json' with { type: 'json' };
import waves from '../design/data/waves.json' with { type: 'json' };
import enemyData from '../design/data/enemies.json' with { type: 'json' };
import skillData from '../design/data/skills.json' with { type: 'json' };
import actors from '../assets/runtime/atlases/actors.json' with { type: 'json' };
import world from '../assets/runtime/atlases/world.json' with { type: 'json' };
import icons from '../assets/runtime/atlases/skills.json' with { type: 'json' };

export { rules, waves, garden, actors, world, icons };
export type EnemyDef = typeof enemyData.enemies[number];
export type Skill = Omit<typeof skillData.skills[number], 'ranks'> & { ranks: Record<string, number>[] };
const baseEnemies = new Map(enemyData.enemies.map(def => [def.id, def]));
const expansionEnemies = kinEnemies(baseEnemies);
export const enemies = new Map([...baseEnemies, ...expansionEnemies.map(def => [def.id, def] as const)]);
export const skills = new Map<string, Skill>(
  skillData.skills.map(def => [def.id, { ...def, ranks: def.ranks.map(rank => (
    Object.fromEntries(Object.entries(rank).filter((entry): entry is [string, number] => typeof entry[1] === 'number'))
  )) }]),
);
export const orchard = garden.wards.find(ward => ward.slice)!;
export const [width, height] = garden.size;
export const [viewWidth, viewHeight] = garden.logicalView;

export function validateContent() {
  function requireValue(condition: unknown, label: string) {
    if (!condition) throw new Error(`Invalid garden data: ${label}`);
  }
  requireValue(enemies.size === enemyData.enemies.length + expansionEnemies.length && skills.size === skillData.skills.length, 'duplicate IDs');
  requireValue(orchard && Object.values(rules.caps).every(cap => Number.isInteger(cap) && cap > 0), 'ward or caps');
  for (const band of [waves.slice, waves.normal]) {
    let boundary = 0;
    for (const wave of band) {
      requireValue(wave.startSec === boundary && wave.endSec > boundary && wave.cap <= rules.caps.normalEnemies, 'wave boundary');
      boundary = wave.endSec;
      for (const [id, count, weight] of wave.groups) requireValue(
        typeof id === 'string' && enemies.get(id)?.role === 'normal' && Number(count) > 0 && Number(weight) > 0,
        String(id),
      );
    }
  }
  for (const def of enemies.values()) requireValue(Object.hasOwn(actors.frames, def.sprite), def.sprite);
  for (const prop of garden.blockers) requireValue(Object.hasOwn(world.frames, prop.sprite), prop.sprite);
  for (const def of skills.values()) {
    requireValue(def.ranks.length === def.maxRank && Object.hasOwn(icons.frames, def.icon), def.id);
    if (!def.recipe) continue;
    for (const [id, rank] of [[def.recipe.active, def.recipe.activeRank], [def.recipe.passive, def.recipe.passiveRank]] as const) {
      requireValue((skills.get(id)?.maxRank ?? 0) >= rank, id);
    }
  }
}
