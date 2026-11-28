export const LANES = 4;
export const COLUMNS = 8;
export const HZ = 30;
export const ticks = (seconds: number) => Math.round(seconds * HZ);

export const levels = ['raincourt', 'pump-gallery', 'lightning-dome'] as const;
export type LevelId = typeof levels[number];
export type CardId = 'pitcher' | 'fern' | 'bramble' | 'orchid' | 'moss' | 'pod';
export type EnemyId = 'walker' | 'courier' | 'porter' | 'raincoat' | 'mender' | 'keeper';
export type Card = { id: CardId; label: string; cost: number; hp: number; placementCooldownSeconds: number } & (
  | { id: 'pitcher'; payout: number; payoutSeconds: number }
  | { id: 'fern'; damage: number; cooldownSeconds: number; rangeTiles: number; flightSeconds: number }
  | { id: 'bramble'; damage: number; cooldownSeconds: number; rangeTiles: number; rootSeconds: number }
  | { id: 'orchid'; damage: number; cooldownSeconds: number; rangeTiles: number; armSeconds: number;
        dryAdditionalTargets: number; wetAdditionalTargets: number; jumpRangeTiles: number; jumpDamage: number[] }
  | { id: 'moss'; wetHealPerSecond: number; regenDelaySeconds: number }
  | { id: 'pod'; damage: number; triggerRadius: number; blastRadius: number; armSeconds: number }
);
export type Hostile = {
  id: EnemyId; label: string; hp: number; speedTilesPerSecond: number;
  biteDamage: number; biteSeconds: number; coreDamage: number;
};
export type SpawnGroup = { offsetSeconds: number; lane: number; enemy: EnemyId; count: number; gapSeconds: number };
export type Wave = { number: number; atSeconds: number; announceLeadSeconds: number; groups: SpawnGroup[] };
export type Sprite = { asset: string; size: [number, number]; anchorPx: [number, number] };
export type Content = {
  level: { id: LevelId; title: string; startingStock: number; coreHealth: number;
    waterEnabled: boolean; cardUnlocks: Partial<Record<CardId, { wave: number; trigger: 'announcement' }>>; waves: Wave[]; faults: { atSeconds: number; lane: number; warningSeconds: number; closedSeconds: number }[] };
  cards: Card[];
  hostiles: Hostile[];
  arena: {
    artSize: [number, number]; boardAsset: string; xPlantSpan: [number, number];
    visualRowEdges: number[]; feetY: number[]; valveX: number; entranceX: number;
  };
  sprites: Record<CardId | EnemyId, Sprite>;
  preparationSeconds: number;
  drops: {
    ambientFirstSeconds: number; ambientEverySeconds: number; ambientValue: number;
    openingAmbientValue: number; openingAmbientPayouts: number; eliteValue: number;
    eliteIds: EnemyId[]; maxEliteOnField: number; autoCreditSeconds: number; maxOnField: number; maxPitchers: number;
  };
  bell: { charges: number; ordinaryLaneStunSeconds: number };
  rerouteCooldownSeconds: number;
};

export type Campaign = Record<LevelId, Content>;

export const roles: Record<CardId, string> = {
  pitcher: 'Kinh tế', fern: 'Bắn cầu vồng', bramble: 'Giữ chân',
  orchid: 'Sét dây chuyền', moss: 'Chắn luống', pod: 'Nổ một lần',
};

export function cardDescription(card: Card, content: Content) {
  switch (card.id) {
    case 'pitcher': return `Thả ${card.payout} Ánh Hạt mỗi ${card.payoutSeconds} giây. Tối đa ${content.drops.maxPitchers} bình.`;
    case 'fern': return `Đạn vòng qua giáp. Tầm ${card.rangeTiles} ô.`;
    case 'bramble': return `Giữ chân địch ${card.rootSeconds} giây. Chỉ làm chậm Thợ Vườn Gốm.`;
    case 'orchid': return content.level.waterEnabled
      ? `Nối tối đa ${1 + card.dryAdditionalTargets} địch, hoặc ${1 + card.wetAdditionalTargets} khi tưới. Áo Mưa miễn nhiễm.`
      : `Nối tối đa ${1 + card.dryAdditionalTargets} địch. Áo Mưa miễn nhiễm.`;
    case 'moss': return `Khi có nước, hồi ${card.wetHealPerSecond} HP/giây sau ${card.regenDelaySeconds} giây không bị đánh.`;
    case 'pod': return `Nạp ${card.armSeconds} giây rồi nổ một lần khi địch đến gần.`;
  }
}
