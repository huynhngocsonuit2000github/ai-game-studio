export const LANES = 4;
export const COLUMNS = 8;
export const HZ = 30;
export const ticks = (seconds: number) => Math.round(seconds * HZ);

export const levels = ['raincourt', 'pump-gallery', 'lightning-dome'] as const;
export type LevelId = typeof levels[number];
export type CardId = 'pitcher' | 'fern' | 'bramble' | 'orchid' | 'moss' | 'pod';
export type EnemyId = 'walker' | 'courier' | 'porter' | 'raincoat' | 'mender' | 'keeper';
export type Card = { id: CardId; label: string; cost: number; hp: number } & (
  | { id: 'pitcher' }
  | { id: 'fern'; damage: number; cooldownSeconds: number; rangeTiles: number; flightSeconds: number }
  | { id: 'bramble'; damage: number; cooldownSeconds: number; rangeTiles: number; rootSeconds: number }
  | { id: 'orchid'; damage: number; cooldownSeconds: number; rangeTiles: number; armSeconds: number;
        additionalTargets: number; jumpRangeTiles: number; jumpDamage: number[] }
  | { id: 'moss'; wetHealPerSecond: number; regenDelaySeconds: number }
  | { id: 'pod'; damage: number; triggerRadius: number; blastRadius: number; armSeconds: number }
);
export type Hostile = {
  id: EnemyId; label: string; hp: number; speedTilesPerSecond: number;
  biteDamage: number; biteSeconds: number; coreDamage: number; killStock: number;
};
export type SpawnGroup = { offsetSeconds: number; lane: number; enemy: EnemyId; count: number; gapSeconds: number };
export type Wave = { number: number; atSeconds: number; announceLeadSeconds: number; groups: SpawnGroup[] };
export type Sprite = { asset: string; size: [number, number]; anchorPx: [number, number] };
export type Content = {
  level: { id: LevelId; title: string; startingStock: number; coreHealth: number;
    baselineStockPerPayout: number; waves: Wave[]; faults: { atSeconds: number; lane: number; warningSeconds: number; closedSeconds: number }[] };
  cards: Card[];
  hostiles: Hostile[];
  arena: {
    artSize: [number, number]; boardAsset: string; xPlantSpan: [number, number];
    visualRowEdges: number[]; feetY: number[]; valveX: number; entranceX: number;
  };
  sprites: Record<CardId | EnemyId, Sprite>;
  preparationSeconds: number;
  baselinePayoutSeconds: number;
  rerouteCooldownSeconds: number;
};

export type Campaign = Record<LevelId, Content>;

export const descriptions: Record<CardId, string> = {
  pitcher: 'Thu 10 Ánh Hạt mỗi 8 giây. Luống có nước thu thêm 8.',
  fern: 'Bắn vòng qua giáp. Tầm 6,5 ô.',
  bramble: 'Giữ chân địch và chặn luống. Tầm 1,2 ô.',
  moss: 'Chặn địch. Khi có nước, hồi 8 HP/giây sau 4 giây không bị đánh.',
  pod: 'Nạp 3 giây rồi nổ một lần khi địch đến gần, gây sát thương trên cùng luống.',
  orchid: 'Luống có nước cho tia sét nối tối đa 4 mục tiêu. Áo Mưa miễn nhiễm.',
};
