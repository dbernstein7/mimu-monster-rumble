import Phaser from 'phaser';
import {
  getAttackTextureKey,
  getFireDashFlameFrameKey,
  hasAttackTexture,
} from '../assets/attackAssets';
import { getSecondaryProjectileConfig } from './secondaryProjectiles';
import type { CharacterId } from '../types/game';

const PRIMARY_EFFECT_IDS: Record<CharacterId, string> = {
  voidWarrior: 'voidSlam',
  frostGuardian: 'frostWave',
  chaosTrickster: 'chaosBurst',
  fireStriker: 'fireDash',
};

/** Matches primary-ability VFX tween lengths in `AbilitySystem`. */
export const PRIMARY_ABILITY_VFX_DURATION_MS: Record<CharacterId, number> = {
  voidWarrior: 420,
  frostGuardian: 560,
  chaosTrickster: 500,
  fireStriker: 700,
};

export function getPrimaryAbilityTextureKey(scene: Phaser.Scene, characterId: CharacterId): string | null {
  if (characterId === 'fireStriker') {
    const key = getFireDashFlameFrameKey(0);
    return scene.textures.exists(key) ? key : null;
  }
  const effectId = PRIMARY_EFFECT_IDS[characterId];
  return hasAttackTexture(scene, effectId) ? getAttackTextureKey(effectId) : null;
}

export function getSecondaryAbilityTextureKey(scene: Phaser.Scene, characterId: CharacterId): string | null {
  const { textureKey } = getSecondaryProjectileConfig(characterId);
  return scene.textures.exists(textureKey) ? textureKey : null;
}

export function applyAttackIconSizing(image: Phaser.GameObjects.Image, maxPx: number): void {
  const w = image.frame.width;
  const h = image.frame.height;
  const scale = maxPx / Math.max(w, h);
  image.setDisplaySize(w * scale, h * scale);
}

export function createAttackIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string,
  maxPx: number,
  depth = 2,
): Phaser.GameObjects.Image {
  const icon = scene.add.image(x, y, textureKey).setOrigin(0.5).setDepth(depth);
  applyAttackIconSizing(icon, maxPx);
  return icon;
}
