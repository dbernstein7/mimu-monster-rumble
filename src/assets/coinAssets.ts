import { COIN_VALUES } from '../config/coins';

const coinModules = import.meta.glob('../../Assets/Coins/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const COIN_DISPLAY_SCALE = 0.078;
export const COIN_HIT_RADIUS = 14;

export function getCoinTextureKey(value: number): string {
  return `coin_${value}`;
}

export function loadCoinTextures(scene: Phaser.Scene): void {
  Object.entries(coinModules).forEach(([path, url]) => {
    const value = path.match(/(\d+)\.png$/i)?.[1];
    if (value) {
      scene.load.image(getCoinTextureKey(Number(value)), url);
    }
  });
}

export function hasCoinTexture(scene: Phaser.Scene, value: number): boolean {
  return scene.textures.exists(getCoinTextureKey(value));
}

export function hasAnyCoinTexture(scene: Phaser.Scene): boolean {
  return COIN_VALUES.some((v) => hasCoinTexture(scene, v));
}
