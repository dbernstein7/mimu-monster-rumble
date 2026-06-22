import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/gameConstants';
import {
  bindSceneOverlayPosition,
  getCanvasScreenRect,
  positionHtmlAtGamePoint,
} from '../utils/mobileLayout';

const STYLE_ID = 'mimu-char-select-overlay-styles';
const SHELL_CLASS = 'mimu-char-select-shell';
const BTN_CLASS = 'mimu-char-select-back';

const BACK_GAME_X = 640;
const BACK_GAME_Y = GAME_HEIGHT - 36;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${SHELL_CLASS} {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10000;
    }
    .${BTN_CLASS} {
      position: fixed;
      pointer-events: auto;
      border: 2px solid rgba(168, 155, 196, 0.45);
      border-radius: 12px;
      padding: 0.72rem 1.75rem;
      min-height: 44px;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.94);
      cursor: pointer;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .${BTN_CLASS}:hover {
      border-color: #ffc857;
      color: #ffc857;
    }
  `;
  document.head.appendChild(style);
}

/** Remove HTML back control so it never blocks other scenes. */
export function destroyCharacterSelectOverlay(): void {
  document.querySelectorAll(`.${SHELL_CLASS}`).forEach((node) => {
    node.remove();
  });
}

/** HTML back button aligned to canvas coordinates (not letterboxed container %). */
export function mountCharacterSelectBackButton(
  scene: Phaser.Scene,
  onBack: () => void,
): void {
  destroyCharacterSelectOverlay();
  ensureStyles();

  const shell = document.createElement('div');
  shell.className = SHELL_CLASS;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = BTN_CLASS;
  btn.textContent = '← BACK';

  const handleBack = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    onBack();
  };

  btn.addEventListener('click', handleBack);
  btn.addEventListener('touchend', handleBack, { passive: false });

  shell.append(btn);
  document.body.appendChild(shell);

  const syncPosition = (): void => {
    if (!shell.isConnected) return;
    const screen = getCanvasScreenRect(scene);
    if (!screen) return;
    positionHtmlAtGamePoint(btn, BACK_GAME_X, BACK_GAME_Y, screen, 'bottom-center');
  };

  const unbind = bindSceneOverlayPosition(scene, syncPosition);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    unbind();
    destroyCharacterSelectOverlay();
  });
}
