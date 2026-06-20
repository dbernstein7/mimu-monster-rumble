import Phaser from 'phaser';
import { isMobileTouchDevice } from './device';

const unlockListeners = new Set<() => void>();
let mobileAudioReady = false;

export function onGameAudioUnlocked(callback: () => void, scene?: Phaser.Scene): () => void {
  unlockListeners.add(callback);
  const off = () => unlockListeners.delete(callback);
  scene?.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  return off;
}

function notifyUnlocked(): void {
  unlockListeners.forEach((callback) => callback());
}

export function isSoundManagerLocked(manager: Phaser.Sound.BaseSoundManager): boolean {
  return manager.locked === true;
}

/**
 * Start playback without tearing down sounds that Phaser queued while the manager was locked.
 * Returns false when playback did not start and the caller should retry later.
 */
export function playSoundWhenReady(
  sound: Phaser.Sound.BaseSound,
  manager: Phaser.Sound.BaseSoundManager,
): boolean {
  if (isMobileTouchDevice()) {
    unlockMobileAudio(manager.game);
  }

  if (sound.play()) return true;
  if (isSoundManagerLocked(manager)) return false;
  sound.destroy();
  return false;
}

function getWebAudioContext(manager: Phaser.Sound.BaseSoundManager): AudioContext | undefined {
  return (manager as Phaser.Sound.WebAudioSoundManager).context;
}

function playSilentKick(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore — best-effort iOS unlock kick.
  }
}

/**
 * Resume mobile Web Audio inside the current user gesture and re-trigger pending playback.
 * No-op on desktop.
 */
export function unlockMobileAudio(game: Phaser.Game): void {
  if (!isMobileTouchDevice()) return;

  const manager = game.sound;
  const ctx = getWebAudioContext(manager);

  const kickPlayback = (): void => {
    notifyUnlocked();
  };

  if (ctx) {
    playSilentKick(ctx);
    try {
      void ctx.resume();
    } catch {
      // Ignore — resume may throw if already running.
    }

    if (ctx.state === 'running') {
      mobileAudioReady = true;
    }

    // iOS needs follow-up playback kicked off while the gesture is still active.
    kickPlayback();

    void ctx.resume().then(() => {
      mobileAudioReady = true;
      kickPlayback();
    }).catch(() => {});
    return;
  }

  manager.unlock();
  if (!manager.locked) {
    mobileAudioReady = true;
  }
  kickPlayback();
}

/** Resume Web Audio after the first explicit user interaction (mobile only). */
export function bindGameAudioUnlock(game: Phaser.Game): void {
  if (!isMobileTouchDevice()) return;

  const manager = game.sound;

  manager.on(Phaser.Sound.Events.UNLOCKED, () => {
    mobileAudioReady = true;
    notifyUnlocked();
  });

  const onGesture = (): void => {
    unlockMobileAudio(game);
  };

  document.body.addEventListener('touchstart', onGesture, { passive: true, capture: true });
  document.body.addEventListener('touchend', onGesture, { passive: true, capture: true });
}

export function isMobileAudioReady(): boolean {
  return mobileAudioReady;
}
