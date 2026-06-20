export type CharacterId = 'voidWarrior' | 'frostGuardian' | 'chaosTrickster' | 'fireStriker';

export type EnemyType =
  | 'pumpkinFiend'
  | 'skeleton'
  | 'ghost'
  | 'bat'
  | 'slime'
  | 'witch'
  | 'zombie';

export type PowerUpType = 'health' | 'speed' | 'shield' | 'damage' | 'coinMagnet' | 'bomb';

export type LevelId = 'hauntedCarnival' | 'mutatedArena';

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  color: number;
  moveSpeed: number;
  damage: number;
  abilityName: string;
  cooldownMs: number;
}

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  color: number;
  hp: number;
  speed: number;
  damage: number;
  score: number;
  radius: number;
  ranged?: boolean;
  phase?: boolean;
}

export interface WaveConfig {
  enemies: { type: EnemyType; count: number }[];
  durationSec: number;
}

export interface LevelConfig {
  id: LevelId;
  name: string;
  floorColor: number;
  accentColor: number;
  enemyPool: EnemyType[];
  waves: WaveConfig[];
  /** Multiplier applied to wave enemy sprite scale (boss excluded). */
  enemyScale?: number;
}

export interface PowerUpConfig {
  type: PowerUpType;
  name: string;
  color: number;
  durationMs?: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  character: string;
  level: string;
  timestamp: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  totalCoins: number;
  updatedAt: number;
}

export interface CoinLeaderboardEntry {
  userId: string;
  username: string;
  totalCoins: number;
  updatedAt: number;
}

export interface GameSessionData {
  characterId: CharacterId;
  levelIndex: number;
  score: number;
  coins: number;
}
