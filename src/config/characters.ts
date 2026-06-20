import type { CharacterConfig } from '../types/game';

export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'voidWarrior',
    name: 'Void Warrior',
    color: 0x7b4bb8,
    moveSpeed: 260,
    damage: 15,
    abilityName: 'Void Slam',
    cooldownMs: 8000,
  },
  {
    id: 'frostGuardian',
    name: 'Frost Guardian',
    color: 0x3498db,
    moveSpeed: 240,
    damage: 12,
    abilityName: 'Frost Wave',
    cooldownMs: 6000,
  },
  {
    id: 'chaosTrickster',
    name: 'Chaos Trickster',
    color: 0x2ecc71,
    moveSpeed: 280,
    damage: 10,
    abilityName: 'Chaos Burst',
    cooldownMs: 5000,
  },
  {
    id: 'fireStriker',
    name: 'Fire Striker',
    color: 0xe74c3c,
    moveSpeed: 270,
    damage: 14,
    abilityName: 'Fire Dash',
    cooldownMs: 3500,
  },
];

export function getCharacter(id: string): CharacterConfig {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
