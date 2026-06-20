import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { MovementVector } from '../input/InputManager';
import type { CharacterId } from '../types/game';
import { getWalkingSfxKey, hasWalkingSfx, WALKING_SFX_VOLUME } from '../assets/soundFxAssets';

export class PlayerWalkingSfx {
  private scene: Phaser.Scene;
  private walkSound?: Phaser.Sound.BaseSound;
  private activeCharacterId?: CharacterId;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stop());
  }

  update(player: Player, movement: MovementVector, enabled: boolean): void {
    const moving =
      enabled &&
      !player.isDashing &&
      (movement.x !== 0 || movement.y !== 0);

    if (!moving) {
      this.stop();
      return;
    }

    const characterId = player.config.id;
    if (!hasWalkingSfx(this.scene, characterId)) {
      this.stop();
      return;
    }

    if (this.activeCharacterId !== characterId) {
      this.stop();
      this.activeCharacterId = characterId;
    }

    if (!this.walkSound) {
      this.walkSound = this.scene.sound.add(getWalkingSfxKey(characterId), {
        loop: true,
        volume: WALKING_SFX_VOLUME,
      });
    }

    if (!this.walkSound.isPlaying && !this.walkSound.play()) {
      this.stop();
    }
  }

  setPaused(paused: boolean): void {
    if (!this.walkSound?.isPlaying) return;
    if (paused) {
      this.walkSound.pause();
    } else {
      this.walkSound.resume();
    }
  }

  stop(): void {
    this.walkSound?.stop();
    this.walkSound?.destroy();
    this.walkSound = undefined;
    this.activeCharacterId = undefined;
  }
}
