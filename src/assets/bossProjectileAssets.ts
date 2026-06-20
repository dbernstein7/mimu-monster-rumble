import { BOSS2_SLIME_BALL_URLS } from './enemyFrames';

export function loadBoss2SlimeBallTextures(scene: Phaser.Scene): void {
  BOSS2_SLIME_BALL_URLS.forEach((url, i) => {
    scene.load.image(`boss2_slime_ball_${i}`, url);
  });
}
