import Phaser from 'phaser';
import {
  collapseBrowserChrome,
  isMobileImmersive,
  isMobileTouchDevice,
  isNativeFullscreenActive,
  setMobileImmersive,
  syncMobileViewport,
  tryLockLandscape,
} from './device';

function getFullscreenElement(): HTMLElement | null {
  return document.getElementById('game-container');
}

export async function requestNativeFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = getFullscreenElement();
  if (!el) return false;

  const options: FullscreenOptions = { navigationUI: 'hide' };

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen(options);
      return isNativeFullscreenActive();
    }
  } catch {
    // Try webkit fallback below.
  }

  const webkitEl = el as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (webkitEl.webkitRequestFullscreen) {
      webkitEl.webkitRequestFullscreen();
      return isNativeFullscreenActive();
    }
  } catch {
    // Fall through to mobile immersive mode.
  }

  return false;
}

export function isFullscreenSupported(_scene: Phaser.Scene): boolean {
  if (typeof document === 'undefined') return false;
  if (isMobileTouchDevice()) return true;
  const el = getFullscreenElement();
  return !!(document.fullscreenEnabled && el?.requestFullscreen);
}

export function isFullscreen(scene: Phaser.Scene): boolean {
  return scene.scale.isFullscreen || isMobileImmersive() || isNativeFullscreenActive();
}

function refreshDisplay(scene: Phaser.Scene): void {
  syncMobileViewport();
  scene.scale.refresh();
}

export async function enterFullscreen(scene: Phaser.Scene): Promise<void> {
  if (isFullscreen(scene)) return;

  const nativeOk = await requestNativeFullscreen();
  if (nativeOk) {
    refreshDisplay(scene);
    void tryLockLandscape();
    return;
  }

  if (isMobileTouchDevice()) {
    await collapseBrowserChrome();
    setMobileImmersive(true);
    refreshDisplay(scene);
    void tryLockLandscape();
  }
}

export function exitFullscreen(scene: Phaser.Scene): void {
  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
  }

  const doc = document as Document & { webkitExitFullscreen?: () => void };
  if (isNativeFullscreenActive()) {
    if (document.exitFullscreen) {
      void document.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    }
  }

  setMobileImmersive(false);
  refreshDisplay(scene);
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (!isFullscreenSupported(scene)) return;

  if (isFullscreen(scene)) {
    exitFullscreen(scene);
  } else {
    void enterFullscreen(scene);
  }
}
