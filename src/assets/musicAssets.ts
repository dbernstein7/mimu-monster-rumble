const musicModules = import.meta.glob('../../Assets/Music/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const levelMusicModules = import.meta.glob('../../Assets/SoundFX/Level*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function pickMusicUrl(pattern: RegExp): string | undefined {
  return Object.entries(musicModules).find(([path]) => pattern.test(path))?.[1];
}

function pickLevelMusicUrl(pattern: RegExp): string | undefined {
  return Object.entries(levelMusicModules).find(([path]) =>
    pattern.test(path.replace(/\\/g, '/')),
  )?.[1];
}

export const BOSS_MUSIC_KEY = 'boss_neon_raid';
export const BOSS_MUSIC_START_SEC = 53;
export const BOSS_MUSIC_INTRO_MS = 1500;
export const BOSS_MUSIC_VOLUME = 0.75;
export const BOSS_MUSIC_INTRO_VOLUME = 0.04;

export const BOSS_MUSIC_URL = pickMusicUrl(/Neon Raid\.mp3$/i);

export const LEVEL_1_MUSIC_KEY = 'level_1_music';
export const LEVEL_1_2_MUSIC_KEY = 'level_1_2_music';
export const LEVEL_2_MUSIC_KEY = 'level_2_music';
export const LEVEL_2_2_MUSIC_KEY = 'level_2_2_music';
/** Soft bed so combat SFX stay clear on top. */
export const LEVEL_1_MUSIC_VOLUME = 0.1;
export const LEVEL_2_MUSIC_VOLUME = LEVEL_1_MUSIC_VOLUME;
export const LEVEL_1_MUSIC_URL = pickLevelMusicUrl(/\/Level 1\.mp3$/i);
export const LEVEL_1_2_MUSIC_URL = pickLevelMusicUrl(/\/Level 1\.2\.mp3$/i);
export const LEVEL_2_MUSIC_URL = pickLevelMusicUrl(/\/Level 2\.mp3$/i);
export const LEVEL_2_2_MUSIC_URL = pickLevelMusicUrl(/\/Level 2\.2\.mp3$/i);

export function loadBossMusic(scene: Phaser.Scene): void {
  if (BOSS_MUSIC_URL) {
    scene.load.audio(BOSS_MUSIC_KEY, BOSS_MUSIC_URL);
  }
}

export function loadLevelMusic(scene: Phaser.Scene): void {
  if (LEVEL_1_MUSIC_URL) {
    scene.load.audio(LEVEL_1_MUSIC_KEY, LEVEL_1_MUSIC_URL);
  }
  if (LEVEL_1_2_MUSIC_URL) {
    scene.load.audio(LEVEL_1_2_MUSIC_KEY, LEVEL_1_2_MUSIC_URL);
  }
  if (LEVEL_2_MUSIC_URL) {
    scene.load.audio(LEVEL_2_MUSIC_KEY, LEVEL_2_MUSIC_URL);
  }
  if (LEVEL_2_2_MUSIC_URL) {
    scene.load.audio(LEVEL_2_2_MUSIC_KEY, LEVEL_2_2_MUSIC_URL);
  }
}

export function hasBossMusic(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(BOSS_MUSIC_KEY);
}

export function hasLevel1Music(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(LEVEL_1_MUSIC_KEY);
}

export function hasLevel1_2Music(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(LEVEL_1_2_MUSIC_KEY);
}

export function hasLevel2Music(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(LEVEL_2_MUSIC_KEY);
}

export function hasLevel2_2Music(scene: Phaser.Scene): boolean {
  return scene.cache.audio.exists(LEVEL_2_2_MUSIC_KEY);
}

export interface LevelMusicHandle {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
}

/** Alternates primary → alternate → primary → … during level gameplay. */
export class LevelMusicCycle implements LevelMusicHandle {
  private sound?: Phaser.Sound.BaseSound;
  private trackIndex = 0;
  private running = false;

  constructor(
    private scene: Phaser.Scene,
    private readonly primaryKey: string,
    private readonly alternateKey: string,
    private readonly volume: number,
  ) {}

  start(): void {
    if (!this.scene.cache.audio.exists(this.primaryKey)) return;

    this.stop();
    this.running = true;
    this.trackIndex = 0;
    this.playCurrentTrack();
  }

  stop(): void {
    this.running = false;
    if (this.sound) {
      this.sound.stop();
      this.sound.destroy();
      this.sound = undefined;
    }
    stopLevelMusicKeys(this.scene, this.primaryKey, this.alternateKey);
  }

  pause(): void {
    if (this.sound?.isPlaying || this.sound?.isPaused) {
      this.sound.pause();
    }
  }

  resume(): void {
    if (this.sound?.isPaused) {
      this.sound.resume();
    }
  }

  private playCurrentTrack(): void {
    if (!this.running) return;

    const key = this.trackIndex % 2 === 0 ? this.primaryKey : this.alternateKey;
    if (!this.scene.cache.audio.exists(key)) {
      if (key === this.alternateKey && this.scene.cache.audio.exists(this.primaryKey)) {
        this.trackIndex += 1;
        this.playCurrentTrack();
        return;
      }
      this.stop();
      return;
    }

    this.sound = this.scene.sound.add(key, {
      loop: false,
      volume: this.volume,
    });
    this.sound.once('complete', () => {
      if (!this.running) return;
      this.trackIndex += 1;
      this.sound = undefined;
      this.playCurrentTrack();
    });

    if (!this.sound.play()) {
      this.sound.destroy();
      this.sound = undefined;
    }
  }
}

function stopLevelMusicKeys(scene: Phaser.Scene, primaryKey: string, alternateKey: string): void {
  if (scene.cache.audio.exists(primaryKey)) {
    scene.sound.stopByKey(primaryKey);
  }
  if (scene.cache.audio.exists(alternateKey)) {
    scene.sound.stopByKey(alternateKey);
  }
}

export function stopLevel1Music(scene: Phaser.Scene): void {
  stopLevelMusicKeys(scene, LEVEL_1_MUSIC_KEY, LEVEL_1_2_MUSIC_KEY);
}

export function stopLevel2Music(scene: Phaser.Scene): void {
  stopLevelMusicKeys(scene, LEVEL_2_MUSIC_KEY, LEVEL_2_2_MUSIC_KEY);
}

/** Warm up boss track decode/seek so first play during combat does not hitch. */
export function warmUpBossMusic(scene: Phaser.Scene): void {
  if (!hasBossMusic(scene)) return;

  const sound = scene.sound.add(BOSS_MUSIC_KEY, {
    volume: 0,
    loop: false,
  }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

  sound.play({ seek: BOSS_MUSIC_START_SEC, volume: 0 });
  scene.time.delayedCall(32, () => {
    if (sound.isPlaying || sound.isPaused) {
      sound.stop();
    }
    sound.destroy();
  });
}
