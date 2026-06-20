import type { PowerUpConfig } from '../types/game';

export const POWERUPS: Record<string, PowerUpConfig> = {
  health: { type: 'health', name: 'Extra Life', color: 0xe74c3c },
  speed: { type: 'speed', name: 'Speed Boost', color: 0xf1c40f, durationMs: 8000 },
  shield: { type: 'shield', name: 'Shield', color: 0x3498db, durationMs: 12000 },
  damage: { type: 'damage', name: 'Power Surge', color: 0xe67e22, durationMs: 10000 },
  coinMagnet: { type: 'coinMagnet', name: 'Coin Magnet', color: 0xf39c12, durationMs: 12000 },
  bomb: { type: 'bomb', name: 'Bomb', color: 0x2c3e50 },
};

/** Chance a power-up spawns when a wave ends. */
export const POWERUP_DROP_CHANCE = 0.2;
/** Chance a power-up drops at an enemy death location. */
export const POWERUP_KILL_DROP_CHANCE = 0.08;
/** Bomb damages enemies within this radius (player is never hurt). */
export const BOMB_RADIUS = 200;
