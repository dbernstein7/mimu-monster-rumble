import type { CharacterId } from '../types/game';
import {
  CHAOS_TRICKSTER_RUN_URLS,
  FIRE_STRIKER_RUN_URLS,
  FROST_GUARDIAN_RUN_URLS,
  VOID_WARRIOR_RUN_URLS,
} from '../assets/characterFrames';
import Phaser from 'phaser';

/** How the run cycle was drawn — controls flipX / flipY when turning. */
export type RunFacing = 'down' | 'right';

const BASE_CHARACTER_DISPLAY_SCALE = 0.24;
export const CHARACTER_DISPLAY_SCALE = BASE_CHARACTER_DISPLAY_SCALE;
export const CHARACTER_HIT_RADIUS = 22;

export interface CharacterSpriteConfig {
  /** Folder under public/assets/characters/ (when using public/) */
  folder: string;
  /** Horizontal strip: run.png with frameCount frames in one row */
  spritesheet?: string;
  /** Or separate files: run_0.png … run_7.png under public folder */
  frames?: string;
  /** Load numbered PNGs from project Assets/ (resolved by Vite at build time) */
  projectFrameUrls?: string[];
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  /** Which way the character faces in the raw run art */
  runFacing: RunFacing;
  /** true = run_0.png … run_7.png; false = one horizontal run.png strip */
  separateFrames?: boolean;
  /** Scale from frame pixels to on-screen size */
  displayScale: number;
  /** Collision circle radius in world pixels (before sprite scale is applied) */
  hitRadius?: number;
}

export const CHARACTER_SPRITES: Partial<Record<CharacterId, CharacterSpriteConfig>> = {
  voidWarrior: {
    folder: 'voidWarrior',
    projectFrameUrls: VOID_WARRIOR_RUN_URLS,
    frameWidth: 259,
    frameHeight: 314,
    frameCount: VOID_WARRIOR_RUN_URLS.length,
    frameRate: 10,
    runFacing: 'right',
    separateFrames: true,
    displayScale: CHARACTER_DISPLAY_SCALE,
    hitRadius: CHARACTER_HIT_RADIUS,
  },
  frostGuardian: {
    folder: 'frostGuardian',
    projectFrameUrls: FROST_GUARDIAN_RUN_URLS,
    frameWidth: 259,
    frameHeight: 314,
    frameCount: 8,
    frameRate: 10,
    runFacing: 'right',
    separateFrames: true,
    displayScale: CHARACTER_DISPLAY_SCALE,
    hitRadius: CHARACTER_HIT_RADIUS,
  },
  chaosTrickster: {
    folder: 'chaosTrickster',
    projectFrameUrls: CHAOS_TRICKSTER_RUN_URLS,
    frameWidth: 259,
    frameHeight: 314,
    frameCount: 8,
    frameRate: 10,
    runFacing: 'right',
    separateFrames: true,
    displayScale: CHARACTER_DISPLAY_SCALE,
    hitRadius: CHARACTER_HIT_RADIUS,
  },
  fireStriker: {
    folder: 'fireStriker',
    projectFrameUrls: FIRE_STRIKER_RUN_URLS,
    frameWidth: 259,
    frameHeight: 314,
    frameCount: 8,
    frameRate: 10,
    runFacing: 'right',
    separateFrames: true,
    displayScale: CHARACTER_DISPLAY_SCALE,
    hitRadius: CHARACTER_HIT_RADIUS,
  },
};

/** Scale a character preview to fit a UI box (uses raw frame dimensions). */
export function getCharacterSelectPreviewScale(
  id: CharacterId,
  scene: Phaser.Scene,
  maxWidth: number,
  maxHeight: number,
): number {
  const cfg = getCharacterSpriteConfig(id);
  if (!cfg || !hasCharacterSprite(id, scene)) {
    return Math.min(maxWidth, maxHeight) / 32;
  }
  const fit = Math.min(maxWidth / cfg.frameWidth, maxHeight / cfg.frameHeight);
  return fit * 0.92;
}

export function getCharacterSpriteConfig(id: CharacterId): CharacterSpriteConfig | undefined {
  return CHARACTER_SPRITES[id];
}

export function getRunAnimKey(id: CharacterId): string {
  return `${id}_run`;
}

export function getPlayerTextureKey(id: CharacterId, scene: Phaser.Scene): string {
  const sheetKey = `${id}_run_sheet`;
  if (scene.textures.exists(sheetKey)) return sheetKey;
  if (scene.textures.exists(`${id}_run_0`)) return `${id}_run_0`;
  return `player_${id}`;
}

export function hasCharacterSprite(id: CharacterId, scene: Phaser.Scene): boolean {
  return (
    scene.textures.exists(`${id}_run_sheet`) || scene.textures.exists(`${id}_run_0`)
  );
}
