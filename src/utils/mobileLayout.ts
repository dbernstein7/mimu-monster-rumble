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

/** Insets inside 1280×720 space — keeps HUD / touch controls off edges. */
export function getMobileGameUiInsets(scene: Phaser.Scene): GameUiInsets {
  if (!isMobileTouchDevice()) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // Safe-area is already applied on #game-container via CSS env(); avoid double-padding.
  void scene;
  return {
    top: 12,
    right: 18,
    bottom: 18,
    left: 12,
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
  uiScale = 1,
): void {
  const scaleX = screen.width / GAME_WIDTH;
  const scaleY = screen.height / GAME_HEIGHT;
  const screenX = screen.left + gameX * scaleX;
  const screenY = screen.top + gameY * scaleY;
  const scaleSuffix = uiScale === 1 ? '' : ` scale(${uiScale})`;

  el.style.position = 'fixed';
  el.style.left = `${screenX}px`;
  el.style.margin = '0';

  if (anchor === 'center') {
    el.style.top = `${screenY}px`;
    el.style.bottom = 'auto';
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate(-50%, -50%)${scaleSuffix}`;
    return;
  }

  if (anchor === 'bottom-center') {
    el.style.top = `${screenY}px`;
    el.style.bottom = 'auto';
    el.style.transformOrigin = 'bottom center';
    el.style.transform = `translate(-50%, -100%)${scaleSuffix}`;
    return;
  }

  el.style.top = `${screenY}px`;
  el.style.bottom = 'auto';
  el.style.transformOrigin = 'top center';
  el.style.transform = `translate(-50%, 0)${scaleSuffix}`;
}

export function bindSceneOverlayPosition(scene: Phaser.Scene, sync: () => void): () => void {
  const run = (): void => {
    if (scene.scene.isActive()) sync();
  };

  run();
  requestAnimationFrame(run);
  scene.scale.on('resize', run);
  scene.scale.on('enterfullscreen', run);
  scene.scale.on('leavefullscreen', run);
  window.addEventListener('resize', run);
  window.addEventListener('orientationchange', run);

  return () => {
    scene.scale.off('resize', run);
    scene.scale.off('enterfullscreen', run);
    scene.scale.off('leavefullscreen', run);
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
