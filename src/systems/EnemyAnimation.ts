import type { EnemySpriteId } from '../config/enemySprites';
import {
  getEnemyRunAnimKey,
  getEnemySpriteConfig,
} from '../config/enemySprites';
import type { RunFacing } from '../config/playerSprites';

type Facing = 'down' | 'up' | 'left' | 'right';

interface MovementVector {
  x: number;
  y: number;
}

export function loadEnemySprites(scene: Phaser.Scene, type: EnemySpriteId): void {
  const cfg = getEnemySpriteConfig(type);
  if (!cfg?.projectFrameUrls?.length) return;

  cfg.projectFrameUrls.forEach((url, i) => {
    scene.load.image(`${type}_run_${i}`, url);
  });
}

export function registerEnemyAnimations(scene: Phaser.Scene, type: EnemySpriteId): boolean {
  const cfg = getEnemySpriteConfig(type);
  if (!cfg) return false;

  const animKey = getEnemyRunAnimKey(type);
  if (scene.anims.exists(animKey)) return true;

  const frameKeys: Phaser.Types.Animations.AnimationFrame[] = [];
  for (let i = 0; i < cfg.frameCount; i++) {
    const key = `${type}_run_${i}`;
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

export function updateEnemyAnimation(
  sprite: Phaser.Physics.Arcade.Sprite,
  enemyType: EnemySpriteId,
  movement: MovementVector,
  lastFacing: Facing,
): Facing {
  const cfg = getEnemySpriteConfig(enemyType);
  const animKey = getEnemyRunAnimKey(enemyType);
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
  }
}
