import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConstants';

const SPOTLIGHT_TEXTURE_KEY = 'player_spotlight_glow';
const SCREEN_VIGNETTE_TEXTURE_KEY = 'screen_corner_vignette';

export interface PlayerSpotlightConfig {
  radius?: number;
  depth?: number;
  alpha?: number;
}

type SpotlightSprite = Phaser.Physics.Arcade.Sprite & {
  playerSpotlight?: Phaser.GameObjects.Image;
  playerSpotlightAlpha?: number;
};

export function ensureSpotlightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SPOTLIGHT_TEXTURE_KEY)) return;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 252, 235, 0.7)');
  gradient.addColorStop(0.28, 'rgba(255, 245, 220, 0.35)');
  gradient.addColorStop(0.55, 'rgba(220, 210, 255, 0.12)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  scene.textures.addCanvas(SPOTLIGHT_TEXTURE_KEY, canvas);
}

export function attachPlayerSpotlight(
  sprite: SpotlightSprite,
  config: PlayerSpotlightConfig = {},
): Phaser.GameObjects.Image {
  ensureSpotlightTexture(sprite.scene);

  const radius = config.radius ?? 105;
  const depth = config.depth ?? sprite.depth - 0.5;
  const alpha = config.alpha ?? 0.42;

  const glow = sprite.scene.add.image(sprite.x, sprite.y, SPOTLIGHT_TEXTURE_KEY);
  glow.setDepth(depth);
  glow.setBlendMode(Phaser.BlendModes.ADD);
  glow.setAlpha(alpha);
  glow.setDisplaySize(radius * 2, radius * 2);

  sprite.playerSpotlight = glow;
  sprite.playerSpotlightAlpha = alpha;

  const sync = () => syncPlayerSpotlight(sprite);
  sprite.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    sprite.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    glow.destroy();
  });

  sync();
  return glow;
}

export function syncPlayerSpotlight(sprite: SpotlightSprite): void {
  const glow = sprite.playerSpotlight;
  if (!glow?.active || !sprite.active) return;

  glow.setPosition(sprite.x, sprite.y);
  glow.setVisible(sprite.visible);
  glow.setAlpha((sprite.playerSpotlightAlpha ?? 0.42) * sprite.alpha);
}

function ensureScreenVignetteTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SCREEN_VIGNETTE_TEXTURE_KEY)) return;

  const width = 640;
  const height = 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.hypot(cx, cy);
  const gradient = ctx.createRadialGradient(cx, cy, maxRadius * 0.28, cx, cy, maxRadius);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.62, 'rgba(0, 0, 0, 0.08)');
  gradient.addColorStop(0.82, 'rgba(0, 0, 0, 0.45)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.88)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  scene.textures.addCanvas(SCREEN_VIGNETTE_TEXTURE_KEY, canvas);
}

/** Darkens screen corners so the center / player read more clearly. */
export function createScreenCornerVignette(
  scene: Phaser.Scene,
  options: { depth?: number; alpha?: number } = {},
): Phaser.GameObjects.Image {
  ensureScreenVignetteTexture(scene);

  const vignette = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, SCREEN_VIGNETTE_TEXTURE_KEY);
  vignette.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  vignette.setDepth(options.depth ?? 85);
  vignette.setAlpha(options.alpha ?? 0.72);
  vignette.setScrollFactor(0);
  vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => vignette.destroy());

  return vignette;
}
