import type { Stage } from './campaign-content.ts';
import { tierRules } from './kin-save.ts';
import type { Tier } from './kin-save.ts';

const pressure: Record<string, { encounter: string; flank: number; hazard: 'lane' | 'pool'; width: number }> = {
  'bell-orchard': { encounter: 'checkpoint', flank: -.75, hazard: 'lane', width: 21 },
  'venom-marsh': { encounter: 'near-nest', flank: 1.2, hazard: 'pool', width: 48 },
  'candle-crypt': { encounter: 'vault', flank: -1.2, hazard: 'lane', width: 24 },
  'thorn-gate': { encounter: 'south-key', flank: .26, hazard: 'pool', width: 59 },
  belltower: { encounter: 'gallery', flank: Math.PI, hazard: 'lane', width: 26 },
  mistwood: { encounter: 'ford-light', flank: -.7, hazard: 'lane', width: 37 },
  'ash-mine': { encounter: 'furnace-court', flank: 1.15, hazard: 'lane', width: 32 },
  'eclipse-temple': { encounter: 'north-pillar', flank: -1, hazard: 'lane', width: 30 },
};

export function stageForTier(stage: Stage, tier: Tier): Stage {
  if (tier === 'normal') return stage;
  const rule = pressure[stage.id];
  return { ...stage, safetyTimeout: stage.safetyTimeout + tierRules[tier].extraSeconds, sweeps: stage.sweeps.map(sweep => ({
    ...sweep, encounters: sweep.encounters.map(encounter => {
      if (encounter.id !== rule.encounter) return encounter;
      return { ...encounter, waves: [...encounter.waves,
        { pack: { 'bulwark-beetle': 1, 'moth-shaman': 1, moth: 2 }, flank: rule.flank, reach: 230 },
        ...(tier === 'nightmare' ? [{ pack: { 'ash-burrower': 1, seedling: 3 }, flank: rule.flank + Math.PI, reach: 240 }] : []),
      ] };
    }),
  })) };
}

export const nightmarePressure = (stage: Stage) => pressure[stage.id];
