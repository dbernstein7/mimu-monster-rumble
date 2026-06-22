import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isMobileTouchDevice } from './device';

export interface CanvasScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
}

export interface GameUiInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let safeAreaProbe: HTMLDivElement | undefined;

function readSafeAreaInsetsPx(): { top: number; right: number; bottom: number; left: number } {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (!safeAreaProbe) {
    safeAreaProbe = document.createElement('div');
    safeAreaProbe.setAttribute('aria-hidden', 'true');
    safeAreaProbe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding:' +
      'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) ' +
      'env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)';
    document.body.appendChild(safeAreaProbe);
  }

  const style = getComputedStyle(safeAreaProbe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

/** Map the Phaser canvas to screen pixels (FIT letterbox aware). */
export function getCanvasScreenRect(scene: Phaser.Scene): CanvasScreenRect | null {
  const canvas = scene.game.canvas;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    scale: rect.width / GAME_WIDTH,
  };
}

/** Insets inside 1280×720 space — keeps HUD / touch controls off notches & edges. */
export function getMobileGameUiInsets(scene: Phaser.Scene): GameUiInsets {
  if (!isMobileTouchDevice()) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const screen = getCanvasScreenRect(scene);
  const scale = screen?.scale ?? 1;
  const safe = readSafeAreaInsetsPx();

  const toGame = (px: number): number => px / scale;

  return {
    top: Math.max(12, toGame(safe.top)) + 8,
    right: Math.max(28, toGame(safe.right)) + 20,
    bottom: Math.max(32, toGame(safe.bottom)) + 24,
    left: Math.max(12, toGame(safe.left)) + 8,
  };
}

export type HtmlGameAnchor = 'center' | 'bottom-center' | 'top-center';

/** Position a fixed HTML element at a game-space point over the canvas. */
export function positionHtmlAtGamePoint(
  el: HTMLElement,
  gameX: number,
  gameY: number,
  screen: CanvasScreenRect,
  anchor: HtmlGameAnchor = 'center',
): void {
  const scaleX = screen.width / GAME_WIDTH;
  const scaleY = screen.height / GAME_HEIGHT;
  const screenX = screen.left + gameX * scaleX;
  const screenY = screen.top + gameY * scaleY;

  el.style.position = 'fixed';
  el.style.left = `${screenX}px`;
  el.style.margin = '0';

  if (anchor === 'center') {
    el.style.top = `${screenY}px`;
    el.style.bottom = 'auto';
    el.style.transform = 'translate(-50%, -50%)';
    return;
  }

  if (anchor === 'bottom-center') {
    el.style.top = `${screenY}px`;
    el.style.bottom = 'auto';
    el.style.transform = 'translate(-50%, -100%)';
    return;
  }

  el.style.top = `${screenY}px`;
  el.style.bottom = 'auto';
  el.style.transform = 'translate(-50%, 0)';
}

export function bindSceneOverlayPosition(scene: Phaser.Scene, sync: () => void): () => void {
  const run = (): void => {
    if (scene.scene.isActive()) sync();
  };

  run();
  requestAnimationFrame(run);
  scene.scale.on('resize', run);
  window.addEventListener('resize', run);
  window.addEventListener('orientationchange', run);

  return () => {
    scene.scale.off('resize', run);
    window.removeEventListener('resize', run);
    window.removeEventListener('orientationchange', run);
  };
}

/** Scale a root Phaser container so stacked menu UI fits inside the play area. */
export function fitContainerToGameHeight(
  container: Phaser.GameObjects.Container,
  maxBottomY: number,
  minTopY = 0,
): void {
  const bounds = container.getBounds();
  if (!bounds.height) return;

  const overflow = bounds.bottom - maxBottomY;
  if (overflow <= 0 && bounds.top >= minTopY) {
    container.setScale(1);
    container.x = 0;
    container.y = 0;
    return;
  }

  const topOverflow = minTopY - bounds.top;
  const neededScale = Math.min(
    1,
    (maxBottomY - minTopY) / bounds.height,
    overflow > 0 ? (maxBottomY - bounds.top) / bounds.height : 1,
    topOverflow > 0 ? (bounds.bottom - minTopY) / bounds.height : 1,
  );

  const scale = Phaser.Math.Clamp(neededScale, 0.72, 1);
  container.setScale(scale);
  container.x = (GAME_WIDTH / 2) * (1 - scale);
  container.y = minTopY - bounds.top * scale;
}
