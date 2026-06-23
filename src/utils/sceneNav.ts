import Phaser from 'phaser';
import { destroyAuthFormOverlay } from '../ui/authForm';
import { destroyCharacterSelectOverlay } from '../ui/characterSelectOverlay';
import { destroyGameOverOverlay } from '../ui/gameOverOverlay';
import { isMobileTouchDevice, prepareMobileSceneHandoff } from './device';

export const MAIN_MENU_SCENE_KEY = 'MainMenuScene';
export const AUTH_SCENE_KEY = 'AuthScene';
export const CHARACTER_SELECT_SCENE_KEY = 'CharacterSelectScene';
export const GAME_OVER_SCENE_KEY = 'GameOverScene';
/** Ignore menu clicks briefly after leaving gameplay (prevents quit click hitting PLAY). */
export const MAIN_MENU_INPUT_GUARD_MS = 500;

/** Ensure auth HTML overlay never blocks menu clicks after leaving the account page. */
export function bindAuthOverlaySceneCleanup(game: Phaser.Game): void {
  const scenePlugin = game.scene;
  const originalStart = scenePlugin.start.bind(scenePlugin);

  scenePlugin.start = (key: string, data?: object) => {
    if (key !== AUTH_SCENE_KEY) {
      destroyAuthFormOverlay();
    }
    if (key !== CHARACTER_SELECT_SCENE_KEY) {
      destroyCharacterSelectOverlay();
    }
    if (key !== GAME_OVER_SCENE_KEY) {
      destroyGameOverOverlay();
    }
    return originalStart(key, data);
  };
}

export function focusGameSurface(): void {
  const gameContainer = document.getElementById('game-container');
  gameContainer?.focus({ preventScroll: true });
}

function releaseStuckPointers(game: Phaser.Game): void {
  for (const scene of game.scene.scenes) {
    if (scene.scene.isActive()) {
      scene.input.resetPointers();
    }
  }
}

function stopScenesExcept(game: Phaser.Game, keepKey: string): void {
  for (const scene of game.scene.scenes) {
    if (scene.scene.key !== keepKey && scene.scene.isActive()) {
      scene.scene.stop();
    }
  }
}

function clearOverlaysForScene(key: string): void {
  if (key !== AUTH_SCENE_KEY) {
    destroyAuthFormOverlay();
  }
  if (key !== CHARACTER_SELECT_SCENE_KEY) {
    destroyCharacterSelectOverlay();
  }
  if (key !== GAME_OVER_SCENE_KEY) {
    destroyGameOverOverlay();
  }
}

/** Immediate scene handoff (used when deferred timers fail on mobile). */
export function launchSceneNow(
  game: Phaser.Game,
  key: string,
  data?: object,
): void {
  clearOverlaysForScene(key);
  focusGameSurface();
  if (isMobileTouchDevice()) {
    prepareMobileSceneHandoff(game);
  }
  releaseStuckPointers(game);
  stopScenesExcept(game, key);
  game.scene.start(key, data);
}

/**
 * Defer scene.start so Phaser finishes the pointer event before the
 * current scene shuts down. scene.time.delayedCall is cancelled on shutdown.
 */
export function startSceneNextTick(
  game: Phaser.Game,
  key: string,
  data?: object,
  delayMs = 0,
): void {
  clearOverlaysForScene(key);
  focusGameSurface();
  window.setTimeout(() => {
    if (isMobileTouchDevice()) {
      prepareMobileSceneHandoff(game);
    }
    releaseStuckPointers(game);
    stopScenesExcept(game, key);
    game.scene.start(key, data);
  }, delayMs);
}

export function returnToMainMenu(game: Phaser.Game): void {
  startSceneNextTick(game, MAIN_MENU_SCENE_KEY, {
    menuInputDelayMs: MAIN_MENU_INPUT_GUARD_MS,
  });
}
