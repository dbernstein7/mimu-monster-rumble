import type { CharacterId, EnemyType } from '../types/game';
import { isSoundManagerLocked, playSoundWhenReady } from '../utils/audioUnlock';

export type BossLoopSfxId = 'boss' | 'boss2';

const soundFxModules = import.meta.glob('../../Assets/SoundFX/*.{mp3,wav,ogg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const CHARACTER_IDS: CharacterId[] = ['voidWarrior', 'frostGuardian', 'chaosTrickster', 'fireStriker'];

function pickSoundFxUrl(pattern: RegExp): string | undefined {
  return Object.entries(soundFxModules).find(([path]) => pattern.test(path.replace(/\\/g, '/')))?.[1];
}

function pickCharacterWalkingUrl(characterId: CharacterId): string | undefined {
  const idPatterns = [
    new RegExp(`/Walking_${characterId}\\.mp3$`, 'i'),
    new RegExp(`/Walking-${characterId}\\.mp3$`, 'i'),
    new RegExp(`/${characterId}_Walking\\.mp3$`, 'i'),
    new RegExp(`/${characterId}Walking\\.mp3$`, 'i'),
  ];
  for (const pattern of idPatterns) {
    const url = pickSoundFxUrl(pattern);
    if (url) return url;
  }
  return pickSoundFxUrl(/\/Walking\.mp3$/i);
}

export const EXPLOSION_SFX_KEY = 'sfx_explosion';
export const EXPLOSION_SFX_VOLUME = 0.04;

export const HIT_SFX_KEY = 'sfx_hit';
export const HIT_SFX_VOLUME = 0.06;
const HIT_SFX_COOLDOWN_MS = 70;

export const PUMPKIN_BOUNCE_SFX_KEY = 'sfx_pumpkin_bounce';
export const PUMPKIN_BOUNCE_SFX_VOLUME = 0.2;
/** Play this many ms before the end of the pumpkin run loop (clamped to cycle length). */
export const PUMPKIN_BOUNCE_SYNC_LEAD_MS = 1000;
const PUMPKIN_BOUNCE_MIN_INTERVAL_MS = 120;
const MAX_BOUNCE_CONCURRENT = 1;
const MAX_HIT_CONCURRENT = 2;

export const WALKING_SFX_VOLUME = 0.05;

interface OneShotTrack {
  lastPlayAt: number;
  activeSounds: Phaser.Sound.BaseSound[];
}

const oneShotTracks = new WeakMap<Phaser.Scene, Map<string, OneShotTrack>>();

function getOneShotMap(scene: Phaser.Scene): Map<string, OneShotTrack> {
  let map = oneShotTracks.get(scene);
  if (!map) {
    map = new Map();
    oneShotTracks.set(scene, map);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearOneShotTracks(scene);
    });
  }
  return map;
}

function clearOneShotTracks(scene: Phaser.Scene): void {
  const map = oneShotTracks.get(scene);
  if (!map) return;
  for (const track of map.values()) {
    for (const sound of track.activeSounds) {
      if (sound.isPlaying || sound.isPaused) {
        sound.stop();
      }
      sound.destroy();
    }
    track.activeSounds.length = 0;
  }
  map.clear();
  oneShotTracks.delete(scene);
}

/** Capped one-shot playback — avoids Web Audio instance pile-up. */
function playManagedOneShot(
  scene: Phaser.Scene,
  key: string,
  volume: number,
  minIntervalMs: number,
  maxConcurrent: number,
): void {
  if (!scene.cache.audio.exists(key)) return;

  const map = getOneShotMap(scene);
  let track = map.get(key);
  if (!track) {
    track = { lastPlayAt: 0, activeSounds: [] };
    map.set(key, track);
  }

  const now = scene.time.now;
  if (now - track.lastPlayAt < minIntervalMs) return;

  track.activeSounds = track.activeSounds.filter((sound) => sound.isPlaying || sound.isPaused);
  if (track.activeSounds.length >= maxConcurrent) return;

  track.lastPlayAt = now;
  const sound = scene.sound.add(key, { volume });
  track.activeSounds.push(sound);
  sound.once('complete', () => {
    sound.destroy();
    const index = track.activeSounds.indexOf(sound);
    if (index >= 0) {
      track.activeSounds.splice(index, 1);
    }
  });
  if (!playSoundWhenReady(sound, scene.sound)) {
    if (isSoundManagerLocked(scene.sound)) return;
    const index = track.activeSounds.indexOf(sound);
    if (index >= 0) {
      track.activeSounds.splice(index, 1);
    }
  }
}
export const ENEMY_WALKING_SFX_KEY = 'sfx_walk_enemy';

export const BAT_FLAP_SFX_KEY = 'sfx_bat_flap';
export const BAT_FLAP_SFX_VOLUME = 0.15;
/** Playback speed for bat wing flaps (1 = normal). */
export const BAT_FLAP_SFX_RATE = 2.25;

export const GHOST_SFX_KEY = 'sfx_ghost';
export const GHOST_SFX_VOLUME = 0.12;

export const SLIME_MAN_SFX_KEY = 'sfx_slime_man';
export const SLIME_MAN_SFX_VOLUME = 0.12;

export const INTRO_SFX_KEY = 'sfx_intro';
export const INTRO_SFX_VOLUME = 0.45;
/** Silence after the intro clip finishes, before it plays again. */
export const INTRO_SFX_GAP_MS = 10000;

export const MENU_BACKGROUND_SFX_KEY = 'sfx_menu_background';
export const MENU_BACKGROUND_SFX_VOLUME = 0.28;

/** Enemies that play the bounce SFX synced to their run loop. */
export const ENEMY_BOUNCE_SFX_TYPES: EnemyType[] = ['pumpkinFiend', 'slime'];

export interface EnemyLoopSfxConfig {
  key: string;
  volume: number;
  /** Playback speed multiplier (1 = normal). */
  rate?: number;
  /** Only play while the enemy is moving. */
  requireMovement?: boolean;
  /** Only play while the enemy is visible (not phased). */
  requireVisible?: boolean;
}

/** Per-enemy looping ambient/movement SFX. */
const BAT_FLAP_LOOP_SFX: EnemyLoopSfxConfig = {
  key: BAT_FLAP_SFX_KEY,
  volume: BAT_FLAP_SFX_VOLUME,
  rate: BAT_FLAP_SFX_RATE,
  requireMovement: true,
};

export const ENEMY_LOOP_SFX: Partial<Record<EnemyType, EnemyLoopSfxConfig>> = {
  skeleton: { key: ENEMY_WALKING_SFX_KEY, volume: WALKING_SFX_VOLUME, requireMovement: true },
  bat: BAT_FLAP_LOOP_SFX,
  ghost: { key: GHOST_SFX_KEY, volume: GHOST_SFX_VOLUME },
  /** Flying Eye sprite — same wing flap as bats. */
  witch: BAT_FLAP_LOOP_SFX,
  /** Slime Man sprite. */
  zombie: { key: SLIME_MAN_SFX_KEY, volume: SLIME_MAN_SFX_VOLUME, requireMovement: true },
};

export const BOSS_LOOP_SFX: Partial<Record<BossLoopSfxId, EnemyLoopSfxConfig>> = {
  boss2: BAT_FLAP_LOOP_SFX,
};

export function getWalkingSfxKey(characterId: CharacterId): string {
  return `sfx_walk_${characterId}`;
}

/** How long the attack explosion loops (longer than on-screen VFX). */
export const PRIMARY_ABILITY_EXPLOSION_SFX_DURATION_MS = {
  voidWarrior: 900,
  frostGuardian: 800,
  chaosTrickster: 700,
  fireStriker: 1100,
} as const;

export const EXPLOSION_SFX_URL = pickSoundFxUrl(/\/Explosion\.mp3$/i);
export const HIT_SFX_URL = pickSoundFxUrl(/\/Hit\.mp3$/i);
export const PUMPKIN_BOUNCE_SFX_URL = pickSoundFxUrl(/Pumpkin Bounce\.mp3$/i);
export const ENEMY_WALKING_SFX_URL = pickSoundFxUrl(/\/Walking\.mp3$/i);
export const BAT_FLAP_SFX_URL = pickSoundFxUrl(/Bat Flap\.mp3$/i);
export const GHOST_SFX_URL = pickSoundFxUrl(/Ghost\.mp3$/i);
export const SLIME_MAN_SFX_URL = pickSoundFxUrl(/SlimeMan\.mp3$/i);
export const INTRO_SFX_URL = pickSoundFxUrl(/\/Intro\.mp3$/i);
export const MENU_BACKGROUND_SFX_URL = pickSoundFxUrl(/Background Sound\.mp3$/i);

export function loadSoundEffects(scene: Phaser.Scene): void {
  loadBootSoundEffects(scene);
  loadDeferredSoundEffects(scene);
}

function loadAudioIfMissing(scene: Phaser.Scene, key: string, url: string | undefined): void {
  if (url && !scene.cache.audio.exists(key)) {
    scene.load.audio(key, url);
  }
}

/** Combat + menu essentials for level 1 boot. */
export function loadBootSoundEffects(scene: Phaser.Scene): void {
  loadAudioIfMissing(scene, EXPLOSION_SFX_KEY, EXPLOSION_SFX_URL);
  loadAudioIfMissing(scene, HIT_SFX_KEY, HIT_SFX_URL);
  loadAudioIfMissing(scene, PUMPKIN_BOUNCE_SFX_KEY, PUMPKIN_BOUNCE_SFX_URL);
  loadAudioIfMissing(scene, BAT_FLAP_SFX_KEY, BAT_FLAP_SFX_URL);
  loadAudioIfMissing(scene, GHOST_SFX_KEY, GHOST_SFX_URL);
  loadAudioIfMissing(scene, INTRO_SFX_KEY, INTRO_SFX_URL);
  loadAudioIfMissing(scene, MENU_BACKGROUND_SFX_KEY, MENU_BACKGROUND_SFX_URL);
  for (const characterId of CHARACTER_IDS) {
    const url = pickCharacterWalkingUrl(characterId);
    const key = getWalkingSfxKey(characterId);
    loadAudioIfMissing(scene, key, url);
  }
}

/** Level 2 + boss audio — deferred after menu. */
export function loadDeferredSoundEffects(scene: Phaser.Scene): void {
  loadAudioIfMissing(scene, ENEMY_WALKING_SFX_KEY, ENEMY_WALKING_SFX_URL);
  loadAudioIfMissing(scene, SLIME_MAN_SFX_KEY, SLIME_MAN_SFX_URL);
}

export function hasWalkingSfx(scene: Phaser.Scene, characterId: CharacterId): boolean {
  return scene.cache.audio.exists(getWalkingSfxKey(characterId));
}

export function hasExplosionSfx(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(EXPLOSION_SFX_KEY);
}

export function hasHitSfx(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(HIT_SFX_KEY);
}

export function hasPumpkinBounceSfx(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(PUMPKIN_BOUNCE_SFX_KEY);
}

export function hasEnemyWalkingSfx(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(ENEMY_WALKING_SFX_KEY);
}

export function hasIntroSfx(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(INTRO_SFX_KEY);
}

export function hasMenuBackgroundSfx(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(MENU_BACKGROUND_SFX_KEY);
}

export function enemyUsesBounceSfx(type: EnemyType): boolean {
  return ENEMY_BOUNCE_SFX_TYPES.includes(type);
}

export function enemyUsesLoopSfx(type: EnemyType): boolean {
  return type in ENEMY_LOOP_SFX;
}

export function getEnemyLoopSfxConfig(type: EnemyType): EnemyLoopSfxConfig | undefined {
  return ENEMY_LOOP_SFX[type];
}

export function getLoopSfxConfig(id: string): EnemyLoopSfxConfig | undefined {
  return ENEMY_LOOP_SFX[id as EnemyType] ?? BOSS_LOOP_SFX[id as BossLoopSfxId];
}

export function usesLoopSfx(id: string): boolean {
  return getLoopSfxConfig(id) !== undefined;
}

interface SharedEnemyLoopEntry {
  sound: Phaser.Sound.BaseSound;
  holders: Set<object>;
}

type LivingEnemyLike = {
  active: boolean;
  isDead: boolean;
  enemyType: string;
  body?: Phaser.Physics.Arcade.Body | null;
  isPhased(): boolean;
};

function enemyNeedsLoopSfx(enemy: LivingEnemyLike, config: EnemyLoopSfxConfig): boolean {
  if (!enemy.active || enemy.isDead) return false;
  if (getLoopSfxConfig(enemy.enemyType)?.key !== config.key) return false;

  const body = enemy.body as Phaser.Physics.Arcade.Body | null;
  const speed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
  if (config.requireMovement && speed <= 8) return false;
  if (config.requireVisible && enemy.isPhased()) return false;
  return true;
}

function forceStopEnemyLoopKey(scene: Phaser.Scene, key: string): void {
  const map = sharedEnemyLoops.get(scene);
  const entry = map?.get(key);
  if (entry) {
    if (entry.sound.isPlaying || entry.sound.isPaused) {
      entry.sound.stop();
    }
    entry.sound.destroy();
    map!.delete(key);
  }
  if (scene.cache.audio.exists(key)) {
    scene.sound.stopByKey(key);
  }
}

const sharedEnemyLoops = new WeakMap<Phaser.Scene, Map<string, SharedEnemyLoopEntry>>();

function getSharedEnemyLoopMap(scene: Phaser.Scene): Map<string, SharedEnemyLoopEntry> {
  let map = sharedEnemyLoops.get(scene);
  if (!map) {
    map = new Map();
    sharedEnemyLoops.set(scene, map);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const entry of map!.values()) {
        if (entry.sound.isPlaying || entry.sound.isPaused) {
          entry.sound.stop();
        }
        entry.sound.destroy();
      }
      map!.clear();
      sharedEnemyLoops.delete(scene);
    });
  }
  return map;
}

export function isHoldingEnemyLoopSfx(scene: Phaser.Scene, key: string, holder: object): boolean {
  return sharedEnemyLoops.get(scene)?.get(key)?.holders.has(holder) ?? false;
}

/** One shared loop per SFX key; tracked by the enemies that requested it. */
export function acquireEnemyLoopSfx(
  scene: Phaser.Scene,
  key: string,
  holder: object,
  volume: number,
  rate = 1,
): void {
  if (!scene.cache.audio.exists(key)) return;

  const map = getSharedEnemyLoopMap(scene);
  const existing = map.get(key);
  if (existing) {
    if (existing.holders.has(holder)) return;
    existing.holders.add(holder);
    if (!existing.sound.isPlaying && !playSoundWhenReady(existing.sound, scene.sound)) {
      if (!isSoundManagerLocked(scene.sound)) {
        existing.holders.delete(holder);
      }
    }
    return;
  }

  const sound = scene.sound.add(key, { loop: true, volume, rate });
  if (!playSoundWhenReady(sound, scene.sound)) {
    if (isSoundManagerLocked(scene.sound)) {
      map.set(key, { sound, holders: new Set([holder]) });
    }
    return;
  }
  map.set(key, { sound, holders: new Set([holder]) });
}

export function releaseEnemyLoopSfx(scene: Phaser.Scene, key: string, holder: object): void {
  const map = sharedEnemyLoops.get(scene);
  if (!map) return;

  const entry = map.get(key);
  if (!entry || !entry.holders.delete(holder)) return;

  if (entry.holders.size === 0) {
    if (entry.sound.isPlaying || entry.sound.isPaused) {
      entry.sound.stop();
    }
    entry.sound.destroy();
    map.delete(key);
  }
}

/** Release every loop this enemy may hold — safe to call from destroy/death paths. */
export function releaseEnemyLoopSfxForHolder(scene: Phaser.Scene, holder: object): void {
  const map = sharedEnemyLoops.get(scene);
  if (!map) return;

  for (const [key, entry] of [...map.entries()]) {
    if (!entry.holders.has(holder)) continue;
    releaseEnemyLoopSfx(scene, key, holder);
  }
}

/** Stop orphaned movement loops/bounces when no living enemy still needs them. */
export function pruneEnemyMovementSfx(
  scene: Phaser.Scene,
  enemies: Phaser.GameObjects.Group,
): void {
  const living = enemies.getChildren().filter((child) => {
    const enemy = child as unknown as LivingEnemyLike;
    return enemy.active && !enemy.isDead;
  }) as unknown as LivingEnemyLike[];

  for (const config of Object.values(ENEMY_LOOP_SFX)) {
    if (!config) continue;
    const stillNeeded = living.some((enemy) => enemyNeedsLoopSfx(enemy, config));
    if (!stillNeeded) {
      forceStopEnemyLoopKey(scene, config.key);
    }
  }

  for (const config of Object.values(BOSS_LOOP_SFX)) {
    if (!config) continue;
    const stillNeeded = living.some((enemy) => enemyNeedsLoopSfx(enemy, config));
    if (!stillNeeded) {
      forceStopEnemyLoopKey(scene, config.key);
    }
  }

  const bounceStillNeeded = living.some((enemy) =>
    ENEMY_BOUNCE_SFX_TYPES.includes(enemy.enemyType as EnemyType),
  );
  if (!bounceStillNeeded) {
    stopPumpkinBounceSfx(scene);
  }
}

export function playPumpkinBounceSfx(scene: Phaser.Scene): void {
  if (!hasPumpkinBounceSfx(scene)) return;
  playManagedOneShot(
    scene,
    PUMPKIN_BOUNCE_SFX_KEY,
    PUMPKIN_BOUNCE_SFX_VOLUME,
    PUMPKIN_BOUNCE_MIN_INTERVAL_MS,
    MAX_BOUNCE_CONCURRENT,
  );
}

export function stopPumpkinBounceSfx(scene: Phaser.Scene): void {
  if (!hasPumpkinBounceSfx(scene)) return;
  scene.sound.stopByKey(PUMPKIN_BOUNCE_SFX_KEY);
  const map = oneShotTracks.get(scene);
  const track = map?.get(PUMPKIN_BOUNCE_SFX_KEY);
  if (track) {
    for (const sound of track.activeSounds) {
      if (sound.isPlaying || sound.isPaused) {
        sound.stop();
      }
      sound.destroy();
    }
    track.activeSounds.length = 0;
  }
}

export function stopEnemyWalkingSfx(scene: Phaser.Scene): void {
  if (!hasEnemyWalkingSfx(scene)) return;
  scene.sound.stopByKey(ENEMY_WALKING_SFX_KEY);
}

export function stopAllEnemyLoopSfx(scene: Phaser.Scene): void {
  const map = sharedEnemyLoops.get(scene);
  if (map) {
    for (const entry of map.values()) {
      if (entry.sound.isPlaying || entry.sound.isPaused) {
        entry.sound.stop();
      }
      entry.sound.destroy();
    }
    map.clear();
  }

  for (const config of Object.values(ENEMY_LOOP_SFX)) {
    if (config && scene.cache.audio.exists(config.key)) {
      scene.sound.stopByKey(config.key);
    }
  }
  for (const config of Object.values(BOSS_LOOP_SFX)) {
    if (config && scene.cache.audio.exists(config.key)) {
      scene.sound.stopByKey(config.key);
    }
  }
}

/** Pause or resume combat loops and active one-shots (e.g. game pause menu). */
export function setCombatSfxPaused(scene: Phaser.Scene, paused: boolean): void {
  const loopMap = sharedEnemyLoops.get(scene);
  if (loopMap) {
    for (const entry of loopMap.values()) {
      if (paused) {
        if (entry.sound.isPlaying) entry.sound.pause();
      } else if (entry.sound.isPaused) {
        entry.sound.resume();
      }
    }
  }

  const oneShots = oneShotTracks.get(scene);
  if (!oneShots) return;
  for (const track of oneShots.values()) {
    for (const sound of track.activeSounds) {
      if (paused) {
        if (sound.isPlaying) sound.pause();
      } else if (sound.isPaused) {
        sound.resume();
      }
    }
  }
}

/** Stop all gameplay SFX (loops, bounces, hits) — call on death, boss, shutdown. */
export function stopAllCombatSfx(scene: Phaser.Scene): void {
  stopPumpkinBounceSfx(scene);
  stopAllEnemyLoopSfx(scene);
  if (hasHitSfx(scene)) {
    scene.sound.stopByKey(HIT_SFX_KEY);
  }
  clearOneShotTracks(scene);
}

export function playIntroSfxOnce(
  scene: Phaser.Scene,
  onComplete?: () => void,
): Phaser.Sound.BaseSound | undefined {
  if (!hasIntroSfx(scene)) return;

  scene.sound.stopByKey(INTRO_SFX_KEY);
  const sound = scene.sound.add(INTRO_SFX_KEY, { volume: INTRO_SFX_VOLUME });
  if (onComplete) {
    sound.once('complete', onComplete);
  }
  if (!playSoundWhenReady(sound, scene.sound)) {
    if (isSoundManagerLocked(scene.sound)) return sound;
    return undefined;
  }
  return sound;
}

export function stopIntroSfx(scene: Phaser.Scene): void {
  if (!hasIntroSfx(scene)) return;
  scene.sound.stopByKey(INTRO_SFX_KEY);
}

export function startMenuBackgroundSfx(scene: Phaser.Scene): Phaser.Sound.BaseSound | undefined {
  if (!hasMenuBackgroundSfx(scene)) return;

  stopMenuBackgroundSfx(scene);
  const sound = scene.sound.add(MENU_BACKGROUND_SFX_KEY, {
    loop: true,
    volume: MENU_BACKGROUND_SFX_VOLUME,
  });
  if (!playSoundWhenReady(sound, scene.sound)) {
    if (isSoundManagerLocked(scene.sound)) return sound;
    return undefined;
  }
  return sound;
}

export function stopMenuBackgroundSfx(scene: Phaser.Scene): void {
  if (!hasMenuBackgroundSfx(scene)) return;
  scene.sound.stopByKey(MENU_BACKGROUND_SFX_KEY);
}

export function playProjectileHitSfx(scene: Phaser.Scene): void {
  if (!hasHitSfx(scene)) return;
  playManagedOneShot(scene, HIT_SFX_KEY, HIT_SFX_VOLUME, HIT_SFX_COOLDOWN_MS, MAX_HIT_CONCURRENT);
}
