import Phaser from 'phaser';
import { destroyAuthFormOverlay } from '../ui/authForm';

export const AUTH_SCENE_KEY = 'AuthScene';

/** Ensure auth HTML overlay never blocks menu clicks after leaving the account page. */
export function bindAuthOverlaySceneCleanup(game: Phaser.Game): void {
  const scenePlugin = game.scene;
  const originalStart = scenePlugin.start.bind(scenePlugin);

  scenePlugin.start = (key: string, data?: object) => {
    if (key !== AUTH_SCENE_KEY) {
      destroyAuthFormOverlay();
    }
    return originalStart(key, data);
  };
}

export function focusGameSurface(): void {
  const gameContainer = document.getElementById('game-container');
  gameContainer?.focus({ preventScroll: true });
}
