import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConstants';
import {
  bindSceneOverlayPosition,
  getCanvasScreenRect,
  positionHtmlAtGamePoint,
} from '../utils/mobileLayout';
import { isMobileTouchDevice } from '../utils/device';

const STYLE_ID = 'mimu-game-over-overlay-styles';
const SHELL_CLASS = 'mimu-game-over-shell';
const BTN_CLASS = 'mimu-game-over-btn';

const NAV_CENTER_X = GAME_WIDTH / 2;

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
      padding: 0.72rem 1.5rem;
      min-width: 220px;
      min-height: 46px;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.94);
      cursor: pointer;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      text-align: center;
    }
    .${BTN_CLASS}:hover {
      border-color: #ffc857;
      color: #ffc857;
    }
    .${BTN_CLASS}.primary {
      border-color: rgba(46, 213, 115, 0.55);
      background: rgba(20, 80, 50, 0.88);
    }
    .${BTN_CLASS}.primary:hover {
      border-color: #ffc857;
      color: #ffc857;
    }
    .${SHELL_CLASS}.mimu-game-over--mobile .${BTN_CLASS} {
      min-width: 200px;
      padding: 0.85rem 1.25rem;
    }
  `;
  document.head.appendChild(style);
}

export function destroyGameOverOverlay(): void {
  document.querySelectorAll(`.${SHELL_CLASS}`).forEach((node) => {
    node.remove();
  });
}

export function mountGameOverNav(
  scene: Phaser.Scene,
  options: {
    won: boolean;
    onMainMenu: () => void;
    onLeaderboard: () => void;
  },
): void {
  destroyGameOverOverlay();
  ensureStyles();

  const shell = document.createElement('div');
  shell.className = SHELL_CLASS;
  if (isMobileTouchDevice()) {
    shell.classList.add('mimu-game-over--mobile');
  }

  const buttons: { el: HTMLButtonElement; gameY: number }[] = [];

  const makeBtn = (
    label: string,
    gameY: number,
    primary: boolean,
    onClick: () => void,
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = primary ? `${BTN_CLASS} primary` : BTN_CLASS;
    btn.textContent = label;

    const handle = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    };

    btn.addEventListener('click', handle);
    btn.addEventListener('touchend', handle, { passive: false });
    shell.append(btn);
    buttons.push({ el: btn, gameY });
    return btn;
  };

  if (options.won) {
    makeBtn('LEADERBOARD', 490, false, options.onLeaderboard);
    makeBtn('MAIN MENU', 560, true, options.onMainMenu);
  } else {
    makeBtn('MAIN MENU', 490, true, options.onMainMenu);
    makeBtn('LEADERBOARD', 560, false, options.onLeaderboard);
  }

  document.body.appendChild(shell);

  const syncPosition = (): void => {
    if (!shell.isConnected) return;
    const screen = getCanvasScreenRect(scene);
    if (!screen) return;
    for (const { el, gameY } of buttons) {
      positionHtmlAtGamePoint(el, NAV_CENTER_X, gameY, screen, 'center');
    }
  };

  const unbind = bindSceneOverlayPosition(scene, syncPosition);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    unbind();
    destroyGameOverOverlay();
  });
}
