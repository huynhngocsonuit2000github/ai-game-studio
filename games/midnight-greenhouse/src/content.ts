export const LANES = 4;
export const COLUMNS = 8;
export const HZ = 30;
export const ticks = (seconds: number) => Math.round(seconds * HZ);

export type CardId = 'pitcher' | 'fern' | 'bramble' | 'orchid';
export type EnemyId = 'walker' | 'courier' | 'porter' | 'raincoat';
export type Card = { id: CardId; label: string; cost: number; hp: number } & (
  | { id: 'pitcher' }
  | { id: 'fern'; damage: number; cooldownSeconds: number; rangeTiles: number; flightSeconds: number }
  | { id: 'bramble'; damage: number; cooldownSeconds: number; rangeTiles: number; rootSeconds: number }
  | { id: 'orchid'; damage: number; cooldownSeconds: number; rangeTiles: number; armSeconds: number;
        additionalTargets: number; jumpRangeTiles: number; jumpDamage: number[] }
);
export type Hostile = {
  id: EnemyId; label: string; hp: number; speedTilesPerSecond: number;
  biteDamage: number; biteSeconds: number; coreDamage: number; killStock: number;
};
export type SpawnGroup = { offsetSeconds: number; lane: number; enemy: EnemyId; count: number; gapSeconds: number };
export type Wave = { number: number; atSeconds: number; announceLeadSeconds: number; groups: SpawnGroup[] };
export type Sprite = { asset: string; size: [number, number]; anchorPx: [number, number] };
export type Content = {
  level: { id: 'raincourt'; title: string; startingStock: number; coreHealth: number;
    baselineStockPerPayout: number; waves: Wave[] };
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

export const descriptions: Record<CardId, string> = {
  pitcher: 'Thu 10 Ánh Hạt mỗi 8 giây. Luống có nước thu thêm 8.',
  fern: 'Bắn vòng qua giáp. Tầm 6,5 ô.',
  bramble: 'Giữ chân địch và chặn luống. Tầm 1,2 ô.',
  orchid: 'Luống có nước cho tia sét nối tối đa 4 mục tiêu. Áo Mưa miễn nhiễm.',
};
