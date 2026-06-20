import Phaser from 'phaser';
import { isMobileTouchDevice } from './device';

export function isFullscreenSupported(_scene: Phaser.Scene): boolean {
  if (typeof document === 'undefined' || isMobileTouchDevice()) return false;
  const el = document.getElementById('game-container');
  return !!(document.fullscreenEnabled && el?.requestFullscreen);
}

export function isFullscreen(scene: Phaser.Scene): boolean {
  return scene.scale.isFullscreen;
}

export function enterFullscreen(scene: Phaser.Scene): void {
  if (!isFullscreenSupported(scene) || scene.scale.isFullscreen) return;
  scene.scale.startFullscreen();
}

export function exitFullscreen(scene: Phaser.Scene): void {
  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
  }
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (!isFullscreenSupported(scene)) return;

  if (scene.scale.isFullscreen) {
    exitFullscreen(scene);
  } else {
    enterFullscreen(scene);
  }
}
