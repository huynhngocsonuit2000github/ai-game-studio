import { CampaignRun } from '../src/campaign.ts';
import { campaignStages } from '../src/campaign-content.ts';
import { CampaignRecords } from '../src/campaign-save.ts';
import type { KinLoadout, Tier } from '../src/kin-save.ts';
import type { Input } from '../src/sim.ts';
import { drive } from './kin-route.mjs';

export type Frame = { input: Input; ticks: number; card?: number; capture?: string; at?: number };
export type PlanInput = { raw: string | null; order: number; seed: number; tier: Tier; kit: KinLoadout; side?: number };

export function plan({ raw, order, seed, tier, kit, side }: PlanInput) {
  const stage = campaignStages[order - 1];
  const campaign = new CampaignRecords(() => ({ getItem: () => raw }) as Storage);
  const weapon = campaign.data.equipment.weapon;
  const run = new CampaignRun(stage, seed, campaign.stats, weapon, weapon ? campaign.data.ranks[weapon] : 0,
    new Set(Object.keys(campaign.data.ranks)), tier, kit);
  const frames: Frame[] = [];
  const marked = new Set<string>();
  const result = drive(run, ({ input, ticks, card, offer, events }) => {
    if (offer) { frames.push({ input, ticks, card: offer.cards.indexOf(card), at: run.elapsed }); return; }
    let capture: string | undefined;
    for (const key of [events?.tell, events?.waymark && 'waymark', events?.opened && 'side-trip', events?.guard && 'ward-guard',
      events?.pet && 'companion', events?.engraving && 'engraving', events?.hazard && 'nightmare']) {
      if (key && !marked.has(key)) { marked.add(key); capture ??= key; }
    }
    frames.push({ input, ticks, capture });
  }, side === undefined ? undefined : run.sites[side]);
  return { result, frames };
}
