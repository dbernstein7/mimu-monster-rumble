/** Vite-resolved ability VFX textures. */

function sortNumericFrameUrls(modules: Record<string, string>): string[] {
  return Object.entries(modules)
    .filter(([path]) => /\/\d+\.png$/i.test(path))
    .sort(([pathA], [pathB]) => {
      const numA = parseInt(pathA.match(/(\d+)\.png$/i)?.[1] ?? '0', 10);
      const numB = parseInt(pathB.match(/(\d+)\.png$/i)?.[1] ?? '0', 10);
      return numA - numB;
    })
    .map(([, url]) => url);
}

const voidSlamModules = import.meta.glob('../../Assets/MIMU ATTACKS/Void-Slam.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const frostWaveModules = import.meta.glob('../../Assets/MIMU ATTACKS/FrostWave.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const chaosBurstModules = import.meta.glob('../../Assets/MIMU ATTACKS/Chaos-Burst.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const chaosBombModules = import.meta.glob('../../Assets/MIMU ATTACKS/Chaos-Bomb.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const fireDashModules = import.meta.glob('../../Assets/MIMU ATTACKS/Fire Dash/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const iceBurstModules = import.meta.glob('../../Assets/MIMU ATTACKS/Ice Burst/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const voidOrbModules = import.meta.glob('../../Assets/MIMU ATTACKS/Void Orb/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const fireballModules = import.meta.glob('../../Assets/MIMU ATTACKS/Fireball.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const VOID_SLAM_TEXTURE_URL = Object.values(voidSlamModules)[0];
export const FROST_WAVE_TEXTURE_URL = Object.values(frostWaveModules)[0];
export const CHAOS_BURST_TEXTURE_URL = Object.values(chaosBurstModules)[0];
export const CHAOS_BOMB_TEXTURE_URL = Object.values(chaosBombModules)[0];
export const FIRE_DASH_FLAME_URLS = sortNumericFrameUrls(fireDashModules);
export const ICE_BURST_TEXTURE_URL =
  Object.entries(iceBurstModules).find(([path]) => /\/5\.png$/i.test(path))?.[1] ??
  sortNumericFrameUrls(iceBurstModules).at(-1);
export const FIRE_SLAM_TEXTURE_URL = Object.entries(fireDashModules).find(([path]) =>
  /FireSlam\.png$/i.test(path),
)?.[1];

export const VOID_SLAM_DISPLAY_DIAMETER = 250;
export const FROST_WAVE_DISPLAY_DIAMETER = 300;
export const CHAOS_BURST_DISPLAY_DIAMETER = 380;
export const CHAOS_BOMB_TEXTURE_KEY = 'player_proj_chaos_bomb';
export const CHAOS_BOMB_PROJ_WIDTH = 32;
export const CHAOS_BOMB_EXPLODE_RADIUS = 82;
export const FIRE_SLAM_DISPLAY_DIAMETER = 190;
export const FIRE_DASH_FLAME_ANIM = 'fireDash_flame';
export const FIRE_DASH_FLAME_SCALE = 0.58;
export const ICE_BURST_TEXTURE_KEY = 'player_proj_ice_burst';
/** On-screen width in px — player run frame is ~62px wide at 0.24 scale. */
export const ICE_BURST_PROJ_WIDTH = 36;
export const VOID_ORB_TEXTURE_URL = Object.values(voidOrbModules)[0];
export const VOID_ORB_TEXTURE_KEY = 'player_proj_void_orb';
export const VOID_ORB_PROJ_WIDTH = 24;
export const VOID_ORB_PROJ_MAX_WIDTH = 46;
export const VOID_ORB_SPIN_SPEED = 0.0045;
export const VOID_ORB_SPEED = 68;
export const VOID_ORB_FIELD_RADIUS = 60;
export const VOID_ORB_FIELD_RADIUS_START = 30;
export const VOID_ORB_DAMAGE_MULT = 0.2;
export const VOID_ORB_DOT_INTERVAL_MS = 750;
export const FIREBALL_TEXTURE_URL = Object.values(fireballModules)[0];
export const FIREBALL_TEXTURE_KEY = 'player_proj_fireball';
export const FIREBALL_PROJ_WIDTH = 18;
export const FIREBALL_PROJ_MAX_WIDTH = 34;
export const FIREBALL_SPIN_SPEED = 0.005;
export const FIREBALL_SPEED = 200;
export const FIREBALL_EXPLODE_RADIUS = 52;
export const FIREBALL_SLAM_VFX_DIAMETER = 78;
export const FIREBALL_DAMAGE_MULT = 1.15;

export function getAttackTextureKey(effectId: string): string {
  return `attack_${effectId}`;
}

export function getFireDashFlameFrameKey(index: number): string {
  return getAttackTextureKey(`fireDash_${index}`);
}

export function loadAttackTextures(scene: Phaser.Scene): void {
  if (VOID_SLAM_TEXTURE_URL) {
    scene.load.image(getAttackTextureKey('voidSlam'), VOID_SLAM_TEXTURE_URL);
  }
  if (FROST_WAVE_TEXTURE_URL) {
    scene.load.image(getAttackTextureKey('frostWave'), FROST_WAVE_TEXTURE_URL);
  }
  if (CHAOS_BURST_TEXTURE_URL) {
    scene.load.image(getAttackTextureKey('chaosBurst'), CHAOS_BURST_TEXTURE_URL);
  }
  if (CHAOS_BOMB_TEXTURE_URL) {
    scene.load.image(CHAOS_BOMB_TEXTURE_KEY, CHAOS_BOMB_TEXTURE_URL);
  }
  FIRE_DASH_FLAME_URLS.forEach((url, index) => {
    scene.load.image(getFireDashFlameFrameKey(index), url);
  });
  if (FIRE_SLAM_TEXTURE_URL) {
    scene.load.image(getAttackTextureKey('fireSlam'), FIRE_SLAM_TEXTURE_URL);
  }
  if (ICE_BURST_TEXTURE_URL) {
    scene.load.image(ICE_BURST_TEXTURE_KEY, ICE_BURST_TEXTURE_URL);
  }
  if (VOID_ORB_TEXTURE_URL) {
    scene.load.image(VOID_ORB_TEXTURE_KEY, VOID_ORB_TEXTURE_URL);
  }
  if (FIREBALL_TEXTURE_URL) {
    scene.load.image(FIREBALL_TEXTURE_KEY, FIREBALL_TEXTURE_URL);
  }
}

export function spawnFireSlamVfxAt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  displayDiameter = FIRE_SLAM_DISPLAY_DIAMETER,
): void {
  const effectId = 'fireSlam';
  if (hasAttackTexture(scene, effectId)) {
    const key = getAttackTextureKey(effectId);
    const vfx = scene.add.image(x, y, key);
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const baseScale = displayDiameter / src.width;

    vfx.setDepth(16);
    vfx.setOrigin(0.5, 0.5);
    vfx.setScale(baseScale * 0.15);
    vfx.setAlpha(0.95);
    vfx.setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: vfx,
      scale: baseScale * 1.05,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => vfx.destroy(),
    });
    return;
  }

  const outer = scene.add.circle(x, y, 78, 0xe74c3c, 0.5);
  outer.setScale(0.12);
  outer.setDepth(15);
  scene.tweens.add({
    targets: outer,
    scale: 1,
    alpha: 0,
    duration: 380,
    onComplete: () => outer.destroy(),
  });
}

export function spawnChaosBurstVfxAt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  displayDiameter = Math.max(CHAOS_BURST_DISPLAY_DIAMETER, radius * 2),
): void {
  const effectId = 'chaosBurst';
  if (hasAttackTexture(scene, effectId)) {
    const key = getAttackTextureKey(effectId);
    const vfx = scene.add.image(x, y, key);
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const targetDiameter = displayDiameter;
    const baseScale = targetDiameter / src.width;

    vfx.setDepth(16);
    vfx.setOrigin(0.5, 0.5);
    vfx.setScale(baseScale * 0.12);
    vfx.setAlpha(0.93);
    vfx.setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: vfx,
      scale: baseScale * 1.05,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => vfx.destroy(),
    });
    return;
  }

  const burst = scene.add.circle(x, y, 30, 0x2ecc71, 0.75);
  burst.setDepth(15);
  scene.tweens.add({
    targets: burst,
    scale: radius / 30,
    alpha: 0,
    duration: 480,
    onComplete: () => burst.destroy(),
  });
}

export function registerAttackAnimations(scene: Phaser.Scene): void {
  if (
    FIRE_DASH_FLAME_URLS.length > 0 &&
    scene.textures.exists(getFireDashFlameFrameKey(0)) &&
    !scene.anims.exists(FIRE_DASH_FLAME_ANIM)
  ) {
    scene.anims.create({
      key: FIRE_DASH_FLAME_ANIM,
      frames: FIRE_DASH_FLAME_URLS.map((_, index) => ({ key: getFireDashFlameFrameKey(index) })),
      frameRate: 14,
      repeat: -1,
    });
  }
}

export function hasAttackTexture(scene: Phaser.Scene, effectId: string): boolean {
  return scene.textures.exists(getAttackTextureKey(effectId));
}

export function hasFireDashFlames(scene: Phaser.Scene): boolean {
  return scene.textures.exists(getFireDashFlameFrameKey(0)) && scene.anims.exists(FIRE_DASH_FLAME_ANIM);
}

export function hasIceBurstProjectile(scene: Phaser.Scene): boolean {
  return scene.textures.exists(ICE_BURST_TEXTURE_KEY);
}

export function hasVoidOrbProjectile(scene: Phaser.Scene): boolean {
  return scene.textures.exists(VOID_ORB_TEXTURE_KEY);
}

export function hasFireballProjectile(scene: Phaser.Scene): boolean {
  return scene.textures.exists(FIREBALL_TEXTURE_KEY);
}

export function hasChaosBombProjectile(scene: Phaser.Scene): boolean {
  return scene.textures.exists(CHAOS_BOMB_TEXTURE_KEY);
}
