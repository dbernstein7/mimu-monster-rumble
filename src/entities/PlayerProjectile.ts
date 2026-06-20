import Phaser from 'phaser';
import { FIREBALL_SLAM_VFX_DIAMETER, spawnChaosBurstVfxAt, spawnFireSlamVfxAt } from '../assets/attackAssets';
import { playProjectileHitSfx } from '../assets/soundFxAssets';
import type { CharacterId } from '../types/game';
import type { Enemy } from './Enemy';

export type PlayerProjectileKind = 'voidOrb' | 'frostIcicle' | 'chaosBomb' | 'fireOrb';

type KillHandler = (enemy: Enemy) => void;

export class PlayerProjectile extends Phaser.Physics.Arcade.Sprite {
  kind: PlayerProjectileKind;
  damage: number;
  explodeDamage: number;
  explodeRadius: number;
  lifetimeMs: number;
  spawnedAt: number;
  exploded = false;
  explodeColor: number;
  private hitEnemies = new Set<Enemy>();
  private lastFireTick = 0;
  private killEnemy: KillHandler;
  private hitRadius: number;
  dotIntervalMs = 450;
  spinSpeed = 0;
  growScaleStart = 1;
  growScaleEnd = 1;
  displaySizeStart = 0;
  displaySizeEnd = 0;
  fieldRadiusStart = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    kind: PlayerProjectileKind,
    bodyRadius: number,
    damage: number,
    explodeDamage: number,
    explodeRadius: number,
    lifetimeMs: number,
    killEnemy: KillHandler,
    explodeColor = 0xffffff,
    textureFrame?: string | number,
  ) {
    super(scene, x, y, textureKey, textureFrame);
    this.explodeColor = explodeColor;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.damage = damage;
    this.explodeDamage = explodeDamage;
    this.explodeRadius = explodeRadius;
    this.lifetimeMs = lifetimeMs;
    this.spawnedAt = scene.time.now;
    this.killEnemy = killEnemy;
    this.hitRadius = bodyRadius;
    this.setDepth(8);
    this.setOrigin(0.5, 0.5);
    this.setCircle(bodyRadius);
  }

  launch(vx: number, vy: number, speed: number): void {
    this.setVelocity(vx * speed, vy * speed);
  }

  tick(enemies: Phaser.GameObjects.Group, now: number): void {
    if (!this.active || this.exploded || !this.scene.sys.isActive()) return;

    if (this.kind === 'chaosBomb') {
      this.setVelocity(0, 0);
      if (now - this.spawnedAt >= this.lifetimeMs) {
        this.explode(enemies);
      }
      return;
    }

    if (this.kind === 'voidOrb') {
      this.tickVoidOrb(enemies, now);
      return;
    }

    if (this.kind === 'fireOrb') {
      this.tickFireBall(enemies, now);
      return;
    }

    this.checkContactDamage(enemies);

    if (this.kind === 'frostIcicle' && now - this.spawnedAt >= this.lifetimeMs) {
      this.destroy();
    }
  }

  private checkContactDamage(enemies: Phaser.GameObjects.Group): void {
    for (const e of [...enemies.getChildren()]) {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.isDead || this.hitEnemies.has(enemy)) continue;

      const reach = this.hitRadius + enemy.getHurtRadius();
      if (Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) >= reach) continue;

      this.hitEnemies.add(enemy);
      if (enemy.takeDamage(this.damage)) {
        this.killEnemy(enemy);
      }
      playProjectileHitSfx(this.scene);

      if (this.kind === 'frostIcicle') {
        this.destroy();
        return;
      }
    }
  }

  private applyDisplayGrowth(progress: number): number {
    if (this.displaySizeEnd <= this.displaySizeStart) return 1;

    const size = Phaser.Math.Linear(this.displaySizeStart, this.displaySizeEnd, progress);
    this.setDisplaySize(size, size);
    return size / this.displaySizeStart;
  }

  private tickVoidOrb(enemies: Phaser.GameObjects.Group, now: number): void {
    const progress = Phaser.Math.Clamp((now - this.spawnedAt) / this.lifetimeMs, 0, 1);

    this.applyDisplayGrowth(progress);

    const fieldRadius =
      this.fieldRadiusStart > 0
        ? Phaser.Math.Linear(this.fieldRadiusStart, this.explodeRadius, progress)
        : this.explodeRadius;

    if (this.spinSpeed !== 0) {
      this.rotation += this.scene.game.loop.delta * this.spinSpeed;
    }

    for (const e of [...enemies.getChildren()]) {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.isDead) continue;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist > fieldRadius) continue;

      if (dist > 6) {
        const pullSpeed = Phaser.Math.Linear(90, 210, 1 - dist / fieldRadius);
        this.scene.physics.moveToObject(enemy, this, pullSpeed);
      }
    }

    this.damageInRadius(enemies, this.damage, this.dotIntervalMs);

    if (now - this.spawnedAt >= this.lifetimeMs) {
      this.destroy();
    }
  }

  private tickFireBall(enemies: Phaser.GameObjects.Group, now: number): void {
    const progress = Phaser.Math.Clamp((now - this.spawnedAt) / this.lifetimeMs, 0, 1);

    const sizeMult = this.applyDisplayGrowth(progress);

    if (this.spinSpeed !== 0) {
      this.rotation += this.scene.game.loop.delta * this.spinSpeed;
    }

    for (const e of [...enemies.getChildren()]) {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.isDead) continue;

      const reach = this.hitRadius * sizeMult + enemy.getHurtRadius();
      if (Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) >= reach) continue;

      this.explode(enemies);
      return;
    }

    if (now - this.spawnedAt >= this.lifetimeMs) {
      this.explode(enemies);
    }
  }

  private damageInRadius(enemies: Phaser.GameObjects.Group, amount: number, intervalMs: number): void {
    const now = this.scene.time.now;
    if (now - this.lastFireTick < intervalMs) return;
    this.lastFireTick = now;

    const radius = this.explodeRadius;
    let hitAnyone = false;
    for (const e of [...enemies.getChildren()]) {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.isDead) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) > radius) continue;
      if (enemy.takeDamage(amount)) {
        this.killEnemy(enemy);
      }
      hitAnyone = true;
    }
    if (hitAnyone) {
      playProjectileHitSfx(this.scene);
    }
  }

  private explode(enemies: Phaser.GameObjects.Group): void {
    if (this.exploded) return;
    this.exploded = true;

    const center = this.getCenter();
    const ex = center.x;
    const ey = center.y;
    const radius = this.explodeRadius;

    if (this.kind === 'fireOrb') {
      spawnFireSlamVfxAt(this.scene, ex, ey, FIREBALL_SLAM_VFX_DIAMETER);
      this.scene.cameras.main.shake(80, 0.006);
    } else if (this.kind === 'chaosBomb') {
      spawnChaosBurstVfxAt(this.scene, ex, ey, radius, radius * 2.4);
      this.scene.cameras.main.shake(100, 0.008);
    } else {
      const ring = this.scene.add.circle(ex, ey, radius, this.explodeColor, 0.45);
      ring.setDepth(9);
      this.scene.tweens.add({
        targets: ring,
        scale: 1.15,
        alpha: 0,
        duration: 320,
        onComplete: () => ring.destroy(),
      });
    }

    let hitAnyone = false;
    for (const e of [...enemies.getChildren()]) {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.isDead) continue;
      if (Phaser.Math.Distance.Between(ex, ey, enemy.x, enemy.y) > radius + enemy.getHurtRadius()) continue;
      if (enemy.takeDamage(this.explodeDamage)) {
        this.killEnemy(enemy);
      }
      hitAnyone = true;
    }
    if (hitAnyone) {
      playProjectileHitSfx(this.scene);
    }

    this.destroy();
  }
}

export function getAimDirection(
  lastFacing: 'down' | 'up' | 'left' | 'right',
  movement: { x: number; y: number },
): { x: number; y: number } {
  let dx = movement.x;
  let dy = movement.y;

  if (dx === 0 && dy === 0) {
    switch (lastFacing) {
      case 'left':
        dx = -1;
        break;
      case 'right':
        dx = 1;
        break;
      case 'up':
        dy = -1;
        break;
      default:
        dy = 1;
        break;
    }
  }

  const len = Math.hypot(dx, dy);
  if (len < 0.01) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

export function characterToProjectileKind(id: CharacterId): PlayerProjectileKind {
  switch (id) {
    case 'voidWarrior':
      return 'voidOrb';
    case 'frostGuardian':
      return 'frostIcicle';
    case 'chaosTrickster':
      return 'chaosBomb';
    case 'fireStriker':
      return 'fireOrb';
  }
}
