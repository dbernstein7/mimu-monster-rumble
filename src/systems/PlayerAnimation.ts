import type { MovementVector } from '../input/InputManager';
import type { CharacterId } from '../types/game';
import {
  getCharacterSpriteConfig,
  getRunAnimKey,
  type RunFacing,
} from '../config/playerSprites';

type Facing = 'down' | 'up' | 'left' | 'right';

export function registerCharacterAnimations(scene: Phaser.Scene, id: CharacterId): boolean {
  const cfg = getCharacterSpriteConfig(id);
  if (!cfg) return false;

  const animKey = getRunAnimKey(id);
  if (scene.anims.exists(animKey)) return true;

  const sheetKey = `${id}_run_sheet`;
  if (scene.textures.exists(sheetKey)) {
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(sheetKey, { start: 0, end: cfg.frameCount - 1 }),
      frameRate: cfg.frameRate,
      repeat: -1,
    });
    return true;
  }

  const frameKeys: Phaser.Types.Animations.AnimationFrame[] = [];
  for (let i = 0; i < cfg.frameCount; i++) {
    const key = `${id}_run_${i}`;
    if (!scene.textures.exists(key)) return false;
    frameKeys.push({ key });
  }

  scene.anims.create({
    key: animKey,
    frames: frameKeys,
    frameRate: cfg.frameRate,
    repeat: -1,
  });
  return true;
}

export function loadCharacterSprites(scene: Phaser.Scene, id: CharacterId): void {
  const cfg = getCharacterSpriteConfig(id);
  if (!cfg) return;

  if (cfg.projectFrameUrls?.length) {
    cfg.projectFrameUrls.forEach((url, i) => {
      scene.load.image(`${id}_run_${i}`, url);
    });
    return;
  }

  const base = `/assets/characters/${cfg.folder}`;

  if (cfg.separateFrames && cfg.frames) {
    for (let i = 0; i < cfg.frameCount; i++) {
      scene.load.image(`${id}_run_${i}`, `${base}/${cfg.frames}_${i}.png`);
    }
    return;
  }

  if (cfg.spritesheet) {
    scene.load.spritesheet(`${id}_run_sheet`, `${base}/${cfg.spritesheet}`, {
      frameWidth: cfg.frameWidth,
      frameHeight: cfg.frameHeight,
    });
  }
}

export function updatePlayerAnimation(
  sprite: Phaser.Physics.Arcade.Sprite,
  characterId: CharacterId,
  movement: MovementVector,
  lastFacing: Facing,
): Facing {
  const cfg = getCharacterSpriteConfig(characterId);
  const animKey = getRunAnimKey(characterId);

  if (!cfg || !sprite.scene.anims.exists(animKey)) {
    return lastFacing;
  }

  const moving = movement.x !== 0 || movement.y !== 0;
  if (!moving) {
    sprite.anims.stop();
    sprite.setFrame(0);
    applyFacing(sprite, lastFacing, cfg.runFacing, lastFacing);
    return lastFacing;
  }

  const facing = pickFacing(movement, lastFacing);
  applyFacing(sprite, facing, cfg.runFacing, lastFacing);

  if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
    sprite.play(animKey, true);
  }

  return facing;
}

function pickFacing(movement: MovementVector, lastFacing: Facing): Facing {
  const absX = Math.abs(movement.x);
  const absY = Math.abs(movement.y);

  if (absX < 0.01 && absY < 0.01) {
    return lastFacing;
  }

  if (absX > absY * 0.6) {
    return movement.x < 0 ? 'left' : 'right';
  }
  if (absY > absX * 0.6) {
    return movement.y < 0 ? 'up' : 'down';
  }

  if (absX >= absY) {
    return movement.x < 0 ? 'left' : 'right';
  }
  return movement.y < 0 ? 'up' : 'down';
}

function applyFacing(
  sprite: Phaser.Physics.Arcade.Sprite,
  facing: Facing,
  runFacing: RunFacing,
  lastFacing: Facing,
): void {
  sprite.setFlipX(false);
  sprite.setFlipY(false);

  if (runFacing === 'down') {
    switch (facing) {
      case 'left':
        sprite.setFlipX(true);
        break;
      case 'up':
        sprite.setFlipY(true);
        break;
      case 'right':
      case 'down':
      default:
        break;
    }
    return;
  }

  if (runFacing === 'right') {
    if (facing === 'left') {
      sprite.setFlipX(true);
    } else if (facing === 'right') {
      sprite.setFlipX(false);
    } else {
      sprite.setFlipX(lastFacing === 'left');
    }
    return;
  }
}
