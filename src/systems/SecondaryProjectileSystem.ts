import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { attachGroundShadow, shadowFromFeet, type ShadowSprite } from '../entities/GroundShadow';
import type { MovementVector } from '../input/InputManager';
import {
  CHAOS_BOMB_EXPLODE_RADIUS,
  CHAOS_BOMB_PROJ_WIDTH,
  CHAOS_BOMB_TEXTURE_KEY,
  FIREBALL_DAMAGE_MULT,
  FIREBALL_EXPLODE_RADIUS,
  FIREBALL_PROJ_MAX_WIDTH,
  FIREBALL_PROJ_WIDTH,
  FIREBALL_SPIN_SPEED,
  FIREBALL_SPEED,
  FIREBALL_TEXTURE_KEY,
  ICE_BURST_PROJ_WIDTH,
  ICE_BURST_TEXTURE_KEY,
  VOID_ORB_DAMAGE_MULT,
  VOID_ORB_DOT_INTERVAL_MS,
  VOID_ORB_FIELD_RADIUS,
  VOID_ORB_FIELD_RADIUS_START,
  VOID_ORB_PROJ_MAX_WIDTH,
  VOID_ORB_PROJ_WIDTH,
  VOID_ORB_SPIN_SPEED,
  VOID_ORB_SPEED,
  VOID_ORB_TEXTURE_KEY,
  hasChaosBombProjectile,
  hasFireballProjectile,
  hasIceBurstProjectile,
  hasVoidOrbProjectile,
} from '../assets/attackAssets';
import { getSecondaryProjectileConfig } from '../config/secondaryProjectiles';
import {
  PlayerProjectile,
  characterToProjectileKind,
  getAimDirection,
} from '../entities/PlayerProjectile';

type KillHandler = (enemy: Enemy) => void;

export class SecondaryProjectileSystem {
  private scene: Phaser.Scene;
  private projectiles: Phaser.GameObjects.Group;
  private killEnemy: KillHandler;

  constructor(scene: Phaser.Scene, projectiles: Phaser.GameObjects.Group, killEnemy: KillHandler) {
    this.scene = scene;
    this.projectiles = projectiles;
    this.killEnemy = killEnemy;
  }

  fire(player: Player, movement: MovementVector): void {
    if (!player.canUseSecondaryProjectile()) return;

    const cfg = getSecondaryProjectileConfig(player.config.id);
    player.startSecondaryCooldown(cfg.cooldownMs);

    const aim = getAimDirection(player.lastFacing, movement);
    const kind = characterToProjectileKind(player.config.id);
    const baseDamage = Math.max(10, player.damage);

    switch (player.config.id) {
      case 'voidWarrior':
        this.spawnProjectile(
          kind,
          cfg,
          player.x + aim.x * 28,
          player.y + aim.y * 28,
          aim,
          VOID_ORB_SPEED,
          Math.max(10, Math.round(baseDamage * VOID_ORB_DAMAGE_MULT)),
          0,
          VOID_ORB_FIELD_RADIUS,
          cfg.lifetimeMs,
        );
        break;

      case 'frostGuardian': {
        const spread = [-0.26, 0, 0.26];
        const baseAngle = Math.atan2(aim.y, aim.x);
        spread.forEach((offset) => {
          const angle = baseAngle + offset;
          const dir = { x: Math.cos(angle), y: Math.sin(angle) };
          this.spawnProjectile(
            kind,
            cfg,
            player.x + dir.x * 24,
            player.y + dir.y * 24,
            dir,
            420,
            baseDamage,
            0,
            0,
            cfg.lifetimeMs,
          );
        });
        break;
      }

      case 'chaosTrickster':
        this.spawnProjectile(
          kind,
          cfg,
          player.x + aim.x * 18,
          player.y + aim.y * 18,
          aim,
          0,
          0,
          baseDamage * 2.5,
          CHAOS_BOMB_EXPLODE_RADIUS,
          cfg.lifetimeMs,
        );
        break;

      case 'fireStriker':
        this.spawnProjectile(
          kind,
          cfg,
          player.x + aim.x * 30,
          player.y + aim.y * 30,
          aim,
          FIREBALL_SPEED,
          0,
          Math.max(10, Math.round(baseDamage * FIREBALL_DAMAGE_MULT)),
          FIREBALL_EXPLODE_RADIUS,
          cfg.lifetimeMs,
        );
        break;
    }
  }

  private spawnProjectile(
    kind: ReturnType<typeof characterToProjectileKind>,
    cfg: ReturnType<typeof getSecondaryProjectileConfig>,
    x: number,
    y: number,
    dir: { x: number; y: number },
    speed: number,
    contactDamage: number,
    explodeDamage: number,
    explodeRadius: number,
    lifetimeMs: number,
  ): void {
    const useChaosBomb = kind === 'chaosBomb' && hasChaosBombProjectile(this.scene);
    const useIceBurst = kind === 'frostIcicle' && hasIceBurstProjectile(this.scene);
    const useVoidOrb = kind === 'voidOrb' && hasVoidOrbProjectile(this.scene);
    const useFireball = kind === 'fireOrb' && hasFireballProjectile(this.scene);
    const textureKey = useIceBurst
      ? ICE_BURST_TEXTURE_KEY
      : useVoidOrb
        ? VOID_ORB_TEXTURE_KEY
        : useFireball
          ? FIREBALL_TEXTURE_KEY
          : useChaosBomb
            ? CHAOS_BOMB_TEXTURE_KEY
            : this.scene.textures.exists(cfg.textureKey)
              ? cfg.textureKey
              : kind === 'voidOrb'
                ? 'player_proj_void'
                : kind === 'chaosBomb'
                  ? 'player_proj_chaos'
                  : kind === 'fireOrb'
                    ? 'player_proj_fire'
                    : 'player_proj_frost';

    const proj = new PlayerProjectile(
      this.scene,
      x,
      y,
      textureKey,
      kind,
      cfg.bodyRadius,
      contactDamage,
      explodeDamage,
      explodeRadius,
      lifetimeMs,
      this.killEnemy,
      cfg.color,
    );

    if (kind === 'voidOrb') {
      proj.dotIntervalMs = VOID_ORB_DOT_INTERVAL_MS;
      proj.spinSpeed = VOID_ORB_SPIN_SPEED;
      proj.displaySizeStart = VOID_ORB_PROJ_WIDTH;
      proj.displaySizeEnd = VOID_ORB_PROJ_MAX_WIDTH;
      proj.fieldRadiusStart = VOID_ORB_FIELD_RADIUS_START;
    }

    if (kind === 'fireOrb') {
      proj.spinSpeed = FIREBALL_SPIN_SPEED;
      proj.displaySizeStart = FIREBALL_PROJ_WIDTH;
      proj.displaySizeEnd = FIREBALL_PROJ_MAX_WIDTH;
    }

    if (useVoidOrb) {
      proj.setDepth(15);
      proj.setDisplaySize(VOID_ORB_PROJ_WIDTH, VOID_ORB_PROJ_WIDTH);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      proj.setAlpha(0.95);
    } else if (kind === 'voidOrb') {
      proj.setAlpha(0.9);
    } else if (useFireball) {
      proj.setDepth(15);
      proj.setDisplaySize(FIREBALL_PROJ_WIDTH, FIREBALL_PROJ_WIDTH);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      proj.setAlpha(0.95);
    } else if (useChaosBomb || kind === 'chaosBomb') {
      proj.setDepth(15);
      if (useChaosBomb) {
        proj.setDisplaySize(CHAOS_BOMB_PROJ_WIDTH, CHAOS_BOMB_PROJ_WIDTH);
        proj.setAlpha(1);
      } else {
        proj.setTint(cfg.color);
      }
      this.attachChaosBombShadow(proj, useChaosBomb ? CHAOS_BOMB_PROJ_WIDTH : cfg.bodyRadius * 2);
    } else if (kind === 'fireOrb') {
      proj.setScale(0.9);
      proj.setAlpha(0.85);
    } else if (useIceBurst) {
      const frame = proj.frame;
      const aspect = frame.height / frame.width;
      proj.setDepth(15);
      proj.setOrigin(0.2, 0.5);
      proj.setDisplaySize(ICE_BURST_PROJ_WIDTH, ICE_BURST_PROJ_WIDTH * aspect);
      proj.setRotation(Math.atan2(dir.y, dir.x));
      proj.setBlendMode(Phaser.BlendModes.ADD);
    } else if (kind === 'frostIcicle') {
      proj.setDepth(15);
      proj.setTint(cfg.color);
    }

    proj.launch(dir.x, dir.y, speed);
    this.projectiles.add(proj);
  }

  private attachChaosBombShadow(proj: PlayerProjectile, footprintWidth: number): void {
    attachGroundShadow(
      proj as ShadowSprite,
      shadowFromFeet(proj, footprintWidth * 0.3, proj.depth - 1),
    );
  }

  update(enemies: Phaser.GameObjects.Group): void {
    if (!this.scene.sys.isActive()) return;
    const gameScene = this.scene as Phaser.Scene & {
      levelTransitioning?: boolean;
      levelExitActive?: boolean;
    };
    if (gameScene.levelTransitioning || gameScene.levelExitActive) return;

    const now = this.scene.time.now;
    for (const child of [...this.projectiles.getChildren()]) {
      const proj = child as PlayerProjectile;
      if (!proj.active) continue;
      proj.tick(enemies, now);
    }
  }
}
