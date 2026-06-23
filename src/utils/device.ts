import Phaser from 'phaser';
import type { Game as PhaserGame } from 'phaser';

let viewportGame: PhaserGame | undefined;
let viewportChangeTimer = 0;
let mobileShellApplied = false;

export function isAuthInputFocused(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
    return false;
  }
  return !!active.closest('.mimu-auth-shell');
}

export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const iOS = /iPad|iPhone|iPod/.test(ua) || iPadOS;
  return iOS && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  return coarse && narrow && touchPoints;
}

/** Use layout width/height — more reliable than orientation media queries alone. */
export function isPortraitMobile(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isMobileTouchDevice()) return false;
  return window.innerWidth < window.innerHeight;
}

function applyMobileShellClass(): void {
  if (typeof document === 'undefined' || !isMobileTouchDevice() || mobileShellApplied) return;
  document.documentElement.classList.add('mimu-mobile');
  mobileShellApplied = true;
}

/** Mobile shell only — canvas sizing is CSS + Phaser FIT (no inline dimension fighting). */
export function syncMobileViewport(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isMobileTouchDevice()) return;
  applyMobileShellClass();
  syncMobileOrientationUi();
}

export function refreshMobileGameScale(): void {
  if (!viewportGame || isAuthInputFocused()) return;
  viewportGame.scale.refresh();
}

/** Keep the canvas visible and scaled before mobile scene handoffs. */
export function prepareMobileSceneHandoff(game?: PhaserGame): void {
  if (!isMobileTouchDevice()) return;
  if (game) viewportGame = game;
  document.getElementById('game-container')?.classList.remove('mobile-hidden');
  syncMobileOrientationUi();
  refreshMobileGameScale();
}

function onMobileViewportChange(): void {
  window.clearTimeout(viewportChangeTimer);
  viewportChangeTimer = window.setTimeout(() => {
    syncMobileOrientationUi();
    refreshMobileGameScale();
  }, 120);
}

export function bindMobileViewport(game?: PhaserGame): void {
  if (typeof window === 'undefined' || !isMobileTouchDevice()) return;

  if (game) viewportGame = game;

  applyMobileShellClass();
  syncMobileViewport();

  if ((window as Window & { __mimuViewportBound?: boolean }).__mimuViewportBound) return;
  (window as Window & { __mimuViewportBound?: boolean }).__mimuViewportBound = true;

  window.addEventListener('orientationchange', onMobileViewportChange);
  window.addEventListener('resize', onMobileViewportChange);

  window.setTimeout(() => {
    syncMobileOrientationUi();
    refreshMobileGameScale();
  }, 400);
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

export function getMobileScaleMode(): number {
  return Phaser.Scale.FIT;
}
