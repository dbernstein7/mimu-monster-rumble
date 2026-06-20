import Phaser from 'phaser';

const unlockListeners = new Set<() => void>();

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
  if (sound.play()) return true;
  if (isSoundManagerLocked(manager)) return false;
  sound.destroy();
  return false;
}

function resumeAudioContext(manager: Phaser.Sound.BaseSoundManager): void {
  const ctx = (manager as Phaser.Sound.WebAudioSoundManager).context;
  if (ctx && (ctx.state === 'suspended' || ctx.state === 'interrupted')) {
    void ctx.resume();
  }
}

/** Resume Web Audio / HTML5 audio after the first explicit user interaction. */
export function bindGameAudioUnlock(game: Phaser.Game): void {
  const manager = game.sound;

  manager.on(Phaser.Sound.Events.UNLOCKED, () => {
    resumeAudioContext(manager);
    notifyUnlocked();
  });

  const nudge = (): void => {
    resumeAudioContext(manager);
  };

  game.events.on(Phaser.Input.Events.POINTER_DOWN, nudge);

  const onFirstInteraction = (): void => {
    nudge();
    manager.unlock();
  };

  document.body.addEventListener('touchstart', onFirstInteraction, { passive: true, capture: true });
  document.body.addEventListener('touchend', onFirstInteraction, { passive: true, capture: true });
  document.body.addEventListener('mousedown', onFirstInteraction, { capture: true });
}
