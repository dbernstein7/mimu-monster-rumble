import type { Game as PhaserGame } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConstants';

const MOBILE_VIEWPORT_IDS = ['game-container', 'boot-loader', 'rotate-prompt'] as const;

/** Extra space above iOS home indicator / Android gesture bar (CSS px). */
const MOBILE_BROWSER_BOTTOM_PAD = 28;

let viewportGame: PhaserGame | undefined;
let cachedSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };

function readSafeAreaInsets(): typeof cachedSafeArea {
  if (typeof document === 'undefined') return cachedSafeArea;

  let probe = document.getElementById('safe-area-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-area-probe';
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);';
    document.body.appendChild(probe);
  }

  const style = getComputedStyle(probe);
  cachedSafeArea = {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
  };
  return cachedSafeArea;
}

/** Convert CSS px inset to game-space units for HUD / touch controls. */
export function cssPxToGameY(cssPx: number): number {
  if (typeof document === 'undefined' || cssPx <= 0) return 0;
  const canvas = document.querySelector('#game-container canvas');
  if (!canvas) return cssPx * (GAME_HEIGHT / 720);
  const h = canvas.getBoundingClientRect().height;
  if (h <= 0) return cssPx;
  return (cssPx / h) * GAME_HEIGHT;
}

/** Bottom inset (game px) keeping controls above browser chrome + home indicator. */
export function getMobileControlBottomInset(): number {
  if (!isMobileTouchDevice()) return 0;
  const safe = readSafeAreaInsets();
  const cssInset = safe.bottom + MOBILE_BROWSER_BOTTOM_PAD;
  return cssPxToGameY(cssInset) + 56;
}

export interface MobileControlLayout {
  joystick: { x: number; y: number };
  ability: { x: number; y: number; radius: number };
  secondary: { x: number; y: number; radius: number };
}

export function getMobileControlLayout(): MobileControlLayout {
  const bottom = getMobileControlBottomInset();
  return {
    joystick: { x: 112, y: GAME_HEIGHT - bottom - 64 },
    ability: { x: GAME_WIDTH - 84, y: GAME_HEIGHT - bottom - 78, radius: 44 },
    secondary: { x: GAME_WIDTH - 176, y: GAME_HEIGHT - bottom - 38, radius: 40 },
  };
}

export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  return coarse && narrow && touchPoints;
}

/** Pin layout to the visible viewport so mobile browser chrome does not clip the game. */
export function syncMobileViewport(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!isMobileTouchDevice()) return;

  const vv = window.visualViewport;
  if (!vv) return;

  const safe = readSafeAreaInsets();
  const top = Math.max(0, vv.offsetTop) + safe.top;
  const left = Math.max(0, vv.offsetLeft) + safe.left;
  const width = `${Math.max(0, vv.width - safe.left - safe.right)}px`;
  const height = `${Math.max(0, vv.height - safe.top - safe.bottom - MOBILE_BROWSER_BOTTOM_PAD)}px`;

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
