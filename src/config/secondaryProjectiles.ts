import { CHAOS_BOMB_TEXTURE_KEY, FIREBALL_TEXTURE_KEY, ICE_BURST_TEXTURE_KEY, VOID_ORB_TEXTURE_KEY } from '../assets/attackAssets';
import type { CharacterId } from '../types/game';
import { getCharacter } from './characters';

export interface SecondaryProjectileConfig {
  name: string;
  cooldownMs: number;
  lifetimeMs: number;
  color: number;
  textureKey: string;
  bodyRadius: number;
}

export const SECONDARY_PROJECTILES: Record<CharacterId, SecondaryProjectileConfig> = {
  voidWarrior: {
    name: 'Void Orb',
    cooldownMs: getCharacter('voidWarrior').cooldownMs,
    lifetimeMs: 2600,
    color: 0x9b59b6,
    textureKey: VOID_ORB_TEXTURE_KEY,
    bodyRadius: 9,
  },
  frostGuardian: {
    name: 'Ice Burst',
    cooldownMs: 5000,
    lifetimeMs: 2500,
    color: 0x85c1e9,
    textureKey: ICE_BURST_TEXTURE_KEY,
    bodyRadius: 8,
  },
  chaosTrickster: {
    name: 'Chaos Bomb',
    cooldownMs: 5000,
    lifetimeMs: 3000,
    color: 0x2ecc71,
    textureKey: CHAOS_BOMB_TEXTURE_KEY,
    bodyRadius: 16,
  },
  fireStriker: {
    name: 'Fireball',
    cooldownMs: 5000,
    lifetimeMs: 2800,
    color: 0xe74c3c,
    textureKey: FIREBALL_TEXTURE_KEY,
    bodyRadius: 7,
  },
};

export function getSecondaryProjectileConfig(id: CharacterId): SecondaryProjectileConfig {
  return SECONDARY_PROJECTILES[id];
}
