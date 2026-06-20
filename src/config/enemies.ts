import type { EnemyConfig, EnemyType } from '../types/game';

export const ENEMIES: Record<EnemyType, EnemyConfig> = {
  pumpkinFiend: {
    type: 'pumpkinFiend',
    name: 'Pumpkin Head',
    color: 0xff8c00,
    hp: 22,
    speed: 80,
    damage: 1,
    score: 100,
    radius: 18,
  },
  skeleton: {
    type: 'skeleton',
    name: 'Skeleton',
    color: 0xecf0f1,
    hp: 50,
    speed: 120,
    damage: 1,
    score: 150,
    radius: 32,
  },
  ghost: {
    type: 'ghost',
    name: 'Ghost',
    color: 0xbdc3c7,
    hp: 18,
    speed: 90,
    damage: 1,
    score: 120,
    radius: 16,
    phase: true,
  },
  bat: {
    type: 'bat',
    name: 'Bat',
    color: 0x8e44ad,
    hp: 12,
    speed: 140,
    damage: 1,
    score: 80,
    radius: 12,
  },
  slime: {
    type: 'slime',
    name: 'Slime',
    color: 0x27ae60,
    hp: 75,
    speed: 70,
    damage: 1,
    score: 130,
    radius: 22,
  },
  witch: {
    type: 'witch',
    name: 'Witch',
    color: 0x9b59b6,
    hp: 45,
    speed: 85,
    damage: 1,
    score: 200,
    radius: 24,
    ranged: true,
  },
  zombie: {
    type: 'zombie',
    name: 'Zombie',
    color: 0x1e8449,
    hp: 95,
    speed: 65,
    damage: 1,
    score: 110,
    radius: 30,
  },
};

export const BOSS_CONFIG = {
  name: 'Rumble Beast',
  color: 0x6c3483,
  hp: 5,
  speed: 80,
  damage: 1,
  score: 5000,
  radius: 40,
};

/** Boss HP per level index — Haunted Carnival, then Mutated Arena. */
export const BOSS_HP_BY_LEVEL = [5, 7] as const;

export function getBossHp(levelIndex: number): number {
  const idx = Math.min(levelIndex, BOSS_HP_BY_LEVEL.length - 1);
  return BOSS_HP_BY_LEVEL[idx];
}

export const BOSS_PUMPKIN_PROJECTILE = {
  textureKey: 'pumpkinFiend_run_0',
  displayScale: 0.05,
  hitRadius: 12,
} as const;

export const BOSS_SLIME_BALL_PROJECTILE = {
  textureKey: 'boss2_slime_ball_0',
  displayScale: 0.8,
  hitRadius: 13,
  rotateToVelocity: true,
} as const;

export function getSlimeBallProjectileOptions(
  scene: Phaser.Scene,
): {
  textureKey: string;
  displayScale: number;
  hitRadius: number;
  rotateToVelocity: boolean;
} | undefined {
  if (!scene.textures.exists(BOSS_SLIME_BALL_PROJECTILE.textureKey)) return undefined;
  return { ...BOSS_SLIME_BALL_PROJECTILE };
}

export function getBossIdForLevel(levelIndex: number): 'boss' | 'boss2' {
  return levelIndex >= 1 ? 'boss2' : 'boss';
}
