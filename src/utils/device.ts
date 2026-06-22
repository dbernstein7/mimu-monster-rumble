import Phaser from 'phaser';
import type { Game as PhaserGame } from 'phaser';

const MOBILE_VIEWPORT_IDS = ['game-container', 'boot-loader', 'rotate-prompt'] as const;

let viewportGame: PhaserGame | undefined;
let lastFullMobileHeight = 0;

function isAuthFormOpen(): boolean {
  return !!document.querySelector('.mimu-auth-shell');
}

export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  return coarse && narrow && touchPoints;
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

/** Size the game to the visible mobile viewport (below browser chrome). */
export function syncMobileViewport(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isMobileTouchDevice()) return;

  const vv = window.visualViewport;
  const authOpen = isAuthFormOpen();

  if (vv) {
    const keyboardShrunk = vv.height < window.innerHeight * 0.82;
    if (!authOpen || !keyboardShrunk) {
      lastFullMobileHeight = vv.height;
    }

    const height =
      authOpen && keyboardShrunk
        ? Math.max(lastFullMobileHeight, window.innerHeight)
        : vv.height;

    layoutMobileElements(
      Math.max(0, vv.offsetTop),
      Math.max(0, vv.offsetLeft),
      vv.width,
      height,
    );
    return;
  }

  layoutMobileElements(0, 0, window.innerWidth, window.innerHeight);
}

function onMobileViewportChange(): void {
  syncMobileViewport();
  syncMobileOrientationUi();
  if (!isAuthFormOpen()) {
    viewportGame?.scale.refresh();
  }
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

export function getMobileScaleMode(): number {
  return Phaser.Scale.FIT;
}
