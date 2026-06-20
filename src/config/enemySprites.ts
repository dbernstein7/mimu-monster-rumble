import Phaser from 'phaser';
import {
  BAT_RUN_URLS,
  BOSS1_RUN_URLS,
  BOSS2_RUN_URLS,
  FLYING_EYE_RUN_URLS,
  GHOST_RUN_URLS,
  PUMPKIN_HEAD_RUN_URLS,
  SKELETON_RUN_URLS,
  SLIME_MAN_RUN_URLS,
  SLIME_RUN_URLS,
} from '../assets/enemyFrames';
import type { EnemyType } from '../types/game';
import type { RunFacing } from './playerSprites';

export interface EnemySpriteConfig {
  projectFrameUrls: string[];
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  runFacing: RunFacing;
  displayScale: number;
  hitRadius: number;
}

export type EnemySpriteId = EnemyType | 'boss' | 'boss2';
export type BossEnemyId = 'boss' | 'boss2';

export const ENEMY_SPRITES: Partial<Record<EnemyType, EnemySpriteConfig>> = {
  pumpkinFiend: {
    projectFrameUrls: PUMPKIN_HEAD_RUN_URLS,
    frameWidth: 292,
    frameHeight: 384,
    frameCount: 7,
    frameRate: 10,
    runFacing: 'right',
    displayScale: 0.095,
    hitRadius: 18,
  },
  bat: {
    projectFrameUrls: BAT_RUN_URLS,
    frameWidth: 379,
    frameHeight: 268,
    frameCount: 8,
    frameRate: 12,
    runFacing: 'right',
    displayScale: 0.09,
    hitRadius: 12,
  },
  ghost: {
    projectFrameUrls: GHOST_RUN_URLS,
    frameWidth: 336,
    frameHeight: 270,
    frameCount: 6,
    frameRate: 10,
    runFacing: 'right',
    displayScale: 0.12,
    hitRadius: 16,
  },
  skeleton: {
    projectFrameUrls: SKELETON_RUN_URLS,
    frameWidth: 282,
    frameHeight: 319,
    frameCount: 6,
    frameRate: 12,
    runFacing: 'right',
    displayScale: 0.22,
    hitRadius: 32,
  },
  slime: {
    projectFrameUrls: SLIME_RUN_URLS,
    frameWidth: 266,
    frameHeight: 246,
    frameCount: 5,
    frameRate: 8,
    runFacing: 'right',
    displayScale: 0.165,
    hitRadius: 22,
  },
  zombie: {
    projectFrameUrls: SLIME_MAN_RUN_URLS,
    frameWidth: 203,
    frameHeight: 290,
    frameCount: 8,
    frameRate: 10,
    runFacing: 'right',
    displayScale: 0.3,
    hitRadius: 30,
  },
  witch: {
    projectFrameUrls: FLYING_EYE_RUN_URLS,
    frameWidth: 319,
    frameHeight: 337,
    frameCount: 8,
    frameRate: 12,
    runFacing: 'right',
    displayScale: 0.15,
    hitRadius: 24,
  },
};

export const BOSS_SPRITE: EnemySpriteConfig = {
  projectFrameUrls: BOSS1_RUN_URLS,
  frameWidth: 359,
  frameHeight: 268,
  frameCount: 8,
  frameRate: 10,
  runFacing: 'right',
  displayScale: 0.38,
  hitRadius: 76,
};

export const BOSS2_SPRITE: EnemySpriteConfig = {
  projectFrameUrls: BOSS2_RUN_URLS,
  frameWidth: 218,
  frameHeight: 215,
  frameCount: 6,
  frameRate: 10,
  runFacing: 'right',
  displayScale: 0.62,
  hitRadius: 76,
};

export function getEnemySpriteConfig(type: EnemySpriteId): EnemySpriteConfig | undefined {
  if (type === 'boss') return BOSS_SPRITE;
  if (type === 'boss2') return BOSS2_SPRITE;
  return ENEMY_SPRITES[type];
}

export function getEnemyRunAnimKey(type: EnemySpriteId): string {
  return `${type}_run`;
}

export function getEnemyTextureKey(type: EnemySpriteId, scene: Phaser.Scene): string {
  if (scene.textures.exists(`${type}_run_0`)) return `${type}_run_0`;
  if (type === 'boss' || type === 'boss2') return 'boss';
  return `enemy_${type}`;
}

export function hasEnemySprite(type: EnemySpriteId, scene: Phaser.Scene): boolean {
  return scene.textures.exists(`${type}_run_0`);
}
