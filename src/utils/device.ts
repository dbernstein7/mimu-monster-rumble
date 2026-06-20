import Phaser from 'phaser';
import type { Game as PhaserGame } from 'phaser';

const MOBILE_VIEWPORT_IDS = ['game-container', 'boot-loader', 'rotate-prompt'] as const;
const IMMERSIVE_CLASS = 'mobile-immersive';

let viewportGame: PhaserGame | undefined;
let immersive = false;

export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  return coarse && narrow && touchPoints;
}

export function isMobileImmersive(): boolean {
  return immersive;
}

export function setMobileImmersive(active: boolean): void {
  immersive = active;
  document.body.classList.toggle(IMMERSIVE_CLASS, active);
  syncMobileViewport();
}

function isNativeFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const container = document.getElementById('game-container');
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement === container || doc.webkitFullscreenElement === container;
}

function applyFullWindowLayout(): void {
  for (const id of MOBILE_VIEWPORT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }
  window.scrollTo(0, 0);
}

/** Pin layout to the visible viewport so mobile browser chrome does not clip the game. */
export function syncMobileViewport(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isMobileTouchDevice()) return;

  if (isNativeFullscreen() || immersive) {
    applyFullWindowLayout();
    return;
  }

  const vv = window.visualViewport;
  if (!vv) {
    applyFullWindowLayout();
    return;
  }

  const top = Math.max(0, vv.offsetTop);
  const left = Math.max(0, vv.offsetLeft);
  const width = `${vv.width}px`;
  const height = `${vv.height}px`;

  for (const id of MOBILE_VIEWPORT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.position = 'fixed';
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.width = width;
    el.style.height = height;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  window.scrollTo(0, 0);
}

function onMobileViewportChange(): void {
  syncMobileViewport();
  syncMobileOrientationUi();
  viewportGame?.scale.refresh();
}

export function bindMobileViewport(game?: PhaserGame): void {
  if (typeof window === 'undefined' || !isMobileTouchDevice()) return;

  if (game) viewportGame = game;

  syncMobileViewport();

  if ((window as Window & { __mimuViewportBound?: boolean }).__mimuViewportBound) return;
  (window as Window & { __mimuViewportBound?: boolean }).__mimuViewportBound = true;

  window.visualViewport?.addEventListener('resize', onMobileViewportChange);
  window.visualViewport?.addEventListener('scroll', onMobileViewportChange);
  window.addEventListener('orientationchange', onMobileViewportChange);
  window.addEventListener('resize', onMobileViewportChange);

  document.addEventListener('fullscreenchange', onMobileViewportChange);
  document.addEventListener('webkitfullscreenchange', onMobileViewportChange);
}

export function isPortraitMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return isMobileTouchDevice() && window.matchMedia('(orientation: portrait)').matches;
}

export function syncMobileOrientationUi(): void {
  if (typeof document === 'undefined') return;
  const prompt = document.getElementById('rotate-prompt');
  const gameContainer = document.getElementById('game-container');
  if (!prompt || !gameContainer) return;

  const showPrompt = isPortraitMobile();
  prompt.classList.toggle('visible', showPrompt);
  gameContainer.classList.toggle('mobile-hidden', showPrompt);
}

export function bindMobileOrientationUi(): void {
  if (typeof window === 'undefined') return;
  bindMobileViewport();
  syncMobileOrientationUi();
}

export async function tryLockLandscape(): Promise<void> {
  if (!isMobileTouchDevice()) return;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  if (!orientation?.lock) return;
  try {
    await orientation.lock('landscape');
  } catch {
    // Requires user gesture or is unsupported — rotate prompt still guides the player.
  }
}

export function getMobileScaleMode(): number {
  return isMobileTouchDevice() ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
}
