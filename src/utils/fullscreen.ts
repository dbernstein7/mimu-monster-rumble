import Phaser from 'phaser';

export function isFullscreenSupported(_scene: Phaser.Scene): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled;
}

export function isFullscreen(scene: Phaser.Scene): boolean {
  return scene.scale.isFullscreen;
}

export function enterFullscreen(scene: Phaser.Scene): void {
  if (!isFullscreenSupported(scene) || scene.scale.isFullscreen) return;
  scene.scale.startFullscreen();
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (!isFullscreenSupported(scene)) return;

  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
  } else {
    scene.scale.startFullscreen();
  }
}
