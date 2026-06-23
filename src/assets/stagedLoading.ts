import Phaser from 'phaser';
import type { LevelId } from '../types/game';
import type { EnemyType } from '../types/game';
import type { CharacterId } from '../types/game';
import { CHARACTER_SPRITES } from '../config/playerSprites';
import { loadAttackTextures, registerAttackAnimations } from './attackAssets';
import { loadCoinTextures } from './coinAssets';
import {
  configureCharacterSelectCardTextures,
  loadCharacterSelectCards,
} from './characterSelectAssets';
import { loadBoss2SlimeBallTextures } from './bossProjectileAssets';
import {
  loadBossMusic,
  loadDeferredLevelMusic,
  loadBootLevelMusic,
  warmUpBossMusic,
} from './musicAssets';
import { loadBootSoundEffects, loadDeferredSoundEffects } from './soundFxAssets';
import { configureUiTextures, loadCriticalUiTextures, loadDeferredUiTextures } from './uiAssets';
import { loadPowerUpTextures } from './powerUpAssets';
import { loadFloorTexturesForLevel, hasFloorTexture } from './floorTextures';
import { loadEnemySprites, registerEnemyAnimations } from '../systems/EnemyAnimation';
import { loadCharacterSprites, registerCharacterAnimations } from '../systems/PlayerAnimation';

const LEVEL_1_ENEMIES: EnemyType[] = ['pumpkinFiend', 'bat', 'ghost'];
const LEVEL_2_ENEMIES: EnemyType[] = ['skeleton', 'slime', 'zombie', 'witch'];

let deferredLoadPromise: Promise<void> | null = null;
let deferredAssetsReady = false;

export function areDeferredAssetsReady(): boolean {
  return deferredAssetsReady;
}

/** Menu + level 1 — keep first paint small on mobile. */
export function loadBootAssets(scene: Phaser.Scene): void {
  loadFloorTexturesForLevel(scene, 'hauntedCarnival');
  loadAttackTextures(scene);
  loadPowerUpTextures(scene);
  loadCoinTextures(scene);
  loadBootLevelMusic(scene);
  loadBootSoundEffects(scene);
  loadCriticalUiTextures(scene);

  (Object.keys(CHARACTER_SPRITES) as CharacterId[]).forEach((id) => {
    loadCharacterSprites(scene, id);
  });
  LEVEL_1_ENEMIES.forEach((type) => {
    loadEnemySprites(scene, type);
  });
}

export function registerBootAssets(scene: Phaser.Scene): void {
  (Object.keys(CHARACTER_SPRITES) as CharacterId[]).forEach((id) => {
    registerCharacterAnimations(scene, id);
  });
  LEVEL_1_ENEMIES.forEach((type) => {
    registerEnemyAnimations(scene, type);
  });
  registerAttackAnimations(scene);
  configureUiTextures(scene);
}

function registerDeferredAssets(scene: Phaser.Scene): void {
  LEVEL_2_ENEMIES.forEach((type) => {
    registerEnemyAnimations(scene, type);
  });
  registerEnemyAnimations(scene, 'boss');
  registerEnemyAnimations(scene, 'boss2');
  configureCharacterSelectCardTextures(scene);
  configureUiTextures(scene);
  warmUpBossMusic(scene);
}

function queueLoader(scene: Phaser.Scene, onComplete: () => void): void {
  if (!scene.load.list.size) {
    onComplete();
    return;
  }

  scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
  if (!scene.load.isLoading()) {
    scene.load.start();
  }
}

function loadDeferredPayload(scene: Phaser.Scene): void {
  loadCharacterSelectCards(scene);
  loadDeferredUiTextures(scene);
  loadFloorTexturesForLevel(scene, 'mutatedArena');
  loadDeferredLevelMusic(scene);
  loadDeferredSoundEffects(scene);
  loadBossMusic(scene);
  loadBoss2SlimeBallTextures(scene);
  LEVEL_2_ENEMIES.forEach((type) => {
    loadEnemySprites(scene, type);
  });
  loadEnemySprites(scene, 'boss');
  loadEnemySprites(scene, 'boss2');
}

/** Background load after main menu is visible. */
export function startDeferredAssetLoad(game: Phaser.Game): Promise<void> {
  if (deferredAssetsReady) {
    return Promise.resolve();
  }
  if (deferredLoadPromise) {
    return deferredLoadPromise;
  }

  deferredLoadPromise = new Promise((resolve) => {
    const host = game.scene.getScene('MainMenuScene') as Phaser.Scene | undefined;
    if (!host?.load) {
      deferredAssetsReady = true;
      resolve();
      return;
    }

    loadDeferredPayload(host);
    queueLoader(host, () => {
      registerDeferredAssets(host);
      deferredAssetsReady = true;
      resolve();
    });
  });

  return deferredLoadPromise;
}

/** Character select / level 2 need cards, bosses, and arena 2 art. */
export function ensureDeferredAssets(game: Phaser.Game): Promise<void> {
  if (deferredAssetsReady) {
    return Promise.resolve();
  }
  return startDeferredAssetLoad(game);
}

export function ensureLevelFloor(
  scene: Phaser.Scene,
  levelId: LevelId,
): Promise<void> {
  if (hasFloorTexture(scene, levelId, 'play') && hasFloorTexture(scene, levelId, 'exit')) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    loadFloorTexturesForLevel(scene, levelId);
    queueLoader(scene, resolve);
  });
}
