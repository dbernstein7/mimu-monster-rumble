const powerUpModules = import.meta.glob('../../Assets/PowerUps/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const FILE_TO_TYPE: Record<string, string> = {
  Life: 'health',
  Speed: 'speed',
  Shield: 'shield',
  Damage: 'damage',
  Magnet: 'coinMagnet',
  Bomb: 'bomb',
};

export const PICKUP_DISPLAY_SCALE = 0.13;
export const PICKUP_HIT_RADIUS = 16;

function getTypeFromPath(path: string): string | undefined {
  const file = path.match(/([^/\\]+)\.png$/i)?.[1];
  return file ? FILE_TO_TYPE[file] : undefined;
}

export function loadPowerUpTextures(scene: Phaser.Scene): void {
  Object.entries(powerUpModules).forEach(([path, url]) => {
    const type = getTypeFromPath(path);
    if (type) {
      scene.load.image(`powerup_${type}`, url);
    }
  });
}

export function hasPowerUpTexture(scene: Phaser.Scene, type: string): boolean {
  return scene.textures.exists(`powerup_${type}`);
}
