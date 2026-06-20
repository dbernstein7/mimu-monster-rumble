import Phaser from 'phaser';

/** Ground oval under sprites — higher = easier to read on busy floors. */
const DEFAULT_ALPHA = 0.48;
const DEFAULT_RADIUS_Y_SCALE = 0.42;

export interface GroundShadowConfig {
  radiusX: number;
  radiusY?: number;
  offsetY?: number;
  depth?: number;
  alpha?: number;
}

export type ShadowSprite = Phaser.GameObjects.Sprite & {
  groundShadow?: Phaser.GameObjects.Ellipse;
  groundShadowOffsetY?: number;
  groundShadowAlpha?: number;
};

export function attachGroundShadow(sprite: ShadowSprite, config: GroundShadowConfig): Phaser.GameObjects.Ellipse {
  const rx = config.radiusX;
  const ry = config.radiusY ?? rx * 0.36;
  const offsetY = config.offsetY ?? sprite.displayHeight * 0.44;
  const depth = config.depth ?? sprite.depth - 1;
  const alpha = config.alpha ?? DEFAULT_ALPHA;

  const shadow = sprite.scene.add.ellipse(
    sprite.x,
    sprite.y + offsetY,
    rx * 2,
    ry * 2,
    0x000000,
    alpha,
  );
  shadow.setDepth(depth);

  sprite.groundShadow = shadow;
  sprite.groundShadowOffsetY = offsetY;
  sprite.groundShadowAlpha = alpha;

  const sync = () => syncGroundShadow(sprite);
  sprite.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    sprite.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    shadow.destroy();
  });

  sync();
  return shadow;
}

export function syncGroundShadow(sprite: ShadowSprite): void {
  const shadow = sprite.groundShadow;
  if (!shadow?.active || !sprite.active) return;

  shadow.setPosition(sprite.x, sprite.y + (sprite.groundShadowOffsetY ?? 0));
  shadow.setVisible(sprite.visible);
  shadow.setAlpha((sprite.groundShadowAlpha ?? DEFAULT_ALPHA) * sprite.alpha);
}

export function shadowFromFeet(sprite: Phaser.GameObjects.Sprite, radiusX: number, depth?: number): GroundShadowConfig {
  return {
    radiusX,
    radiusY: radiusX * DEFAULT_RADIUS_Y_SCALE,
    offsetY: sprite.displayHeight * 0.44,
    depth,
    alpha: DEFAULT_ALPHA,
  };
}
