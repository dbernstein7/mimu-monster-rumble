import Phaser from 'phaser';
import type { Game as PhaserGame } from 'phaser';

const MOBILE_VIEWPORT_IDS = ['game-container', 'boot-loader', 'rotate-prompt'] as const;
const VIEWPORT_SETTLE_MS = 200;
const VIEWPORT_SIZE_THRESHOLD = 48;

let viewportGame: PhaserGame | undefined;
let lockedLandscape: { width: number; height: number } | null = null;
let viewportChangeTimer = 0;

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

export function isPortraitMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return isMobileTouchDevice() && window.matchMedia('(orientation: portrait)').matches;
}

function measureLandscapeViewport(): { width: number; height: number } {
  const vv = window.visualViewport;
  return {
    width: Math.round(window.innerWidth),
    height: Math.round(Math.max(window.innerHeight, vv?.height ?? 0)),
  };
}

function captureLandscapeLock(): void {
  if (isPortraitMobile()) {
    lockedLandscape = null;
    return;
  }
  lockedLandscape = measureLandscapeViewport();
}

function layoutMobileElements(top: number, left: number, width: number, height: number): void {
  for (const id of MOBILE_VIEWPORT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.position = 'fixed';
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }
  window.scrollTo(0, 0);
}

function clearMobileInlineLayout(): void {
  for (const id of MOBILE_VIEWPORT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.top = '';
    el.style.left = '';
    el.style.width = '';
    el.style.height = '';
  }
}

function shouldRelockViewport(next: { width: number; height: number }): boolean {
  const prev = lockedLandscape;
  if (!prev) return true;

  const orientationSwap =
    Math.abs(prev.width - next.height) < 80 && Math.abs(prev.height - next.width) < 80;

  return (
    orientationSwap ||
    Math.abs(prev.width - next.width) > VIEWPORT_SIZE_THRESHOLD ||
    Math.abs(prev.height - next.height) > VIEWPORT_SIZE_THRESHOLD
  );
}

/** Keep one stable landscape size; ignore Safari chrome / visualViewport jitter during play. */
export function syncMobileViewport(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isMobileTouchDevice()) return;

  if (isPortraitMobile()) {
    lockedLandscape = null;
    clearMobileInlineLayout();
    return;
  }

  if (!lockedLandscape) {
    captureLandscapeLock();
  }

  if (!lockedLandscape) return;

  layoutMobileElements(0, 0, lockedLandscape.width, lockedLandscape.height);
}

function applyViewportChange(): void {
  syncMobileOrientationUi();

  if (isPortraitMobile()) {
    lockedLandscape = null;
    clearMobileInlineLayout();
    return;
  }

  const next = measureLandscapeViewport();
  if (!shouldRelockViewport(next)) {
    return;
  }

  lockedLandscape = next;
  syncMobileViewport();

  if (!isAuthInputFocused()) {
    viewportGame?.scale.refresh();
  }
}

function onMobileViewportChange(): void {
  window.clearTimeout(viewportChangeTimer);
  viewportChangeTimer = window.setTimeout(applyViewportChange, VIEWPORT_SETTLE_MS);
}

export function bindMobileViewport(game?: PhaserGame): void {
  if (typeof window === 'undefined' || !isMobileTouchDevice()) return;

  if (game) viewportGame = game;

  captureLandscapeLock();
  syncMobileViewport();

  if ((window as Window & { __mimuViewportBound?: boolean }).__mimuViewportBound) return;
  (window as Window & { __mimuViewportBound?: boolean }).__mimuViewportBound = true;

  // Do not listen to visualViewport scroll/resize — iOS Safari fires those when the
  // address bar shows/hides and causes the canvas to jump during gameplay.
  window.addEventListener('orientationchange', onMobileViewportChange);
  window.addEventListener('resize', onMobileViewportChange);
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
