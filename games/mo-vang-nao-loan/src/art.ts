import { HEIGHT, Mine, PIVOT, WIDTH, nextRandom, values } from './mine.js';
import type { ItemKind, Treasure } from './mine.js';

type Point = readonly [number, number];
type Sprite = 'gold' | 'hook' | 'chest' | 'rock';
type Brush = string | CanvasGradient;
const TAU = 2 * Math.PI;

function polygon(ctx: CanvasRenderingContext2D, points: Point[], fill: Brush, stroke?: string, width = 2) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: Brush, stroke?: string) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function line(ctx: CanvasRenderingContext2D, points: Point[], stroke: string, width = 2) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, size * 4.8);
  glow.addColorStop(0, '#ffc06486');
  glow.addColorStop(.45, '#eb8e3d31');
  glow.addColorStop(1, '#eb8e3d00');
  ellipse(ctx, x, y, size * 5, size * 5, glow);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 14, size / 14);
  line(ctx, [[0, -24], [0, -17]], '#1e1422', 4);
  polygon(ctx, [[-10, -13], [10, -13], [13, 9], [-13, 9]], '#ffca77', '#442837', 3);
  ellipse(ctx, 0, 0, 5, 8, '#fff2b4');
  line(ctx, [[-12, -13], [12, -13]], '#754532', 4);
  line(ctx, [[-14, 10], [14, 10]], '#754532', 4);
  line(ctx, [[0, -12], [0, 10]], '#b26f49', 1);
  ctx.restore();
}

function buildCave() {
  const cave = document.createElement('canvas');
  cave.width = WIDTH;
  cave.height = HEIGHT;
  const ctx = cave.getContext('2d')!;
  const shade = ctx.createLinearGradient(0, 95, 0, HEIGHT);
  shade.addColorStop(0, '#573649');
  shade.addColorStop(.3, '#422a41');
  shade.addColorStop(.72, '#312138');
  shade.addColorStop(1, '#241a2c');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const light = ctx.createRadialGradient(405, 105, 8, 405, 155, 560);
  light.addColorStop(0, '#e89c5d3b');
  light.addColorStop(.62, '#bb6e5130');
  light.addColorStop(1, '#ad544600');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  let seed = 819;
  const random = () => {
    const step = nextRandom(seed);
    seed = step.seed;
    return step.value;
  };
  for (let index = 0; index < 19; index++) {
    const y = 140 + index * 24;
    const points: Point[] = [];
    for (let x = -40; x <= WIDTH + 50; x += 70) {
      points.push([x, y + Math.sin(x / 100 + index * .24) * 16 + (random() - .5) * 23]);
    }
    polygon(ctx, [...points, [WIDTH + 70, y + 34], [-40, y + 37]], index % 3 === 0 ? '#130d201c' : '#ad718010');
    line(ctx, points, index % 3 === 0 ? '#21172b87' : '#c18f7826', index % 3 === 0 ? 3 : 1.5);
  }
  for (let index = 0; index < 470; index++) {
    const x = random() * WIDTH;
    const y = 119 + random() * (HEIGHT - 119);
    const size = 1 + random() * 2.3;
    ellipse(ctx, x, y, size * 1.4, size / 2, index % 5 === 0 ? '#dc998036' : '#130b2252');
  }
  polygon(ctx, [[0, 100], [68, 113], [100, 164], [56, 223], [67, 290], [43, 370], [67, 444], [19, 520], [38, 570], [0, 570]], '#2e2035', '#21172a', 4);
  polygon(ctx, [[840, 112], [790, 142], [777, 183], [800, 240], [772, 299], [802, 341], [786, 425], [822, 493], [773, 570], [840, 570]], '#302138', '#23182c', 4);
  line(ctx, [[19, 214], [56, 223], [42, 251], [67, 290]], '#734853', 2);
  line(ctx, [[840, 326], [802, 341], [818, 392], [786, 425]], '#714655', 2);
  line(ctx, [[5, 545], [94, 536], [169, 553], [260, 553], [309, 566]], '#714655', 3);
  line(ctx, [[572, 552], [635, 543], [706, 554], [773, 538], [835, 546]], '#6c4351', 3);
  const cap = ctx.createLinearGradient(0, 0, 0, 107);
  cap.addColorStop(0, '#3c273d');
  cap.addColorStop(1, '#5a3a4a');
  ctx.fillStyle = cap;
  ctx.fillRect(0, 0, WIDTH, 104);
  for (let index = 0; index < 10; index++) {
    const x = index * 103 - 55;
    polygon(ctx, [[x, 0], [x + 35, 0], [x + 95, 90], [x + 78, 90]], '#251b2f5c');
  }
  for (const x of [107, 720]) {
    polygon(ctx, [[x - 12, 0], [x + 12, 0], [x + 23, 107], [x - 5, 107]], '#79513f', '#412b37', 4);
    line(ctx, [[x + 3, 2], [x + 11, 101]], '#b17a54', 3);
    polygon(ctx, [[x - 57, 0], [x - 32, 0], [x + 13, 57], [x, 60]], '#805642', '#422a37', 3);
    lamp(ctx, x + 34, 47, 12);
  }
  ctx.fillStyle = '#9f664b';
  ctx.fillRect(0, 96, WIDTH, 9);
  ctx.fillStyle = '#563648';
  ctx.fillRect(0, 105, WIDTH, 15);
  ctx.fillStyle = '#bb8054';
  ctx.fillRect(0, 98, WIDTH, 2);
  for (let x = 14; x < WIDTH; x += 34) {
    line(ctx, [[x, 108], [x + 11, 115]], '#875957', 2);
  }
  for (const x of [46, 758]) {
    line(ctx, [[x, 100], [x - 5, 184]], '#8d6156', 5);
    line(ctx, [[x + 26, 100], [x + 22, 184]], '#8d6156', 5);
    for (let y = 120; y < 186; y += 17) line(ctx, [[x - 2, y], [x + 24, y]], '#ac795d', 4);
  }
  lamp(ctx, 83, 314, 7);
  lamp(ctx, 758, 398, 6);
  return cave;
}

function drawMiner(ctx: CanvasRenderingContext2D, running: boolean, heavy: boolean, time: number, reduced: boolean) {
  ctx.save();
  ctx.translate(354, 94);
  if (running && heavy && !reduced) ctx.rotate(Math.sin(time * 18) * .03 - .07);
  ellipse(ctx, 6, 2, 37, 8, '#28192983');
  polygon(ctx, [[-13, -21], [16, -21], [24, -2], [9, 1], [3, -9], [-5, 1], [-22, -1]], '#443246', '#291d2e');
  polygon(ctx, [[-20, -37], [-9, -45], [16, -43], [27, -27], [16, -12], [-17, -13]], '#a95253', '#42273a', 3);
  polygon(ctx, [[-17, -34], [-9, -38], [-3, -28], [13, -27], [17, -38], [24, -32], [17, -13], [-16, -15]], '#597372', '#375259');
  ellipse(ctx, 1, -52, 24, 19, '#d78b62', '#452b39');
  ellipse(ctx, 18, -48, 6, 6, '#dd9565', '#75483e');
  polygon(ctx, [[-24, -49], [-22, -67], [-11, -78], [9, -78], [22, -68], [27, -55], [17, -54], [15, -63], [-16, -58]], '#e9a652', '#633b3c', 3);
  line(ctx, [[-22, -53], [-8, -53], [8, -58], [30, -58]], '#f9cf7a', 5);
  ellipse(ctx, 21, -62, 5, 4, '#fff3b5', '#8c5d43');
  ellipse(ctx, 9, -49, 2.7, 3.2, '#382735');
  line(ctx, [[5, -41], [14, -42]], '#794234', 2.5);
  const hand = running && !reduced ? Math.sin(time * 12) * 5 : 0;
  line(ctx, [[18, -30], [30, -19], [43, -22 + hand]], '#4c303d', 12);
  line(ctx, [[18, -30], [30, -19], [43, -22 + hand]], '#c56e66', 8);
  ellipse(ctx, 44, -22 + hand, 5.5, 5, '#e4a772', '#6f4440');
  ctx.restore();
}

function drawWinch(ctx: CanvasRenderingContext2D, mine: Mine, reduced: boolean) {
  const moving = mine.phase !== 'aim';
  const last = mine.events.at(-1);
  const recent = last ? mine.time - last.time : Infinity;
  const jackpot = last?.roll === 'cash' && recent < .7;
  const empty = last?.action === 'empty' && recent < .32;
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y - 12);
  polygon(ctx, [[-37, 1], [-30, -31], [30, -31], [37, 1]], '#566e6e', '#2c2435', 4);
  polygon(ctx, [[-41, -1], [41, -1], [41, 8], [-41, 8]], '#a57759', '#422738', 3);
  ellipse(ctx, 0, -23, 23, 18, jackpot ? '#d48943' : '#30434c', '#201b2d');
  ellipse(ctx, 0, -23, 16, 13, jackpot ? '#ffe2a0' : empty ? '#806d83' : '#68938e', '#23323d');
  const spin = reduced ? 0 : moving ? mine.distance / 15 : jackpot ? recent * 7 : 0;
  for (let index = 0; index < 4; index++) {
    const angle = spin + index * TAU / 4;
    line(ctx, [[0, -23], [Math.cos(angle) * 13, -23 + Math.sin(angle) * 11]], '#b8dad1', 3);
  }
  ellipse(ctx, 0, -23, 5, 5, '#e8b36f', '#47343e');
  for (const x of [-30, 30]) ellipse(ctx, x, 2, 3, 2.5, '#e5ad76');
  ctx.restore();
}

const spriteFor: Record<ItemKind, Sprite> = { small: 'gold', medium: 'gold', large: 'gold', rock: 'rock', chest: 'chest' };

export class Art {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cave = buildCave();
  private readonly sprites: Record<Sprite, HTMLImageElement>;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.sprites = Object.fromEntries((['gold', 'hook', 'chest', 'rock'] as const).map((id) => {
      const image = new Image();
      image.src = './art/' + id + '.png';
      return [id, image];
    })) as Record<Sprite, HTMLImageElement>;
  }

  draw(mine: Mine, reduced: boolean) {
    const ctx = this.ctx;
    ctx.drawImage(this.cave, 0, 0);
    for (const item of mine.treasure) {
      if (item !== mine.target) this.drawTreasure(item, item.x, item.y, true);
    }
    const hook = mine.hook;
    if (mine.phase === 'aim') {
      const guide = mine.vector;
      const guideLength = 190;
      ctx.setLineDash([3, 7]);
      line(ctx, [[hook.x, hook.y + 8], [hook.x + guide.x * guideLength, hook.y + guide.y * guideLength]], '#f3d29db5');
      ctx.setLineDash([]);
    } else {
      const bow = mine.target || reduced ? 0 : Math.sin(mine.time * 11) * Math.min(6, mine.distance / 17);
      const rope: Point[] = [[PIVOT.x, PIVOT.y], [(PIVOT.x + hook.x) / 2 + bow, (PIVOT.y + hook.y) / 2], [hook.x, hook.y]];
      line(ctx, rope, '#25192d', 7);
      line(ctx, rope, mine.target ? '#bfd9c1' : '#a4c1b9', mine.target ? 3.4 : 2.6);
    }
    if (mine.target) {
      const guide = mine.vector;
      const offset = mine.target.radius * .46;
      this.drawTreasure(mine.target, hook.x + guide.x * offset, hook.y + guide.y * offset, false);
    }
    drawMiner(ctx, mine.phase !== 'aim', !!mine.target, mine.time, reduced);
    drawWinch(ctx, mine, reduced);
    ctx.save();
    ctx.translate(hook.x, hook.y);
    ctx.rotate(-mine.angle);
    this.sprite('hook', 0, 7, 37);
    ctx.restore();
  }

  private sprite(id: Sprite, x: number, y: number, size: number) {
    const image = this.sprites[id];
    if (image.complete && image.naturalWidth > 0) {
      this.ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    }
  }

  private drawTreasure(item: Treasure, x: number, y: number, idle: boolean) {
    const ctx = this.ctx;
    if (idle) {
      ellipse(ctx, x + 1, y + item.radius * .67, item.radius * .98, item.radius * .39, '#1e142982');
      if (item.kind !== 'rock') {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, item.radius * 2);
        glow.addColorStop(0, '#ffbe6448');
        glow.addColorStop(1, '#ffbe6400');
        ellipse(ctx, x, y, item.radius * 2, item.radius * 2, glow);
      }
    }
    this.sprite(spriteFor[item.kind], x, y, item.radius * 2.85);
    if (idle) {
      const label = item.kind === 'chest' ? '?' : String(values[item.kind]);
      ctx.font = '750 18px system-ui';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#271a2e';
      ctx.strokeText(label, x, y + item.radius + 11);
      ctx.fillStyle = item.kind === 'rock' ? '#e0bbc4' : '#ffe1a2';
      ctx.fillText(label, x, y + item.radius + 11);
    }
  }
}
