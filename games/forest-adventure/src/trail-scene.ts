import Phaser from 'phaser';
import backdrop from '../assets/runtime/bg-fernlight.webp?url';
import soil from '../assets/runtime/soil-body.webp?url';
import pipImage from '../assets/runtime/pip.png?url';
import pipAtlas from '../assets/runtime/pip.json?url';
import creatureImage from '../assets/runtime/creatures.png?url';
import creatureAtlas from '../assets/runtime/creatures.json?url';
import propsImage from '../assets/runtime/forest-props.png?url';
import propsAtlas from '../assets/runtime/forest-props.json?url';
import terrainImage from '../assets/runtime/terrain.png?url';
import terrainAtlas from '../assets/runtime/terrain.json?url';
import fireflyImage from '../assets/runtime/forest-vfx.png?url';
import fireflyAtlas from '../assets/runtime/forest-vfx.json?url';
import pipClips from '../assets/runtime/pip-clips.json';
import creatureClips from '../assets/runtime/creatures-clips.json';
import terrainLayout from '../assets/runtime/terrain-layout.json';
import { fernlight } from './level.ts';
import { Session, STEP_MS, type Input } from './session.ts';

const WIDTH = 960;
const HEIGHT = 540;

export interface TrailHost {
  sampleInput(): Input;
  onReady(): void;
  onLoadError(): void;
  onStep(session: Session, events: ReturnType<Session['step']>): void;
}

export function mountTrail(parent: HTMLElement, host: TrailHost) {
  const scene = new TrailScene(host);
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#152b22',
    banner: false,
    fps: { smoothStep: false },
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
  });
  return scene;
}

class TrailScene extends Phaser.Scene {
  private readonly host: TrailHost;
  private session = new Session(fernlight);
  private failed = false;
  private running = false;
  private accumulator = 0;
  private backdrop!: Phaser.GameObjects.TileSprite;
  private pip!: Phaser.GameObjects.Sprite;
  private beetle!: Phaser.GameObjects.Sprite;
  private moth!: Phaser.GameObjects.Sprite;
  private lantern!: Phaser.GameObjects.Sprite;
  private gate!: Phaser.GameObjects.Sprite;
  private pickups = new Map<string, Phaser.GameObjects.Sprite>();
  private fireflies = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(host: TrailHost) {
    super('trail');
    this.host = host;
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => { this.failed = true; });
    this.load.image('forest', backdrop);
    this.load.image('soil', soil);
    this.load.atlas('pip', pipImage, pipAtlas);
    this.load.atlas('creatures', creatureImage, creatureAtlas);
    this.load.atlas('props', propsImage, propsAtlas);
    this.load.atlas('terrain', terrainImage, terrainAtlas);
    this.load.atlas('vfx', fireflyImage, fireflyAtlas);
  }

  create() {
    if (this.failed) {
      this.host.onLoadError();
      return;
    }
    const camera = this.cameras.main;
    camera.setBounds(0, 0, fernlight.width, fernlight.height);
    camera.setScroll(0, fernlight.height - HEIGHT);
    this.backdrop = this.add.tileSprite(0, 0, WIDTH, HEIGHT, 'forest').setOrigin(0).setScrollFactor(0);
    this.backdrop.setTileScale(HEIGHT / this.backdrop.texture.getSourceImage().height);
    this.drawTerrain();

    for (const [key, clip] of Object.entries(pipClips)) this.addClip(key, 'pip', clip);
    for (const [key, clip] of Object.entries(creatureClips)) this.addClip(key, 'creatures', clip);

    for (const hazard of fernlight.hazards) {
      this.sprite(hazard.x + hazard.width / 2, hazard.y + hazard.height, 'props', 'bramble', .37);
    }
    this.lantern = this.sprite(fernlight.checkpoint.x, fernlight.checkpoint.y, 'props', 'lantern-dormant', .47);
    this.gate = this.sprite(fernlight.goal.x, fernlight.goal.y, 'props', 'portal-dormant', .65);
    for (const seed of fernlight.seeds) this.pickups.set(seed.id, this.sprite(seed.x, seed.y, 'props', 'heartseed', .31));
    for (const item of fernlight.fireflies) {
      this.fireflies.set(item.id, this.sprite(item.x, item.y, 'vfx', 'firefly-1', .39));
    }

    this.beetle = this.sprite(0, 0, 'creatures', 'beetle-a', .5);
    this.moth = this.sprite(0, 0, 'creatures', 'moth-up', .5);
    this.pip = this.sprite(0, 0, 'pip', 'idle-a', .5);
    this.syncSprites();
    this.pauseAnimations();
    this.host.onReady();
  }

  startAttempt() {
    this.session = new Session(fernlight);
    this.cameras.main.scrollX = 0;
    this.setRunning(true);
    this.syncSprites();
    this.host.onStep(this.session, []);
  }

  setRunning(running: boolean) {
    this.running = running;
    this.accumulator = 0;
    if (running) {
      for (const actor of [this.pip, this.beetle, this.moth]) actor.anims.resume();
    } else {
      this.pauseAnimations();
    }
  }

  update(_time: number, delta: number) {
    if (!this.running) return;
    this.accumulator += Math.min(delta, 100);
    let steps = 0;
    while (this.accumulator + 0.0001 >= STEP_MS && steps < 5 && this.running) {
      this.accumulator -= STEP_MS;
      steps++;
      const events = this.session.step(this.host.sampleInput());
      this.host.onStep(this.session, events);
    }
    if (steps === 5 && this.accumulator >= STEP_MS) this.accumulator = 0;
    this.syncSprites();
    const camera = this.cameras.main;
    const left = this.session.player.x + this.session.player.facing * 96 - WIDTH / 2;
    const target = Phaser.Math.Clamp(left, 0, fernlight.width - WIDTH);
    camera.scrollX += (target - camera.scrollX) * (1 - Math.exp(-Math.min(delta, 100) / 150));
    this.backdrop.tilePositionX = camera.scrollX * .18;
  }

  private pauseAnimations() {
    for (const actor of [this.pip, this.beetle, this.moth]) actor.anims.pause();
  }

  private sprite(x: number, y: number, atlas: string, frame: string, scale: number) {
    return this.add.sprite(x, y, atlas, frame).setScale(scale);
  }

  private addClip(key: string, texture: string, clip: { frames: string[]; fps: number; loop: boolean }) {
    this.anims.create({
      key, frames: clip.frames.map((frame) => ({ key: texture, frame })),
      frameRate: clip.fps, repeat: clip.loop ? -1 : 0,
    });
  }

  private drawTerrain() {
    const { ground, cellLogicalWidth, solidVisualTopInsetLogical, pixelsPerUnit } = terrainLayout;
    for (const solid of fernlight.solids) {
      const y = solid.y - solidVisualTopInsetLogical;
      const bodyY = y + ground.bodyStartOffsetLogical;
      const bodyHeight = solid.y + solid.height - bodyY;
      if (bodyHeight > 0) {
        this.add.tileSprite(solid.x, bodyY, solid.width, bodyHeight, 'soil').setOrigin(0).setTileScale(.5);
      }
      const columns = Math.ceil(solid.width / cellLogicalWidth);
      for (let column = 0; column < columns; column++) {
        const frame = column === 0 ? ground.left
          : column === columns - 1 ? ground.right
            : ground.fill[column % ground.fill.length] ?? ground.left;
        const tileWidth = solid.width * pixelsPerUnit / columns;
        const tileHeight = Math.min(solid.height + solidVisualTopInsetLogical, 62) * pixelsPerUnit;
        this.add.image(solid.x + column * solid.width / columns, y, 'terrain', frame)
          .setOrigin(0).setCrop(0, 0, Math.min(tileWidth, 64), tileHeight)
          .setScale(tileWidth / Math.min(tileWidth, 64) / pixelsPerUnit, 1 / pixelsPerUnit);
      }
    }
  }

  private syncSprites() {
    const session = this.session;
    const { player } = session;
    const pipClip = session.phase === 'cleared' ? 'cheer' : session.damageTicks > 44 ? 'hurt'
      : !player.grounded ? (player.vy < 0 ? 'rise' : 'fall') : Math.abs(player.vx) > 10 ? 'run' : 'idle';
    this.pip.setPosition(player.x, player.y)
      .setFlipX(player.facing < 0).setVisible(session.phase !== 'recovering').play(pipClip, true);

    for (const enemy of session.enemies) {
      const beetle = enemy.spec.type === 'beetle';
      const actor = beetle ? this.beetle : this.moth;
      const clip = beetle ? (enemy.defeated ? 'beetle-stomped' : 'beetle-walk')
        : (enemy.dipping ? 'moth-dip' : 'moth-hover');
      actor.setPosition(enemy.x, enemy.y).setFlipX(enemy.direction > 0).play(clip, true);
      if (beetle && enemy.turnTicks > 0) actor.anims.pause();
      else if (this.running) actor.anims.resume();
    }
    this.lantern.setFrame(session.checkpoint ? 'lantern' : 'lantern-dormant');
    this.gate.setFrame(session.gateOpen ? 'portal' : 'portal-dormant');
    for (const [id, sprite] of this.pickups) sprite.setVisible(!session.seeds.has(id));
    for (const [id, sprite] of this.fireflies) sprite.setVisible(!session.fireflies.has(id));
  }
}
