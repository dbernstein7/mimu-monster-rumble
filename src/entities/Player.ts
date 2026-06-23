import Phaser from 'phaser';
import type { CharacterConfig } from '../types/game';
import type { MovementVector } from '../input/InputManager';
import { getCharacterSpriteConfig, getPlayerTextureKey, hasCharacterSprite } from '../config/playerSprites';
import { updatePlayerAnimation } from '../systems/PlayerAnimation';
import { attachGroundShadow, shadowFromFeet } from './GroundShadow';
import { attachPlayerSpotlight } from '../utils/playerSpotlight';
import { isMobileTouchDevice } from '../utils/device';
type Facing = 'down' | 'up' | 'left' | 'right';

export class Player extends Phaser.Physics.Arcade.Sprite {
  config: CharacterConfig;
  maxHp = 3;
  hp = 3;
  coins = 0;
  score = 0;
  hasShield = false;
  damageMultiplier = 1;
  speedMultiplier = 1;
  invulnerable = false;
  invulnerableUntil = 0;
  abilityReady = true;
  abilityCooldownUntil = 0;
  secondaryReady = true;
  secondaryCooldownUntil = 0;
  secondaryCooldownMs = 5000;
  coinMagnetActive = false;
  coinMagnetUntil = 0;
  auraRadius = 35;
  isDashing = false;
  lastFacing: Facing = 'down';
  /** World-space collision radius (matches physics body). */
  bodyRadius = 16;

  constructor(scene: Phaser.Scene, x: number, y: number, config: CharacterConfig) {
    const textureKey = getPlayerTextureKey(config.id, scene);
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.config = config;
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const spriteCfg = getCharacterSpriteConfig(config.id);
    if (spriteCfg && hasCharacterSprite(config.id, scene)) {
      this.setScale(spriteCfg.displayScale);
      this.setFrame(0);
      this.bodyRadius = spriteCfg.hitRadius ?? 24;
      // Body size is scaled with the sprite — divide so world radius stays correct.
      this.setCircle(this.bodyRadius / spriteCfg.displayScale);
    } else {
      this.setCircle(this.bodyRadius);
    }

    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).pushable = false;
    }

    attachGroundShadow(this, shadowFromFeet(this, this.bodyRadius * 1.35, 9));
    attachPlayerSpotlight(this, { depth: 9.5, radius: 108, alpha: 0.4 });
  }

  get moveSpeed(): number {
    return this.config.moveSpeed * this.speedMultiplier;
  }

  get damage(): number {
    return this.config.damage * this.damageMultiplier;
  }

  updateMovement(movement: MovementVector): void {
    if (this.isDashing) return;
    if (movement.x === 0 && movement.y === 0) {
      this.setVelocity(0, 0);
      this.updateVisuals(movement);
      return;
    }
    this.setVelocity(movement.x * this.moveSpeed, movement.y * this.moveSpeed);
    this.updateVisuals(movement);
  }

  updateVisuals(movement: MovementVector): void {
    this.lastFacing = updatePlayerAnimation(this, this.config.id, movement, this.lastFacing);
  }

  takeDamage(amount = 1): boolean {
    const now = this.scene.time.now;
    if (this.invulnerable || now < this.invulnerableUntil) return false;

    // Claim i-frames immediately so contact + projectiles in the same frame can't stack.
    this.invulnerableUntil = now + 1000;

    if (this.hasShield) {
      this.hasShield = false;
      this.clearTint();
      return false;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => this.clearTint());
    if (!isMobileTouchDevice()) {
      this.scene.cameras.main.shake(100, 0.005);
    }
    return this.hp <= 0;
  }

  heal(amount = 1): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addCoins(amount: number): void {
    this.coins += amount;
    this.score += amount * 10;
  }

  addScore(amount: number): void {
    this.score += amount;
  }

  canUseAbility(): boolean {
    return this.abilityReady && this.scene.time.now >= this.abilityCooldownUntil;
  }

  startAbilityCooldown(): void {
    this.abilityReady = false;
    this.abilityCooldownUntil = this.scene.time.now + this.config.cooldownMs;
    this.scene.time.delayedCall(this.config.cooldownMs, () => {
      this.abilityReady = true;
    });
  }

  getAbilityCooldownProgress(): number {
    if (this.abilityReady) return 1;
    const remaining = this.abilityCooldownUntil - this.scene.time.now;
    return 1 - remaining / this.config.cooldownMs;
  }

  canUseSecondaryProjectile(): boolean {
    return this.secondaryReady && this.scene.time.now >= this.secondaryCooldownUntil && !this.isDashing;
  }

  startSecondaryCooldown(cooldownMs: number): void {
    this.secondaryCooldownMs = cooldownMs;
    this.secondaryReady = false;
    this.secondaryCooldownUntil = this.scene.time.now + cooldownMs;
    this.scene.time.delayedCall(cooldownMs, () => {
      this.secondaryReady = true;
    });
  }

  getSecondaryCooldownProgress(): number {
    if (this.secondaryReady) return 1;
    if (this.secondaryCooldownMs <= 0) return 1;
    const remaining = this.secondaryCooldownUntil - this.scene.time.now;
    return Phaser.Math.Clamp(1 - remaining / this.secondaryCooldownMs, 0, 1);
  }

  applySpeedBoost(durationMs: number): void {
    this.speedMultiplier = 1.4;
    this.scene.time.delayedCall(durationMs, () => {
      this.speedMultiplier = 1;
    });
  }

  applyDamageBoost(durationMs: number): void {
    this.damageMultiplier = 2;
    this.scene.time.delayedCall(durationMs, () => {
      this.damageMultiplier = 1;
    });
  }

  applyCoinMagnet(durationMs: number): void {
    this.coinMagnetActive = true;
    this.coinMagnetUntil = this.scene.time.now + durationMs;
    this.scene.time.delayedCall(durationMs, () => {
      this.coinMagnetActive = false;
    });
  }

  applyInvulnerability(durationMs: number): void {
    this.invulnerable = true;
    this.setAlpha(0.6);
    this.scene.time.delayedCall(durationMs, () => {
      this.invulnerable = false;
      this.setAlpha(1);
    });
  }

  applyShield(durationMs: number): void {
    this.hasShield = true;
    this.setTint(0x5dade2);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.hasShield) {
        this.hasShield = false;
        this.clearTint();
      }
    });
  }
}
