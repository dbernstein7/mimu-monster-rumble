import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConstants';

type PositionedSprite = Phaser.GameObjects.Components.Transform & {
  displayWidth: number;
  displayHeight: number;
};

/** Keep the full sprite visible inside the game viewport (not just the physics circle). */
export function clampSpriteToWorld(sprite: PositionedSprite): void {
  const halfW = sprite.displayWidth * 0.5;
  const padTop = sprite.displayHeight * 0.42;
  const padBottom = sprite.displayHeight * 0.48;

  sprite.x = Phaser.Math.Clamp(sprite.x, halfW, GAME_WIDTH - halfW);
  sprite.y = Phaser.Math.Clamp(sprite.y, padTop, GAME_HEIGHT - padBottom);
}

/** Spawn margins so new entities start fully on screen. */
export function spawnMargins(displayWidth: number, displayHeight: number, extra = 8): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const halfW = displayWidth * 0.5 + extra;
  const padTop = displayHeight * 0.42 + extra;
  const padBottom = displayHeight * 0.48 + extra;

  return {
    minX: halfW,
    maxX: GAME_WIDTH - halfW,
    minY: padTop,
    maxY: GAME_HEIGHT - padBottom,
  };
}
