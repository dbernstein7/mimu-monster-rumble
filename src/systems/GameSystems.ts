import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { MovementVector } from '../input/InputManager';
import {
  FIRE_DASH_FLAME_ANIM,
  FIRE_DASH_FLAME_SCALE,
  FROST_WAVE_DISPLAY_DIAMETER,
  getAttackTextureKey,
  getFireDashFlameFrameKey,
  hasAttackTexture,
  hasFireDashFlames,
  spawnChaosBurstVfxAt,
  spawnFireSlamVfxAt,
  VOID_SLAM_DISPLAY_DIAMETER,
} from '../assets/attackAssets';
import {
  EXPLOSION_SFX_KEY,
  EXPLOSION_SFX_VOLUME,
  hasExplosionSfx,
  PRIMARY_ABILITY_EXPLOSION_SFX_DURATION_MS,
} from '../assets/soundFxAssets';
import { BOMB_RADIUS, POWERUPS } from '../config/powerups';

type KillHandler = (enemy: Enemy) => void;

export class AbilitySystem {
  scene: Phaser.Scene;
  private killEnemy: KillHandler;
  private explosionSound?: Phaser.Sound.BaseSound;
  private explosionStopTimer?: Phaser.Time.TimerEvent;
  private fireDashTick?: Phaser.Time.TimerEvent;
  private fireDashEndTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, killEnemy: KillHandler) {
    this.scene = scene;
    this.killEnemy = killEnemy;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopExplosionSfx());
  }

  useAbility(player: Player, enemies: Phaser.GameObjects.Group, movement: MovementVector): void {
    if (!player.canUseAbility() || player.isDashing) return;
    player.startAbilityCooldown();
    this.playAbilityExplosionSfx(player.config.id);

    switch (player.config.id) {
      case 'voidWarrior':
        this.voidSlam(player, enemies);
        break;
      case 'frostGuardian':
        this.frostWave(player, enemies);
        break;
      case 'chaosTrickster':
        this.chaosBurst(player, enemies);
        break;
      case 'fireStriker':
        this.fireDash(player, enemies, movement);
        break;
    }
  }

  pauseExplosionSfx(paused: boolean): void {
    if (!this.explosionSound?.isPlaying) return;
    if (paused) {
      this.explosionSound.pause();
    } else {
      this.explosionSound.resume();
    }
  }

  stopExplosionSfx(): void {
    this.explosionStopTimer?.destroy();
    this.explosionStopTimer = undefined;
    if (this.explosionSound) {
      this.explosionSound.stop();
      this.explosionSound.destroy();
      this.explosionSound = undefined;
    }
  }

  /** Stop ability timers/SFX during boss defeat or scene teardown. */
  cancelActiveEffects(player: Player): void {
    this.stopExplosionSfx();
    this.fireDashTick?.destroy();
    this.fireDashTick = undefined;
    this.fireDashEndTimer?.destroy();
    this.fireDashEndTimer = undefined;
    player.isDashing = false;
    player.setVelocity(0, 0);
  }

  private playAbilityExplosionSfx(characterId: keyof typeof PRIMARY_ABILITY_EXPLOSION_SFX_DURATION_MS): void {
    if (!hasExplosionSfx(this.scene)) return;

    this.stopExplosionSfx();

    const durationMs = PRIMARY_ABILITY_EXPLOSION_SFX_DURATION_MS[characterId];
    const sound = this.scene.sound.add(EXPLOSION_SFX_KEY, {
      loop: true,
      volume: EXPLOSION_SFX_VOLUME,
    });
    this.explosionSound = sound;
    sound.play();
    this.explosionStopTimer = this.scene.time.delayedCall(durationMs, () => {
      this.stopExplosionSfx();
    });
  }

  private damageEnemiesInRadius(
    player: Player,
    enemies: Phaser.GameObjects.Group,
    radius: number,
    damage: number,
    knockback = false,
  ): void {
    this.damageEnemiesAtPoint(enemies, player.x, player.y, radius, damage, knockback);
  }

  private damageEnemiesAtPoint(
    enemies: Phaser.GameObjects.Group,
    x: number,
    y: number,
    radius: number,
    damage: number,
    knockback = false,
  ): void {
    const targets = [...enemies.getChildren()] as Enemy[];

    for (const enemy of targets) {
      if (!enemy.active || enemy.isDead) continue;

      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > radius + enemy.getHurtRadius()) continue;

      const killed = enemy.takeDamage(damage);
      if (killed) {
        this.killEnemy(enemy);
      } else if (knockback) {
        const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
        enemy.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
      }
    }
  }

  private voidSlam(player: Player, enemies: Phaser.GameObjects.Group): void {
    const radius = 120;
    this.spawnVoidSlamVfx(player);
    this.scene.cameras.main.shake(150, 0.01);
    this.damageEnemiesInRadius(player, enemies, radius, player.damage * 3, true);
  }

  private spawnVoidSlamVfx(player: Player): void {
    const effectId = 'voidSlam';
    if (hasAttackTexture(this.scene, effectId)) {
      const key = getAttackTextureKey(effectId);
      const feetY = player.y + player.displayHeight * 0.44;
      const vfx = this.scene.add.image(player.x, feetY, key);
      const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const baseScale = VOID_SLAM_DISPLAY_DIAMETER / src.width;

      vfx.setDepth(4);
      vfx.setOrigin(0.5, 0.5);
      vfx.setScale(baseScale * 0.15);
      vfx.setAlpha(0.95);
      vfx.setBlendMode(Phaser.BlendModes.ADD);

      this.scene.tweens.add({
        targets: vfx,
        scale: baseScale * 1.05,
        alpha: 0,
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => vfx.destroy(),
      });
      return;
    }

    const ring = this.scene.add.circle(player.x, player.y, 120, player.config.color, 0.6);
    ring.setScale(0.1);
    ring.setDepth(15);
    this.scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  private spawnFrostWaveVfx(player: Player): void {
    const effectId = 'frostWave';
    if (hasAttackTexture(this.scene, effectId)) {
      const key = getAttackTextureKey(effectId);
      const feetY = player.y + player.displayHeight * 0.44;
      const vfx = this.scene.add.image(player.x, feetY, key);
      const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const baseScale = FROST_WAVE_DISPLAY_DIAMETER / src.width;

      vfx.setDepth(4);
      vfx.setOrigin(0.5, 0.5);
      vfx.setScale(baseScale * 0.12);
      vfx.setAlpha(0.92);
      vfx.setBlendMode(Phaser.BlendModes.ADD);

      this.scene.tweens.add({
        targets: vfx,
        scale: baseScale * 1.05,
        alpha: 0,
        duration: 560,
        ease: 'Cubic.easeOut',
        onComplete: () => vfx.destroy(),
      });
      return;
    }

    const ring = this.scene.add.circle(player.x, player.y, 150, 0x3498db, 0.5);
    ring.setScale(0.1);
    ring.setDepth(15);
    this.scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy(),
    });
  }

  private frostWave(player: Player, enemies: Phaser.GameObjects.Group): void {
    const radius = 150;
    this.spawnFrostWaveVfx(player);

    const abilityDamage = player.damage * 2;
    const targets = [...enemies.getChildren()] as Enemy[];
    for (const enemy of targets) {
      if (!enemy.active || enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist > radius + enemy.getHurtRadius()) continue;

      enemy.applySlow(3000, 0.5);
      const killed = enemy.takeDamage(abilityDamage);
      if (killed) {
        this.killEnemy(enemy);
      }
    }
  }

  private spawnChaosBurstVfx(player: Player, radius: number): void {
    const feetY = player.y + player.displayHeight * 0.44;
    spawnChaosBurstVfxAt(this.scene, player.x, feetY, radius);
  }

  private chaosBurst(player: Player, enemies: Phaser.GameObjects.Group): void {
    const radius = 190;
    const damage = Math.max(10, player.damage * 2);
    const confusionMs = 5000;
    const targets = [...enemies.getChildren()] as Enemy[];

    this.spawnChaosBurstVfx(player, radius);
    this.scene.cameras.main.shake(100, 0.008);
    this.showFloatingText(player.x, player.y - 36, 'CHAOS!', 0x9b59b6);

    for (const enemy of targets) {
      if (!enemy.active || enemy.isDead) continue;

      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      const reach = radius + enemy.getHurtRadius();
      if (dist > reach) continue;

      if (!enemy.isBoss) {
        enemy.applyConfusion(confusionMs);
      }
    }

    for (const enemy of targets) {
      if (!enemy.active || enemy.isDead) continue;

      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      const reach = radius + enemy.getHurtRadius();
      if (dist > reach) continue;

      const killed = enemy.takeDamage(damage);
      if (killed) {
        this.killEnemy(enemy);
      }
    }
  }

  private spawnFireSlamVfx(x: number, y: number, player: Player): void {
    spawnFireSlamVfxAt(this.scene, x, y + player.displayHeight * 0.44);
  }

  private createFireDashFlameSprite(x: number, y: number, angleDeg: number): Phaser.GameObjects.Sprite {
    const flame = this.scene.add.sprite(x, y, getFireDashFlameFrameKey(0));
    flame.setDepth(5);
    flame.setOrigin(0.5, 0.5);
    flame.setAngle(angleDeg);
    flame.setScale(FIRE_DASH_FLAME_SCALE);
    flame.setAlpha(0.92);
    flame.setBlendMode(Phaser.BlendModes.ADD);
    flame.play(FIRE_DASH_FLAME_ANIM);
    return flame;
  }

  private spawnFireDashFlame(x: number, y: number, angleDeg: number, fadeMs: number): void {
    const flame = this.createFireDashFlameSprite(x, y, angleDeg);
    this.scene.tweens.add({
      targets: flame,
      alpha: 0,
      duration: fadeMs,
      onComplete: () => flame.destroy(),
    });
  }

  private spawnFireDashTrail(startX: number, startY: number, dx: number, dy: number): Phaser.GameObjects.Sprite | null {
    if (!hasFireDashFlames(this.scene)) return null;

    const angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    for (let i = 0; i < 5; i++) {
      this.spawnFireDashFlame(startX - dx * i * 34, startY - dy * i * 34, angleDeg, 420 + i * 30);
    }

    return this.createFireDashFlameSprite(startX - dx * 18, startY - dy * 18, angleDeg);
  }

  private fireDash(player: Player, enemies: Phaser.GameObjects.Group, movement: MovementVector): void {
    let dx = movement.x;
    let dy = movement.y;
    if (dx === 0 && dy === 0) dx = 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const dashSpeed = 880;
    const dashMs = 300;
    const burstRadius = 78;
    const dashDamage = player.damage * 2;
    const burstDamage = Math.round(player.damage * 1.5);
    const startX = player.x;
    const startY = player.y;
    const hit = new Set<Enemy>();

    const damageAt = (x: number, y: number): void => {
      for (const enemy of [...enemies.getChildren()] as Enemy[]) {
        if (!enemy.active || enemy.isDead || hit.has(enemy)) continue;

        const body = enemy.body as Phaser.Physics.Arcade.Body | null;
        const enemyR = body ? Math.max(body.halfWidth, body.halfHeight) : 18;
        const reach = player.bodyRadius + enemyR;

        if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) >= reach) continue;

        hit.add(enemy);
        if (enemy.takeDamage(dashDamage)) {
          this.killEnemy(enemy);
        }
      }
    };

    player.applyInvulnerability(dashMs + 80);
    player.isDashing = true;
    player.setVelocity(dx * dashSpeed, dy * dashSpeed);

    damageAt(startX, startY);

    const trailFlame = this.spawnFireDashTrail(startX, startY, dx, dy);
    const angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    let stampTimer = 0;

    this.fireDashTick?.destroy();
    this.fireDashEndTimer?.destroy();

    this.fireDashTick = this.scene.time.addEvent({
      delay: 16,
      repeat: Math.ceil(dashMs / 16),
      callback: () => {
        damageAt(player.x, player.y);
        if (trailFlame?.active) {
          trailFlame.setPosition(player.x - dx * 22, player.y - dy * 22);
        }
        stampTimer += 16;
        if (hasFireDashFlames(this.scene) && stampTimer >= 48) {
          stampTimer = 0;
          this.spawnFireDashFlame(player.x - dx * 16, player.y - dy * 16, angleDeg, 280);
        }
      },
    });

    this.fireDashEndTimer = this.scene.time.delayedCall(dashMs, () => {
      this.fireDashTick?.destroy();
      this.fireDashTick = undefined;
      this.fireDashEndTimer = undefined;
      trailFlame?.destroy();
      const endX = player.x;
      const endY = player.y;
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        damageAt(Phaser.Math.Linear(startX, endX, t), Phaser.Math.Linear(startY, endY, t));
      }
      this.spawnFireSlamVfx(endX, endY, player);
      this.damageEnemiesAtPoint(enemies, endX, endY, burstRadius, burstDamage);
      this.scene.cameras.main.shake(80, 0.006);
      player.isDashing = false;
      player.setVelocity(0, 0);
    });

    if (!hasFireDashFlames(this.scene)) {
      for (let i = 0; i < 7; i++) {
        const trail = this.scene.add.circle(player.x - dx * i * 28, player.y - dy * i * 28, 14, 0xe74c3c, 0.6);
        trail.setDepth(8);
        this.scene.tweens.add({ targets: trail, alpha: 0, duration: 350, onComplete: () => trail.destroy() });
      }
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: number): void {
    const t = this.scene.add.text(x, y - 20, text, {
      fontSize: '16px',
      color: `#${color.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    t.setDepth(20);
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }
}

export class PowerUpManager {
  scene: Phaser.Scene;
  private killEnemy: KillHandler;

  constructor(scene: Phaser.Scene, killEnemy: KillHandler) {
    this.scene = scene;
    this.killEnemy = killEnemy;
  }

  apply(type: string, player: Player, enemies: Phaser.GameObjects.Group): void {
    const cfg = POWERUPS[type];
    if (!cfg) return;

    switch (type) {
      case 'health':
        player.heal(1);
        break;
      case 'speed':
        player.applySpeedBoost(cfg.durationMs ?? 8000);
        break;
      case 'shield':
        player.applyShield(cfg.durationMs ?? 12000);
        break;
      case 'damage':
        player.applyDamageBoost(cfg.durationMs ?? 10000);
        break;
      case 'coinMagnet':
        player.applyCoinMagnet(cfg.durationMs ?? 12000);
        break;
      case 'bomb': {
        const ring = this.scene.add.circle(player.x, player.y, BOMB_RADIUS, 0xff6b35, 0.55);
        ring.setScale(0.15);
        ring.setDepth(15);
        this.scene.tweens.add({
          targets: ring,
          scale: 1,
          alpha: 0,
          duration: 400,
          onComplete: () => ring.destroy(),
        });

        const targets = [...enemies.getChildren()] as Enemy[];
        for (const enemy of targets) {
          if (!enemy.active || enemy.isDead) continue;
          const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
          if (dist > BOMB_RADIUS) continue;
          if (enemy.takeDamage(999)) this.killEnemy(enemy);
        }
        this.scene.cameras.main.flash(200, 255, 200, 0);
        this.scene.cameras.main.shake(120, 0.008);
        break;
      }
    }
  }
}

export class WaveManager {
  scene: Phaser.Scene;
  currentWave = 0;
  waveActive = false;
  enemiesRemaining = 0;
  waveTimer = 0;
  onWaveComplete?: () => void;
  onWaveFailed?: () => void;
  onAllWavesComplete?: () => void;
  totalWaves: number;

  constructor(scene: Phaser.Scene, totalWaves: number) {
    this.scene = scene;
    this.totalWaves = totalWaves;
  }

  startWave(durationSec: number): void {
    if (this.currentWave >= this.totalWaves) {
      this.onAllWavesComplete?.();
      return;
    }
    this.waveActive = true;
    this.waveTimer = durationSec;
    this.enemiesRemaining = 0;
  }

  registerSpawn(count: number): void {
    this.enemiesRemaining += count;
  }

  enemyKilled(): void {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
    if (this.waveActive && this.enemiesRemaining <= 0) {
      this.completeWave();
    }
  }

  update(dt: number): void {
    if (!this.waveActive) return;
    this.waveTimer -= dt;
    if (this.waveTimer > 0) return;

    if (this.enemiesRemaining > 0) {
      this.waveActive = false;
      this.onWaveFailed?.();
      return;
    }

    this.completeWave();
  }

  private completeWave(): void {
    this.waveActive = false;
    this.currentWave++;
    this.onWaveComplete?.();
    if (this.currentWave >= this.totalWaves) {
      this.onAllWavesComplete?.();
    }
  }

  getProgress(): number {
    return this.currentWave / this.totalWaves;
  }
}
