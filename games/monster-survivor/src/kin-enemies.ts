import type { EnemyDef } from './content.ts';

export const burrow = { tell: .85, radius: 52, damage: 14, cooldown: 5, range: 220 };
export const mend = { tell: .8, radius: 150, amount: 12, cooldown: 4, cap: 2 };
export const beetle = { arc: 65 * Math.PI / 180, frontalDamage: .45 };

export function kinEnemies(base: Map<string, EnemyDef>): EnemyDef[] {
  const scarab = base.get('scarab')!;
  const seedling = base.get('seedling')!;
  const warden = base.get('warden')!;
  return [
    { ...scarab, id: 'bulwark-beetle', name: 'Bulwark Beetle', speed: 63, hp: 150, radius: 23, xp: 14,
      behavior: { ai: 'charge', triggerRange: 166, windup: .96, chargeSpeed: 239, chargeSec: .55, recovery: .85 },
      cue: 'Flank the raised shield or strike during recovery after its charge.' },
    { ...seedling, id: 'moth-shaman', name: 'Moth Shaman', speed: 70, hp: 78, radius: 16, xp: 14,
      cue: 'A green link warns that it is about to heal a wounded ally.' },
    { ...seedling, id: 'ash-burrower', name: 'Ash Burrower', speed: 85, hp: 96, radius: 17, xp: 14,
      cue: 'The striped circle marks where it will emerge. Dash clear of the tell.' },
    { ...warden, id: 'fog-keeper', name: 'Fog Keeper', hp: 2850, speed: 70, radius: 43,
      cue: 'Step sideways out of the cone and strike during its shelter window.' },
    { ...warden, id: 'furnace-overseer', name: 'Furnace Overseer', hp: 3320, speed: 67, radius: 45,
      cue: 'Stay between the two charge lanes and strike during cooling.' },
    { ...warden, id: 'eclipse-warden', name: 'Eclipse Warden', hp: 3940, speed: 65,
      cue: 'Use the safe center, defeat the ward adds, then dodge lanes followed by a cleave.' },
  ];
}
