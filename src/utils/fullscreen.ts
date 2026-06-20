import Phaser from 'phaser';
import {
  isMobileImmersive,
  isMobileTouchDevice,
  setMobileImmersive,
  syncMobileViewport,
  tryLockLandscape,
} from './device';

function canRequestNativeFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById('game-container') as HTMLElement | null;
  if (!el) return false;
  const doc = document as Document & { webkitFullscreenEnabled?: boolean };
  return !!(
    (doc.fullscreenEnabled && el.requestFullscreen) ||
    (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen
  );
}

export function isFullscreenSupported(_scene: Phaser.Scene): boolean {
  if (typeof document === 'undefined') return false;
  return canRequestNativeFullscreen() || isMobileTouchDevice();
}

export function isFullscreen(scene: Phaser.Scene): boolean {
  return scene.scale.isFullscreen || isMobileImmersive();
}

function refreshDisplay(scene: Phaser.Scene): void {
  syncMobileViewport();
  scene.scale.refresh();
}

export function enterFullscreen(scene: Phaser.Scene): void {
  if (isFullscreen(scene)) return;

  if (canRequestNativeFullscreen()) {
    scene.scale.startFullscreen();
    refreshDisplay(scene);
    void tryLockLandscape();
    return;
  }

  if (isMobileTouchDevice()) {
    setMobileImmersive(true);
    refreshDisplay(scene);
    void tryLockLandscape();
  }
}

export function exitFullscreen(scene: Phaser.Scene): void {
  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
  }
  setMobileImmersive(false);
  refreshDisplay(scene);
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (!isFullscreenSupported(scene)) return;

  if (isFullscreen(scene)) {
    exitFullscreen(scene);
  } else {
    enterFullscreen(scene);
  }
}
