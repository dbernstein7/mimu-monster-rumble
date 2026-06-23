/** Vite-resolved floor backgrounds — play variant during waves, exit variant after boss. */

import type { LevelId } from '../types/game';

const floorModules = import.meta.glob('../../Assets/Floor/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function pickFloorUrl(pattern: RegExp): string | undefined {
  return Object.entries(floorModules).find(([path]) => pattern.test(path))?.[1];
}

export type FloorVariant = 'play' | 'exit';

export const FLOOR_TEXTURE_URLS: Record<string, string | undefined> = {
  hauntedCarnival: pickFloorUrl(/Haunted Arena 1\.png$/i),
  hauntedCarnival_exit: pickFloorUrl(/Haunted Arena 2\.png$/i),
  mutatedArena: pickFloorUrl(/Mutated Arena 1\.png$/i),
  mutatedArena_exit: pickFloorUrl(/Mutated Arena 2\.png$/i),
};

export function getFloorTextureKey(levelId: LevelId | string, variant: FloorVariant = 'play'): string {
  return variant === 'exit' ? `floor_${levelId}_exit` : `floor_${levelId}`;
}

export function loadFloorTextures(scene: Phaser.Scene): void {
  (['hauntedCarnival', 'mutatedArena'] as LevelId[]).forEach((levelId) => {
    loadFloorTexturesForLevel(scene, levelId);
  });
}

export function loadFloorTexturesForLevel(scene: Phaser.Scene, levelId: LevelId): void {
  const playUrl = FLOOR_TEXTURE_URLS[levelId];
  const exitUrl = FLOOR_TEXTURE_URLS[`${levelId}_exit`];
  const playKey = getFloorTextureKey(levelId, 'play');
  const exitKey = getFloorTextureKey(levelId, 'exit');
  if (playUrl && !scene.textures.exists(playKey)) {
    scene.load.image(playKey, playUrl);
  }
  if (exitUrl && !scene.textures.exists(exitKey)) {
    scene.load.image(exitKey, exitUrl);
  }
}

export function hasFloorTexture(
  scene: Phaser.Scene,
  levelId: LevelId | string,
  variant: FloorVariant = 'play',
): boolean {
  const textureKey = getFloorTextureKey(levelId, variant);
  return scene.textures.exists(textureKey);
}
