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
import vfxClips from '../assets/runtime/forest-vfx-clips.json';
import { campaignPreview } from './preview.ts';
import type { art } from './preview-art.ts';
import terrainLayout from '../assets/runtime/terrain-layout.json';
import { fernlight, type Level } from './level.ts';
import { Session, STEP_MS, type Input } from './session.ts';

const WIDTH = 960;
const HEIGHT = 540;

export interface TrailHost {
  reducedMotion(): boolean;
  sampleInput(): Input;
  onReady(): void;
  onLoadError(): void;
  onStep(session: Session, events: ReturnType<Session['step']>): void;
}

export function mountTrail(parent: HTMLElement, host: TrailHost, previewArt?: typeof art) {
  const scene = new TrailScene(host, previewArt);
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
  private readonly previewArt?: typeof art;
  private nearRequested = false;
  private nearLayer?: Phaser.GameObjects.TileSprite;
  private effects: Phaser.GameObjects.Sprite[] = [];
  private motes?: Phaser.GameObjects.Graphics;
  private landingUntil = 0;
  private session = new Session(fernlight);
  private failed = false;
  private running = false;
  private accumulator = 0;
  private previousX = fernlight.spawn.x;
  private previousY = fernlight.spawn.y;
  private backdrop!: Phaser.GameObjects.Image;
  private backdropScroll = .18;
  private pip!: Phaser.GameObjects.Sprite;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private landscape: Phaser.GameObjects.GameObject[] = [];
  private gateLights!: Phaser.GameObjects.Graphics;
  private displayedSeeds = -1;
  private enemySignals!: Phaser.GameObjects.Graphics;
  private oakLight!: Phaser.GameObjects.Graphics;
  private lantern!: Phaser.GameObjects.Sprite;
  private gate!: Phaser.GameObjects.Sprite;
  private pickups = new Map<string, Phaser.GameObjects.Sprite>();
  private fireflies = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(host: TrailHost, previewArt?: typeof art) {
    super('trail');
    this.host = host;
    this.previewArt = previewArt;
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
    this.backdrop = this.add.image(0, 0, 'forest').setOrigin(0).setScrollFactor(0).setDepth(-2);
    this.motes = this.add.graphics().setScrollFactor(0).setDepth(4);

    for (const [key, clip] of Object.entries(pipClips)) this.addClip(key, 'pip', clip);
    for (const [key, clip] of Object.entries(creatureClips)) this.addClip(key, 'creatures', clip);
    for (const [key, clip] of Object.entries(vfxClips)) this.addClip(key, 'vfx', clip);

    this.pip = this.sprite(0, 0, 'pip', 'idle-a', .5).setDepth(5);
    this.gateLights = this.add.graphics().setDepth(3);
    this.oakLight = this.add.graphics().setDepth(3);
    this.enemySignals = this.add.graphics().setDepth(3);
    this.drawLevel(fernlight);
    for (let index = 0; index < 12; index++) {
      const effect = this.sprite(0, 0, 'vfx', 'dust-0', .65).setDepth(6).setVisible(false);
      effect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.setVisible(false));
      this.effects.push(effect);
    }
    this.syncSprites();
    this.pauseAnimations();
    this.host.onReady();
  }

  needsBackdrop(level: Level) {
    return level !== fernlight && !this.textures.exists(level.id);
  }

  async loadBackdrop(level: Level) {
    const url = level.id === 'willow-run' ? this.previewArt?.willow : this.previewArt?.oak;
    if (!url) throw new Error('Missing trail backdrop');
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!this.textures.exists(level.id)) this.textures.addImage(level.id, image);
  }

  private loadNearLayer() {
    if (!this.previewArt || this.nearRequested) return;
    this.nearRequested = true;
    const image = new Image();
    image.src = this.previewArt.near;
    void image.decode().then(() => {
      this.textures.addImage('near', image);
      this.nearLayer = this.add.tileSprite(0, HEIGHT, WIDTH, 150, 'near')
        .setOrigin(0, 1).setScrollFactor(0).setDepth(-1).setAlpha(.55);
      this.nearLayer.setTileScale(150 / image.height);
      this.nearLayer.tilePositionX = this.cameras.main.scrollX * .64;
    }, () => {
      // The near layer is decorative. Its failure leaves the far layer visible.
    });
  }

  startAttempt(level = fernlight) {
    const previousLevel = this.session.level;
    if (level !== previousLevel) {
      this.drawLevel(level);
      if (previousLevel !== fernlight) this.textures.remove(previousLevel.id);
    }
    this.session = new Session(level);
    this.loadNearLayer();
    this.rememberPlayerPosition();
    this.cameras.main.scrollX = 0;
    this.backdrop.x = 0;
    if (this.nearLayer) this.nearLayer.tilePositionX = 0;
    this.motes?.clear();
    this.landingUntil = 0;
    this.displayedSeeds = -1;
    this.pip.stop();
    for (const effect of this.effects) effect.setVisible(false).stop();
    this.setRunning(true);
    this.syncSprites();
    this.host.onStep(this.session, []);
  }

  setRunning(running: boolean) {
    this.running = running;
    this.accumulator = 0;
    if (running) {
      this.rememberPlayerPosition();
      if (this.host.reducedMotion()) {
        for (const effect of this.effects) effect.setVisible(false).stop();
      }
      for (const actor of this.animatedSprites()) actor.anims.resume();
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
      this.rememberPlayerPosition();
      const events = this.session.step(this.host.sampleInput());
      this.feedback(events);
      this.host.onStep(this.session, events);
    }
    if (steps === 5 && this.accumulator >= STEP_MS) this.accumulator = 0;
    this.syncSprites();
    const camera = this.cameras.main;
    const left = this.session.player.x + this.session.player.vx / 250 * 96 - WIDTH / 2;
    const target = Phaser.Math.Clamp(left, 0, this.session.level.width - WIDTH);
    camera.scrollX += (target - camera.scrollX) * (1 - Math.exp(-Math.min(delta, 100) / 150));
    this.backdrop.x = -camera.scrollX * this.backdropScroll;
    if (this.nearLayer) this.nearLayer.tilePositionX = camera.scrollX * .64;
    this.motes?.clear();
    if (campaignPreview && !this.host.reducedMotion()) {
      for (let index = 0; index < 18; index++) {
        const x = Phaser.Math.Wrap(index * 137 + this.session.ticks * .17 - camera.scrollX * .45, 0, WIDTH);
        const y = 104 + (index * 71) % 274 + 14 * Math.sin(this.session.ticks / 75 + index);
        this.motes?.fillStyle(0xffeab5, .25 + .15 * Math.sin(this.session.ticks / 48 + index));
        this.motes?.fillCircle(x, y, 1 + index % 2);
      }
    }
  }

  private pauseAnimations() {
    for (const actor of this.animatedSprites()) actor.anims.pause();
  }

  private animatedSprites() {
    return [this.pip, ...this.enemySprites.values(), ...this.fireflies.values(), ...this.effects];
  }

  private rememberPlayerPosition() {
    this.previousX = this.session.player.x;
    this.previousY = this.session.player.y;
  }

  private feedback(events: ReturnType<Session['step']>) {
    const { player, ticks } = this.session;
    if (events.includes('respawn')) {
      this.rememberPlayerPosition();
      this.cameras.main.scrollX = Phaser.Math.Clamp(player.x - WIDTH / 2, 0, this.session.level.width - WIDTH);
    }
    if (events.includes('land')) this.landingUntil = ticks + 6;
    if (this.host.reducedMotion()) return;
    for (const event of events) {
      if (event === 'land' || event === 'stomp') this.burst('dust', player.x, player.y - 4);
      if (event === 'healthChanged') this.burst('hit', player.x, player.y - 30);
      if (event === 'seedCollected' || event === 'fireflyCollected') this.burst('seed-spark', player.x, player.y - 32);
      if (event === 'lanternLit') this.burst('seed-spark', this.lantern.x, this.lantern.y - 68);
      if (event === 'gateOpened' || event === 'levelCleared') this.burst('seed-spark', this.gate.x, this.gate.y - 75);
    }
  }

  private burst(clip: string, x: number, y: number) {
    const effect = this.effects.find((sprite) => !sprite.visible);
    effect?.setPosition(x, y).setVisible(true).play(clip);
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

  private drawLevel(level: Level) {
    for (const object of this.landscape) object.destroy();
    this.landscape = [];
    this.pickups.clear();
    this.fireflies.clear();
    this.enemySprites.clear();

    this.cameras.main.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setScroll(0, level.height - HEIGHT);
    this.backdrop.setTexture(level === fernlight ? 'forest' : level.id);
    const isOak = level.id === 'lantern-oak';
    // Frame the first oak in the mirrored artwork throughout the final trail.
    const scale = HEIGHT / this.backdrop.height * (isOak ? 1.66 : 1);
    this.backdrop.setScale(scale).setY(isOak ? -64 : 0);
    this.backdropScroll = scale * (isOak ? .14 : .18);
    this.drawTerrain(level);
    for (const hazard of level.hazards) {
      this.landscape.push(this.sprite(hazard.x + hazard.width / 2, hazard.y + hazard.height, 'props', 'bramble', .37));
    }
    this.lantern = this.sprite(level.checkpoint.x, level.checkpoint.y, 'props', 'lantern-dormant', .47);
    this.gate = this.sprite(level.goal.x, level.goal.y, 'props', 'portal-dormant', .65);
    this.landscape.push(this.lantern, this.gate);
    for (const seed of level.seeds) {
      const sprite = this.sprite(seed.x, seed.y, 'props', 'heartseed', .31).setDepth(2);
      this.pickups.set(seed.id, sprite);
      this.landscape.push(sprite);
    }
    for (const item of level.fireflies) {
      const sprite = this.sprite(item.x, item.y, 'vfx', 'firefly-1', .39).setDepth(2);
      this.fireflies.set(item.id, sprite);
      this.landscape.push(sprite);
    }
    for (const enemy of level.enemies) {
      const beetle = enemy.type === 'beetle';
      const sprite = this.sprite(enemy.x, enemy.y, 'creatures', beetle ? 'beetle-a' : 'moth-up', .5).setDepth(2);
      this.enemySprites.set(enemy.id, sprite);
      this.landscape.push(sprite);
    }
  }

  private drawTerrain(level: Level) {
    const { ground, cellLogicalWidth, solidVisualTopInsetLogical, pixelsPerUnit } = terrainLayout;
    const shade = this.add.graphics().setDepth(.25);
    this.landscape.push(shade);
    for (const [index, solid] of level.solids.entries()) {
      const y = solid.y - solidVisualTopInsetLogical;
      const bodyY = y + ground.bodyStartOffsetLogical;
      const bodyHeight = solid.y + solid.height - bodyY;
      const deep = solid.height > 62;
      if (deep) {
        const fill = this.add.tileSprite(solid.x, bodyY, solid.width, bodyHeight, 'soil')
          .setOrigin(0).setTileScale(1.25, .9);
        fill.tilePositionX = index * 193;
        this.landscape.push(fill);
        for (let depth = 0; depth < bodyHeight; depth += 8) {
          shade.fillStyle(0x141b24, .18 + .38 * depth / bodyHeight);
          shade.fillRect(solid.x, bodyY + depth, solid.width, Math.min(8, bodyHeight - depth));
        }
        shade.fillStyle(0x141b24, .28);
        if (solid.x > 0) shade.fillRect(solid.x, bodyY + 11, 4, bodyHeight - 11);
        if (solid.x + solid.width < level.width) {
          shade.fillRect(solid.x + solid.width - 4, bodyY + 11, 4, bodyHeight - 11);
        }
      }
      const columns = Math.ceil(solid.width / cellLogicalWidth);
      for (let column = 0; column < columns; column++) {
        const frame = column === 0 ? ground.left
          : column === columns - 1 ? ground.right
            : ground.fill[((column * 17) ^ (column >> 1) ^ index) & 1] ?? ground.left;
        const tileWidth = solid.width * pixelsPerUnit / columns;
        const capWidth = column === 0 || column === columns - 1 ? 64 : Math.min(tileWidth, 64);
        const tileHeight = Math.min(solid.height + solidVisualTopInsetLogical, deep ? 41 : 62) * pixelsPerUnit;
        const cap = this.add.image(solid.x + column * solid.width / columns, y, 'terrain', frame)
          .setOrigin(0).setCrop(0, 0, capWidth, tileHeight)
          .setScale(tileWidth / capWidth / pixelsPerUnit, 1 / pixelsPerUnit).setDepth(.2);
        this.landscape.push(cap);
      }
      for (let offset = 95 + index * 13 % 56; offset < solid.width - 35; offset += 133 + index * 11 % 63) {
        const x = solid.x + offset;
        if (level.hazards.some((hazard) => Math.abs(x - hazard.x - hazard.width / 2) < 44)) continue;
        const fern = this.sprite(x, solid.y + 1, 'props', 'fern', .17)
          .setDepth(.3).setAlpha(.76).setFlipX(offset % 2 === 0);
        this.landscape.push(fern);
      }
    }
  }

  private syncSprites() {
    const session = this.session;
    const { player } = session;
    const pipClip = session.phase === 'cleared' ? 'cheer' : session.damageTicks > 44 ? 'hurt'
      : !player.grounded ? (player.vy < 0 ? 'rise' : 'fall')
        : session.ticks < this.landingUntil ? 'land' : Math.abs(player.vx) > 10 ? 'run' : 'idle';
    const fraction = this.running ? Phaser.Math.Clamp(this.accumulator / STEP_MS, 0, 1) : 1;
    this.pip.setPosition(Phaser.Math.Linear(this.previousX, player.x, fraction),
      Phaser.Math.Linear(this.previousY, player.y, fraction))
      .setFlipX(player.facing < 0).setVisible(session.phase !== 'recovering');
    if (pipClip === 'idle' || pipClip === 'run') this.pip.play(pipClip, true);
    else this.pip.stop().setFrame(pipClip);
    this.pip.setAlpha(!this.host.reducedMotion() && session.damageTicks > 0 && session.damageTicks % 16 < 5 ? .66 : 1);
    if (pipClip === 'run') this.pip.anims.timeScale = .75 + .45 * Math.abs(player.vx) / 250;
    else this.pip.anims.timeScale = 1;

    this.enemySignals.clear();
    for (const enemy of session.enemies) {
      const beetle = enemy.spec.type === 'beetle';
      const actor = this.enemySprites.get(enemy.spec.id);
      if (!actor) continue;
      const clip = beetle ? (enemy.defeated ? 'beetle-stomped' : 'beetle-walk')
        : (enemy.dipping ? 'moth-dip' : 'moth-hover');
      actor.setPosition(enemy.x, enemy.y).setFlipX(enemy.direction > 0);
      if (enemy.defeated) actor.stop().setFrame('beetle-stomped');
      else actor.play(clip, true);
      actor.setScale(.5, beetle && enemy.turnTicks > 0 && !this.host.reducedMotion() ? .45 : .5);
      if (!beetle && enemy.warning) {
        this.enemySignals.fillStyle(0x281c32, .95).fillCircle(enemy.x, enemy.y - 29, 8);
        this.enemySignals.fillStyle(0xffdb91).fillTriangle(
          enemy.x - 4, enemy.y - 31, enemy.x + 4, enemy.y - 31, enemy.x, enemy.y - 26,
        );
      }
      if (beetle && enemy.turnTicks > 0) actor.anims.pause();
      else if (this.running) actor.anims.resume();
    }
    this.lantern.setFrame(session.checkpoint ? 'lantern' : 'lantern-dormant');
    this.syncGate();
    for (const [id, sprite] of this.pickups) sprite.setVisible(!session.seeds.has(id));
    for (const [id, sprite] of this.fireflies) {
      const visible = !session.fireflies.has(id);
      sprite.setVisible(visible);
      if (!visible || this.host.reducedMotion()) sprite.stop().setFrame('firefly-1');
      else if (this.running) sprite.play('firefly', true);
    }
  }

  private syncGate() {
    const session = this.session;
    if (this.displayedSeeds === session.seeds.size) return;
    this.displayedSeeds = session.seeds.size;
    this.gate.setFrame(session.gateOpen ? 'portal' : 'portal-dormant');
    this.gateLights.clear();
    for (let index = 0; index < session.level.seeds.length; index++) {
      const x = this.gate.x + (index - 1) * 16;
      const y = this.gate.y - 127;
      this.gateLights.fillStyle(0x162b25, .95).fillCircle(x, y, 6);
      this.gateLights.lineStyle(1, 0xffedb9).strokeCircle(x, y, 6);
      if (index < session.seeds.size) this.gateLights.fillStyle(0xf9d87d, 1).fillCircle(x, y, 3.5);
    }
    this.oakLight.clear();
    if (session.level.id === 'lantern-oak' && session.gateOpen) {
      for (let radius = 105; radius >= 21; radius -= 21) {
        this.oakLight.fillStyle(0xffca71, .07).fillCircle(this.gate.x, this.gate.y - 91, radius);
      }
    }
  }
}
