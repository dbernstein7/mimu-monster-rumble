import Phaser from 'phaser';
import { ENEMIES, BOSS_CONFIG } from '../config/enemies';
import {
  getEnemySpriteConfig,
  getEnemyTextureKey,
  getEnemyRunAnimKey,
  hasEnemySprite,
} from '../config/enemySprites';
import type { BossEnemyId } from '../config/enemySprites';
import type { EnemyType } from '../types/game';
import type { Player } from './Player';
import { updateEnemyAnimation } from '../systems/EnemyAnimation';
import {
  COIN_DISPLAY_SCALE,
  COIN_HIT_RADIUS,
  getCoinTextureKey,
  hasAnyCoinTexture,
  hasCoinTexture,
} from '../assets/coinAssets';
import { hasPowerUpTexture, PICKUP_DISPLAY_SCALE, PICKUP_HIT_RADIUS } from '../assets/powerUpAssets';
import { drawProgressBar } from '../ui/theme';
import { attachGroundShadow, shadowFromFeet } from './GroundShadow';
import {
  enemyUsesBounceSfx,
  acquireEnemyLoopSfx,
  isHoldingEnemyLoopSfx,
  releaseEnemyLoopSfx,
  releaseEnemyLoopSfxForHolder,
  getLoopSfxConfig,
  hasPumpkinBounceSfx,
  playPumpkinBounceSfx,
  PUMPKIN_BOUNCE_SYNC_LEAD_MS,
  usesLoopSfx,
} from '../assets/soundFxAssets';
import { isMobileTouchDevice } from '../utils/device';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  enemyType: EnemyType | BossEnemyId;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  scoreValue: number;
  isBoss = false;
  slowUntil = 0;
  slowMultiplier = 1;
  confusedUntil = 0;
  confusedHitTimer = 0;
  confusedOrbitBase = 0;
  phaseTimer = 0;
  shootTimer = 0;
  attackTimer = 0;
  bossPhase = 0;
  bossHitCooldownUntil = 0;
  isDead = false;
  lastFacing: 'down' | 'up' | 'left' | 'right' = 'down';
  private hpBar: Phaser.GameObjects.Graphics;
  private bounceAnimProgress = 0;
  private lastBounceAt = 0;
  private movementSfxHalted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType | BossEnemyId,
  ) {
    const isBossType = type === 'boss' || type === 'boss2';
    const cfg = isBossType ? BOSS_CONFIG : ENEMIES[type];
    const textureKey = getEnemyTextureKey(type, scene);
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.enemyType = type;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.speed = cfg.speed;
    this.contactDamage = cfg.damage;
    this.scoreValue = cfg.score;
    this.isBoss = isBossType;
    this.setCollideWorldBounds(true);
    this.setDepth(5);

    const spriteCfg = getEnemySpriteConfig(type);
    if (spriteCfg && hasEnemySprite(type, scene)) {
      this.setScale(spriteCfg.displayScale);
      this.setFrame(0);
      this.setCircle(spriteCfg.hitRadius / spriteCfg.displayScale);
    } else {
      this.setCircle(cfg.radius);
      if (this.isBoss) this.setScale(1.5);
    }

    this.hpBar = scene.add.graphics().setDepth(6);
    this.updateHealthBar();

    const shadowRadius = this.getHurtRadius() * (this.isBoss ? 1.28 : 1.2);
    attachGroundShadow(this, shadowFromFeet(this, shadowRadius, this.depth - 1));
  }

  private getRunCycleMs(): number {
    const cfg = getEnemySpriteConfig(this.enemyType);
    if (!cfg) return 700;
    return (cfg.frameCount / cfg.frameRate) * 1000;
  }

  private syncMovementSfx(speed: number): void {
    if (isMobileTouchDevice()) return;
    this.syncBounceSfx();
    this.syncLoopSfx(speed);
  }

  private syncBounceSfx(): void {
    const gameScene = this.scene as Phaser.Scene & { bossActive?: boolean; gameEnding?: boolean };
    const type = this.enemyType as EnemyType;
    if (
      gameScene.bossActive ||
      gameScene.gameEnding ||
      !enemyUsesBounceSfx(type) ||
      this.isDead ||
      !this.active ||
      this.isPhased()
    ) {
      this.bounceAnimProgress = 0;
      return;
    }

    const runAnimKey = getEnemyRunAnimKey(type);
    if (!this.anims.isPlaying || this.anims.currentAnim?.key !== runAnimKey) {
      this.bounceAnimProgress = 0;
      return;
    }

    const progress = this.anims.getProgress();
    const cycleMs = this.getRunCycleMs();
    const effectiveLeadMs = Math.min(PUMPKIN_BOUNCE_SYNC_LEAD_MS, Math.max(cycleMs - 16, 0));
    const triggerProgress = 1 - effectiveLeadMs / cycleMs;

    if (progress >= triggerProgress && this.bounceAnimProgress < triggerProgress) {
      this.playBounceSfx();
    }
    this.bounceAnimProgress = progress;
  }

  private playBounceSfx(): void {
    if (!hasPumpkinBounceSfx(this.scene)) return;

    const now = this.scene.time.now;
    const cycleMs = this.getRunCycleMs();
    if (now - this.lastBounceAt < cycleMs * 0.5) return;
    this.lastBounceAt = now;

    playPumpkinBounceSfx(this.scene);
  }

  private haltBounceSfx(): void {
    this.bounceAnimProgress = 0;
  }

  private syncLoopSfx(speed: number): void {
    const gameScene = this.scene as Phaser.Scene & { bossActive?: boolean; gameEnding?: boolean };
    const config = getLoopSfxConfig(String(this.enemyType));

    let shouldPlay =
      !!config &&
      (!gameScene.bossActive || this.isBoss) &&
      !gameScene.gameEnding &&
      !this.isDead &&
      this.active;

    if (shouldPlay && config!.requireMovement && speed <= 8) {
      shouldPlay = false;
    }

    if (shouldPlay && config!.requireVisible && this.isPhased()) {
      shouldPlay = false;
    }

    if (shouldPlay && !this.scene.cache.audio.exists(config!.key)) {
      shouldPlay = false;
    }

    if (shouldPlay) {
      if (!isHoldingEnemyLoopSfx(this.scene, config!.key, this)) {
        acquireEnemyLoopSfx(
          this.scene,
          config!.key,
          this,
          config!.volume,
          config!.rate ?? 1,
        );
      }
      return;
    }

    if (config) {
      this.stopLoopSfx(config.key);
    }
  }

  private stopLoopSfx(key?: string): void {
    if (key) {
      if (isHoldingEnemyLoopSfx(this.scene, key, this)) {
        releaseEnemyLoopSfx(this.scene, key, this);
      }
      return;
    }

    releaseEnemyLoopSfxForHolder(this.scene, this);
  }

  private haltMovementSfx(): void {
    if (this.movementSfxHalted) return;
    this.movementSfxHalted = true;

    if (enemyUsesBounceSfx(this.enemyType as EnemyType)) {
      this.haltBounceSfx();
    }
    if (usesLoopSfx(String(this.enemyType))) {
      this.stopLoopSfx();
    }
  }

  getHurtRadius(): number {
    const spriteCfg = getEnemySpriteConfig(this.enemyType);
    if (spriteCfg) {
      return spriteCfg.hitRadius * (this.scaleX / spriteCfg.displayScale);
    }
    const cfg = this.isBoss ? BOSS_CONFIG : ENEMIES[this.enemyType as EnemyType];
    return cfg.radius * this.scaleX;
  }

  isPhased(): boolean {
    if (this.enemyType === 'boss') return false;
    const cfg = ENEMIES[this.enemyType as EnemyType];
    if (!cfg?.phase) return false;
    return Math.floor(this.phaseTimer / 2000) % 2 === 1;
  }

  updateHealthBar(): void {
    if (!this.active || this.isDead) {
      this.hpBar.setVisible(false);
      return;
    }

    const radius = this.getHurtRadius();
    const barW = this.isBoss ? 80 : Math.max(32, radius * 2.4);
    const barH = this.isBoss ? 8 : 5;
    const x = this.x - barW / 2;
    const y = this.y - radius - barH - 6;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const fillColor = this.isBoss ? 0xff4757 : 0xe74c3c;

    this.hpBar.clear();
    drawProgressBar(this.hpBar, x, y, barW, barH, ratio, fillColor);
    this.hpBar.setVisible(true);
  }

  destroy(fromScene?: boolean): void {
    releaseEnemyLoopSfxForHolder(this.scene, this);
    if (
      enemyUsesBounceSfx(this.enemyType as EnemyType) ||
      usesLoopSfx(String(this.enemyType))
    ) {
      this.haltMovementSfx();
    }
    this.hpBar.destroy();
    super.destroy(fromScene);
  }

  applySlow(durationMs: number, multiplier = 0.5): void {
    this.slowUntil = this.scene.time.now + durationMs;
    this.slowMultiplier = multiplier;
  }

  applyConfusion(durationMs: number): void {
    const until = this.scene.time.now + durationMs;
    this.confusedUntil = Math.max(this.confusedUntil, until);
    this.confusedOrbitBase = this.scene.time.now;
  }

  isConfused(): boolean {
    return !this.isBoss && this.scene.time.now < this.confusedUntil;
  }

  tickConfusedCombat(delta: number): void {
    if (this.confusedHitTimer > 0) {
      this.confusedHitTimer -= delta;
    }
  }

  canConfusedHit(): boolean {
    return this.confusedHitTimer <= 0;
  }

  markConfusedHit(): void {
    this.confusedHitTimer = 450;
  }

  takeDamage(amount: number): boolean {
    if (this.isDead || !this.active || this.isPhased()) return false;

    if (this.isBoss) {
      // Ignore melee chip; each qualifying hit counts as 1 boss HP.
      if (amount < 10) return false;
      const now = this.scene.time.now;
      if (now < this.bossHitCooldownUntil) return false;
      this.bossHitCooldownUntil = now + 400;
      amount = 1;
    }

    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) {
      this.isDead = true;
      if (
        enemyUsesBounceSfx(this.enemyType as EnemyType) ||
        usesLoopSfx(String(this.enemyType))
      ) {
        this.haltMovementSfx();
      }
      this.updateHealthBar();
      return true;
    }
    this.updateHealthBar();
    return false;
  }

  updateAI(
    player: Player,
    _obstacles: Phaser.GameObjects.Group,
    enemies?: Phaser.GameObjects.Group,
    deltaMs = 16.67,
  ): void {
    this.updateHealthBar();
    const now = this.scene.time.now;
    if (now < this.slowUntil) {
      // keep slow
    } else {
      this.slowMultiplier = 1;
    }

    if (this.isConfused() && enemies) {
      this.setTint(0x9b59b6);
      this.setAlpha(1);
      if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = false;
      }
      this.updateConfusedAI(enemies, now, deltaMs);
      const body = this.body as Phaser.Physics.Arcade.Body;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      this.syncMovementSfx(speed);
      return;
    }

    if (this.confusedUntil > 0 && now >= this.confusedUntil) {
      this.confusedUntil = 0;
      this.clearTint();
    }

    const cfg = this.isBoss ? null : ENEMIES[this.enemyType as EnemyType];

    if (cfg?.phase) {
      this.phaseTimer += deltaMs;
      if (Math.floor(this.phaseTimer / 2000) % 2 === 1) {
        this.setAlpha(0.3);
        this.body!.checkCollision.none = true;
      } else {
        this.setAlpha(1);
        this.body!.checkCollision.none = false;
      }
    }

    if (this.isBoss) {
      this.updateBossAI(player, deltaMs);
      return;
    }

    if (cfg?.ranged) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist > 200) {
        this.scene.physics.moveToObject(this, player, this.speed * this.slowMultiplier);
      } else if (dist < 120) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      } else {
        this.setVelocity(0, 0);
      }
      this.shootTimer += deltaMs;
      if (this.shootTimer > 2000) {
        this.shootTimer = 0;
        const gameScene = this.scene as Phaser.Scene & { spawnProjectile?: (x: number, y: number, tx: number, ty: number) => void };
        gameScene.spawnProjectile?.(this.x, this.y, player.x, player.y);
      }
    } else {
      this.scene.physics.moveToObject(this, player, this.speed * this.slowMultiplier);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const movement =
      speed > 8
        ? { x: body.velocity.x / speed, y: body.velocity.y / speed }
        : { x: 0, y: 0 };
    this.lastFacing = updateEnemyAnimation(this, this.enemyType, movement, this.lastFacing, deltaMs);
    this.syncMovementSfx(speed);
  }

  private updateConfusedAI(enemies: Phaser.GameObjects.Group, now: number, deltaMs: number): void {
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const e of enemies.getChildren()) {
      const other = e as Enemy;
      if (other === this || !other.active || other.isDead) continue;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }

    if (nearest) {
      this.scene.physics.moveToObject(this, nearest, this.speed * this.slowMultiplier * 1.15);
    } else {
      this.updateConfusedSpin(now);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const movement =
      speed > 8
        ? { x: body.velocity.x / speed, y: body.velocity.y / speed }
        : { x: 0, y: 0 };
    this.lastFacing = updateEnemyAnimation(this, this.enemyType, movement, this.lastFacing, deltaMs);
  }

  private updateConfusedSpin(now: number): void {
    const elapsed = (now - this.confusedOrbitBase) / 1000;
    const angle = elapsed * 4.5;
    const spinSpeed = this.speed * this.slowMultiplier * 0.9;
    this.setVelocity(Math.cos(angle) * spinSpeed, Math.sin(angle) * spinSpeed);
  }

  private updateBossAI(player: Player, deltaMs: number): void {
    this.attackTimer += deltaMs;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.attackTimer > 3000) {
      this.attackTimer = 0;
      this.bossPhase = (this.bossPhase + 1) % 2;
      const gameScene = this.scene as Phaser.Scene & {
        bossCharge?: (boss: Enemy, target: Player) => void;
        bossRadialBurst?: (boss: Enemy) => void;
      };

      if (this.bossPhase === 0) {
        gameScene.bossCharge?.(this, player);
      } else {
        gameScene.bossRadialBurst?.(this);
      }
    } else if (dist > 100) {
      this.scene.physics.moveToObject(this, player, this.speed);
    } else {
      this.setVelocity(0, 0);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const movement =
      speed > 8
        ? { x: body.velocity.x / speed, y: body.velocity.y / speed }
        : { x: 0, y: 0 };
    this.lastFacing = updateEnemyAnimation(this, this.enemyType, movement, this.lastFacing, deltaMs);
    this.syncMovementSfx(speed);
  }
}

export interface ProjectileOptions {
  textureKey?: string;
  displayScale?: number;
  hitRadius?: number;
  rotateToVelocity?: boolean;
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 1;
  private rotateToVelocity = false;
  private ttlTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, options?: ProjectileOptions) {
    const textureKey = options?.textureKey ?? 'projectile';
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(4);
    this.rotateToVelocity = options?.rotateToVelocity ?? false;

    if (options?.displayScale) {
      this.setScale(options.displayScale);
      const radius = options.hitRadius ?? 6;
      this.setCircle(radius / options.displayScale);
    } else {
      this.setCircle(6);
    }
  }

  private aimAlong(angle: number): void {
    if (this.rotateToVelocity) {
      this.setRotation(angle);
    }
  }

  fire(tx: number, ty: number, speed = 180): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.aimAlong(angle);
    this.scheduleTtl(3000);
  }

  fireAtAngle(angle: number, speed = 200): void {
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.aimAlong(angle);
    this.scheduleTtl(3000);
  }

  private scheduleTtl(delayMs: number): void {
    this.clearTtl();
    this.ttlTimer = window.setTimeout(() => {
      this.ttlTimer = 0;
      if (this.active) this.destroy();
    }, delayMs);
  }

  private clearTtl(): void {
    if (!this.ttlTimer) return;
    window.clearTimeout(this.ttlTimer);
    this.ttlTimer = 0;
  }

  destroy(fromScene?: boolean): void {
    this.clearTtl();
    super.destroy(fromScene);
  }
}

export class Coin extends Phaser.Physics.Arcade.Sprite {
  value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value = 1) {
    const textureKey = hasCoinTexture(scene, value)
      ? getCoinTextureKey(value)
      : hasAnyCoinTexture(scene)
        ? getCoinTextureKey(1)
        : 'coin';
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.value = value;
    this.setDepth(3);

    if (hasCoinTexture(scene, value) || (textureKey !== 'coin' && hasAnyCoinTexture(scene))) {
      this.setScale(COIN_DISPLAY_SCALE);
      this.setCircle(COIN_HIT_RADIUS / COIN_DISPLAY_SCALE);
    } else {
      this.setCircle(8);
    }

    attachGroundShadow(this, {
      radiusX: COIN_HIT_RADIUS * 0.85,
      offsetY: this.displayHeight * 0.38,
      depth: 2,
      alpha: 0.22,
    });
  }
}

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  powerUpType: string;

  constructor(scene: Phaser.Scene, x: number, y: number, type: string) {
    super(scene, x, y, `powerup_${type}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.powerUpType = type;
    this.setDepth(4);

    if (hasPowerUpTexture(scene, type)) {
      this.setScale(PICKUP_DISPLAY_SCALE);
      this.setCircle(PICKUP_HIT_RADIUS / PICKUP_DISPLAY_SCALE);
    } else {
      this.setCircle(12);
    }

    attachGroundShadow(this, {
      radiusX: PICKUP_HIT_RADIUS * 0.9,
      offsetY: this.displayHeight * 0.4,
      depth: 3,
      alpha: 0.24,
    });
  }
}
