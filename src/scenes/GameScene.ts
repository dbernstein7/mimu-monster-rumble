import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getLevel, LEVELS } from '../config/levels';
import { BOSS_PUMPKIN_PROJECTILE, getBossHp, getBossIdForLevel, getSlimeBallProjectileOptions } from '../config/enemies';
import { getFloorTextureKey, hasFloorTexture } from '../assets/floorTextures';
import { getArenaExitGatePosition } from '../config/arenaWalls';
import { GAME_WIDTH, GAME_HEIGHT, PLAY_AREA } from '../config/gameConstants';
import type { LevelConfig } from '../types/game';
import { rollCoinValue } from '../config/coins';
import { POWERUP_DROP_CHANCE, POWERUP_KILL_DROP_CHANCE, POWERUPS } from '../config/powerups';
import { Player } from '../entities/Player';
import { Enemy, Projectile, Coin, Pickup, type ProjectileOptions } from '../entities/Enemy';
import { AbilitySystem, PowerUpManager, WaveManager } from '../systems/GameSystems';
import { SecondaryProjectileSystem } from '../systems/SecondaryProjectileSystem';
import { PlayerWalkingSfx } from '../systems/PlayerWalkingSfx';
import { HUD } from '../ui/HUD';
import { InputManager } from '../input/InputManager';
import { MobileControls } from '../ui/MobileControls';
import { isMobileTouchDevice, tryLockLandscape } from '../utils/device';
import type { CharacterId, EnemyType } from '../types/game';
import { clampSpriteToWorld, spawnMargins } from '../utils/screenBounds';
import { buildOctagonArenaWalls, randomPointNearArenaWall } from '../utils/arenaWalls';
import { createScreenCornerVignette } from '../utils/playerSpotlight';
import { getFullscreenButtonBottomRightPosition, mountFullscreenButton, UI_FONTS } from '../ui/theme';
import { getEnemySpriteConfig } from '../config/enemySprites';
import {
  BOSS_MUSIC_INTRO_MS,
  BOSS_MUSIC_INTRO_VOLUME,
  BOSS_MUSIC_KEY,
  BOSS_MUSIC_START_SEC,
  BOSS_MUSIC_VOLUME,
  hasBossMusic,
  hasLevel1Music,
  hasLevel2Music,
  LEVEL_1_2_MUSIC_KEY,
  LEVEL_1_MUSIC_KEY,
  LEVEL_1_MUSIC_VOLUME,
  LEVEL_2_2_MUSIC_KEY,
  LEVEL_2_MUSIC_KEY,
  LEVEL_2_MUSIC_VOLUME,
  LevelMusicCycle,
  type LevelMusicHandle,
} from '../assets/musicAssets';
import { pruneEnemyMovementSfx, setCombatSfxPaused, stopAllCombatSfx } from '../assets/soundFxAssets';

export default class GameScene extends Phaser.Scene {
  player!: Player;
  enemies!: Phaser.GameObjects.Group;
  coins!: Phaser.GameObjects.Group;
  pickups!: Phaser.GameObjects.Group;
  projectiles!: Phaser.GameObjects.Group;
  playerProjectiles!: Phaser.GameObjects.Group;
  obstacles!: Phaser.GameObjects.Group;
  hud!: HUD;
  waveManager!: WaveManager;
  abilitySystem!: AbilitySystem;
  secondaryProjectileSystem!: SecondaryProjectileSystem;
  playerWalkingSfx!: PlayerWalkingSfx;
  powerUpManager!: PowerUpManager;
  levelIndex = 0;
  characterId: CharacterId = 'voidWarrior';
  paused = false;
  bossActive = false;
  levelTransitioning = false;
  inputManager!: InputManager;
  pauseOverlay!: Phaser.GameObjects.Container;
  levelCompleteBanner!: Phaser.GameObjects.Text;
  contactTimer = 0;
  confusedBumpTimer = 0;
  bossAuraDamageTimer = 0;
  arenaBoundsActive = false;
  levelExitActive = false;
  private gameEnding = false;
  private floorSprite?: Phaser.GameObjects.Image;
  private exitGateTarget?: Phaser.Math.Vector2;
  private bossMusic?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  private bossMusicVolumeTween?: Phaser.Tweens.Tween;
  private levelMusic?: LevelMusicHandle;
  private mobileControls?: MobileControls;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { characterId?: CharacterId; levelIndex?: number }): void {
    this.characterId = data.characterId ?? (this.registry.get('characterId') as CharacterId) ?? 'voidWarrior';
    this.levelIndex = data.levelIndex ?? (this.registry.get('levelIndex') as number) ?? 0;
    this.bossActive = false;
    this.levelTransitioning = false;
    this.levelExitActive = false;
    this.gameEnding = false;
    this.paused = false;
    this.registry.set('characterId', this.characterId);
    this.registry.set('levelIndex', this.levelIndex);
  }

  create(): void {
    const level = getLevel(this.levelIndex);
    this.time.timeScale = 1;
    this.physics.resume();
    this.physics.world.setBounds(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.width, PLAY_AREA.height);

    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
    }
    this.game.canvas.focus();

    this.drawArena(level);
    createScreenCornerVignette(this);
    const fullscreenPos = isMobileTouchDevice()
      ? { x: GAME_WIDTH - 14 - 66, y: 14 + 17 }
      : getFullscreenButtonBottomRightPosition();
    mountFullscreenButton(this, fullscreenPos.x, fullscreenPos.y);

    this.enemies = this.add.group();
    this.coins = this.add.group();
    this.pickups = this.add.group();
    this.projectiles = this.add.group();
    this.playerProjectiles = this.add.group();
    this.obstacles = this.add.group();
    this.arenaBoundsActive = hasFloorTexture(this, level.id, 'play');
    if (this.arenaBoundsActive) {
      buildOctagonArenaWalls(this, this.obstacles);
    }

    const charConfig = getCharacter(this.characterId);
    this.player = new Player(this, PLAY_AREA.centerX, PLAY_AREA.centerY, charConfig);

    if (this.levelIndex > 0) {
      const savedScore = this.registry.get('runScore') as number | undefined;
      const savedCoins = this.registry.get('runCoins') as number | undefined;
      if (savedScore !== undefined) this.player.score = savedScore;
      if (savedCoins !== undefined) this.player.coins = savedCoins;
    }

    this.abilitySystem = new AbilitySystem(this, (enemy) => this.handleEnemyKill(enemy));
    this.secondaryProjectileSystem = new SecondaryProjectileSystem(
      this,
      this.playerProjectiles,
      (enemy) => this.handleEnemyKill(enemy),
    );
    this.playerWalkingSfx = new PlayerWalkingSfx(this);
    this.powerUpManager = new PowerUpManager(this, (enemy) => this.handleEnemyKill(enemy));

    this.waveManager = new WaveManager(this, level.waves.length);
    this.waveManager.onWaveComplete = () => this.onWaveComplete();
    this.waveManager.onWaveFailed = () => {
      if (this.bossActive || this.levelTransitioning || this.levelExitActive || this.gameEnding) return;
      this.gameOver();
    };
    this.waveManager.onAllWavesComplete = () => this.startBoss();

    this.hud = new HUD(this, () => this.togglePause());

    this.inputManager = new InputManager(this);
    if (isMobileTouchDevice()) {
      this.mobileControls = new MobileControls(this, this.characterId);
      this.inputManager.setMobileControls(this.mobileControls);
      this.input.once('pointerdown', () => {
        void tryLockLandscape();
      });
    }

    this.setupCollisions();
    this.createPauseOverlay();

    this.levelCompleteBanner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontSize: '52px',
        color: '#ffc857',
        fontFamily: UI_FONTS.headline,
        fontStyle: 'bold',
        stroke: '#4a1a6b',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);

    this.spawnWave();
    this.startLevelMusic();
  }

  private drawArena(level: LevelConfig): void {
    if (hasFloorTexture(this, level.id, 'play')) {
      const floorKey = getFloorTextureKey(level.id, 'play');
      const floor = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, floorKey);
      floor.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      floor.setDepth(0);
      this.floorSprite = floor;
    } else {
      const g = this.add.graphics();
      g.fillStyle(level.floorColor, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.setDepth(0);
    }

  }

  shutdown(): void {
    this.stopAllGameAudio();
    this.abilitySystem?.cancelActiveEffects(this.player);
    this.time.removeAllEvents();
    this.time.timeScale = 1;
    this.physics.resume();
    this.tweens.resumeAll();
    this.playerProjectiles?.getChildren().forEach((p) => p.destroy());
    this.projectiles?.getChildren().forEach((p) => p.destroy());
  }

  private stopAllGameAudio(): void {
    this.stopBossMusic();
    this.stopLevelMusic();
    stopAllCombatSfx(this);
    this.abilitySystem?.stopExplosionSfx();
    this.playerWalkingSfx?.stop();
  }

  private exitToMainMenu(): void {
    this.paused = false;
    this.pauseOverlay?.setVisible(false);
    this.time.timeScale = 1;
    this.physics.resume();
    this.tweens.resumeAll();
    this.stopAllGameAudio();
    this.abilitySystem?.cancelActiveEffects(this.player);
    this.scene.start('MainMenuScene');
  }

  private clampEntity(sprite: Parameters<typeof clampSpriteToWorld>[0]): void {
    if (this.arenaBoundsActive) return;
    clampSpriteToWorld(sprite);
  }

  private handleEnemyKill(enemy: Enemy): void {
    if (this.levelTransitioning || this.levelExitActive || this.gameEnding) return;
    this.onEnemyKilled(enemy);
  }

  private isCombatSuspended(): boolean {
    return this.gameEnding || this.levelTransitioning || this.levelExitActive;
  }

  private resolveConfusedEnemyCombat(delta: number): void {
    const enemies = [...this.enemies.getChildren()] as Enemy[];

    for (const attacker of enemies) {
      if (!attacker.active || attacker.isDead || !attacker.isConfused()) continue;
      attacker.tickConfusedCombat(delta);

      for (const victim of enemies) {
        if (victim === attacker || !victim.active || victim.isDead) continue;

        const reach = attacker.getHurtRadius() + victim.getHurtRadius();
        if (Phaser.Math.Distance.Between(attacker.x, attacker.y, victim.x, victim.y) >= reach) {
          continue;
        }
        if (!attacker.canConfusedHit()) continue;

        attacker.markConfusedHit();
        const dmg = Math.max(1, Math.round(attacker.contactDamage * 0.75));
        if (victim.takeDamage(dmg)) {
          this.handleEnemyKill(victim);
        }
      }
    }
  }

  private applyCombatDamage(delta: number): void {
    if (this.gameEnding) return;

    const attackDamage = this.player.damage * 0.05 * (delta / 16.67);
    const enemies = [...this.enemies.getChildren()] as Enemy[];

    for (const enemy of enemies) {
      if (!enemy.active || enemy.isDead) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const touchReach = this.player.bodyRadius + enemy.getHurtRadius();

      if (dist < touchReach && enemy.isConfused()) {
        if (this.confusedBumpTimer <= 0) {
          const bumpDamage = Math.max(10, this.player.damage);
          if (enemy.takeDamage(bumpDamage)) {
            this.handleEnemyKill(enemy);
          }
          this.confusedBumpTimer = 320;
        }
      } else if (dist < touchReach && this.contactTimer <= 0) {
        const contactDmg = enemy.isBoss ? 1 : enemy.contactDamage;
        if (this.player.takeDamage(contactDmg)) {
          this.gameOver();
          return;
        }
        this.contactTimer = enemy.isBoss ? 1000 : 500;
      }

      const attackReach = this.player.auraRadius + enemy.getHurtRadius();
      if (dist < attackReach && attackDamage > 0) {
        if (enemy.isBoss) {
          this.bossAuraDamageTimer -= delta;
          if (this.bossAuraDamageTimer <= 0) {
            if (enemy.takeDamage(10)) {
              this.handleEnemyKill(enemy);
            }
            this.bossAuraDamageTimer = 700;
          }
        } else if (enemy.takeDamage(attackDamage)) {
          this.handleEnemyKill(enemy);
        }
      }
    }
  }

  private setupObstacleCollisions(): void {
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.player, this.coins, (_p, c) => {
      if (this.isCombatSuspended()) return;
      const coin = c as Coin;
      this.player.addCoins(coin.value);
      coin.destroy();
    });

    this.physics.add.overlap(this.player, this.pickups, (_p, pu) => {
      if (this.isCombatSuspended()) return;
      const pickup = pu as Pickup;
      this.powerUpManager.apply(pickup.powerUpType, this.player, this.enemies);
      pickup.destroy();
    });

    this.physics.add.overlap(this.player, this.projectiles, (_p, pr) => {
      if (this.isCombatSuspended()) return;
      const proj = pr as Projectile;
      if (this.player.takeDamage(proj.damage)) this.gameOver();
      proj.destroy();
    });

    this.setupObstacleCollisions();
  }

  spawnWave(): void {
    if (this.bossActive) return;
    const level = getLevel(this.levelIndex);
    const wave = level.waves[this.waveManager.currentWave];
    if (!wave) return;

    this.waveManager.startWave(wave.durationSec);
    let spawned = 0;
    wave.enemies.forEach(({ type, count }) => {
      for (let i = 0; i < count && spawned < 15; i++) {
        this.spawnEnemy(type);
        spawned++;
      }
    });
    this.waveManager.registerSpawn(spawned);
  }

  spawnEnemy(type: EnemyType): void {
    const level = getLevel(this.levelIndex);
    const enemyScale = level.enemyScale ?? 1;
    const spriteCfg = getEnemySpriteConfig(type);
    const estW = (spriteCfg?.frameWidth ?? 32) * (spriteCfg?.displayScale ?? 1) * enemyScale;
    const estH = (spriteCfg?.frameHeight ?? 32) * (spriteCfg?.displayScale ?? 1) * enemyScale;
    let x = PLAY_AREA.centerX;
    let y = PLAY_AREA.centerY;

    if (this.arenaBoundsActive) {
      const spawnRadius = Math.max(estW, estH) * 0.5 + 20;
      const spawn = randomPointNearArenaWall(spawnRadius);
      x = spawn.x;
      y = spawn.y;
    } else {
      const edge = Phaser.Math.Between(0, 3);
      const { minX, maxX, minY, maxY } = spawnMargins(estW, estH);
      if (edge === 0) {
        x = Phaser.Math.Between(minX, maxX);
        y = minY;
      } else if (edge === 1) {
        x = Phaser.Math.Between(minX, maxX);
        y = maxY;
      } else if (edge === 2) {
        x = minX;
        y = Phaser.Math.Between(minY, maxY);
      } else {
        x = maxX;
        y = Phaser.Math.Between(minY, maxY);
      }
    }

    const enemy = new Enemy(this, x, y, type);
    if (enemyScale !== 1) {
      enemy.setScale(enemy.scaleX * enemyScale);
    }
    this.clampEntity(enemy);
    this.enemies.add(enemy);
  }

  spawnProjectile(x: number, y: number, tx: number, ty: number): void {
    const options = this.levelIndex >= 1 ? getSlimeBallProjectileOptions(this) : undefined;
    const proj = new Projectile(this, x, y, options);
    proj.fire(tx, ty);
    this.projectiles.add(proj);
  }

  onEnemyKilled(enemy: Enemy): void {
    if (!enemy.active || this.levelTransitioning || this.levelExitActive || this.gameEnding) return;

    const wasBoss = enemy.isBoss;
    this.player.addScore(enemy.scoreValue);
    if (wasBoss) {
      this.waveManager.waveActive = false;
      this.waveManager.enemiesRemaining = 0;
    } else {
      this.waveManager.enemyKilled();
    }

    if (!wasBoss) {
      const coin = new Coin(this, enemy.x, enemy.y, rollCoinValue());
      this.coins.add(coin);
      if (Math.random() < 0.15) {
        const coin2 = new Coin(
          this,
          enemy.x + Phaser.Math.Between(-12, 12),
          enemy.y + Phaser.Math.Between(-12, 12),
          rollCoinValue(),
        );
        this.coins.add(coin2);
      }
      if (Math.random() < POWERUP_KILL_DROP_CHANCE) {
        const types = Object.keys(POWERUPS);
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        const pickup = new Pickup(this, enemy.x, enemy.y, type);
        this.pickups.add(pickup);
      }
    }

    enemy.destroy();
    pruneEnemyMovementSfx(this, this.enemies);

    if (wasBoss) {
      this.time.delayedCall(0, () => {
        if (!this.levelTransitioning && !this.levelExitActive) {
          this.onBossDefeated();
        }
      });
    }
  }

  onWaveComplete(): void {
    if (Math.random() < POWERUP_DROP_CHANCE) {
      const types = Object.keys(POWERUPS);
      const type = types[Phaser.Math.Between(0, types.length - 1)];
      const pickup = new Pickup(this, this.player.x + Phaser.Math.Between(-50, 50), this.player.y + Phaser.Math.Between(-50, 50), type);
      this.pickups.add(pickup);
    }

    this.time.delayedCall(2000, () => {
      if (
        this.levelTransitioning ||
        this.bossActive ||
        this.waveManager.currentWave >= getLevel(this.levelIndex).waves.length
      ) {
        return;
      }
      this.spawnWave();
    });
  }

  startBoss(): void {
    if (this.bossActive) return;
    this.bossActive = true;

    stopAllCombatSfx(this);
    [...this.enemies.getChildren()].forEach((e) => {
      const enemy = e as Enemy;
      if (!enemy.isBoss && enemy.active) enemy.destroy();
    });

    this.levelCompleteBanner.setText('BOSS INCOMING!').setVisible(true);
    this.time.delayedCall(0, () => {
      if (this.levelTransitioning || !this.bossActive) return;
      this.stopLevelMusic();
      this.playBossMusic();
    });
    this.time.delayedCall(BOSS_MUSIC_INTRO_MS, () => {
      if (this.levelTransitioning || !this.bossActive) return;
      this.levelCompleteBanner.setVisible(false);
      const boss = new Enemy(this, PLAY_AREA.centerX, PLAY_AREA.centerY - 80, getBossIdForLevel(this.levelIndex));
      const bossHp = getBossHp(this.levelIndex);
      boss.hp = bossHp;
      boss.maxHp = bossHp;
      boss.updateHealthBar();
      this.clampEntity(boss);
      this.enemies.add(boss);
      this.waveManager.enemiesRemaining = 1;
    });
  }

  bossCharge(boss: Enemy, target: Player): void {
    if (!boss.active) return;
    this.physics.moveToObject(boss, target, 350);
    this.time.delayedCall(800, () => {
      if (boss.active) boss.setVelocity(0, 0);
    });
  }

  bossRadialBurst(boss: Enemy): void {
    let projectileOptions: ProjectileOptions | undefined;

    if (this.levelIndex === 0 && this.textures.exists(BOSS_PUMPKIN_PROJECTILE.textureKey)) {
      projectileOptions = {
        textureKey: BOSS_PUMPKIN_PROJECTILE.textureKey,
        displayScale: BOSS_PUMPKIN_PROJECTILE.displayScale,
        hitRadius: BOSS_PUMPKIN_PROJECTILE.hitRadius,
      };
    } else if (this.levelIndex >= 1) {
      projectileOptions = getSlimeBallProjectileOptions(this);
    }

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const proj = new Projectile(this, boss.x, boss.y, projectileOptions);
      proj.fireAtAngle(angle, 200);
      this.projectiles.add(proj);
    }
  }

  update(_time: number, delta: number): void {
    this.inputManager.update();

    if (this.inputManager.isPauseJustPressed()) {
      if (!this.levelTransitioning) {
        this.setPaused(!this.paused);
      }
      return;
    }

    if (this.paused) return;

    if (this.levelTransitioning || this.gameEnding) return;

    if (this.levelExitActive) {
      this.updateLevelExit(delta);
      return;
    }

    const movement = this.inputManager.lastMovement;

    if (this.inputManager.isAbilityJustPressed()) {
      this.abilitySystem.useAbility(this.player, this.enemies, movement);
    }

    if (this.inputManager.isSecondaryProjectileJustPressed()) {
      this.secondaryProjectileSystem.fire(this.player, movement);
    }

    this.contactTimer -= delta;
    this.confusedBumpTimer -= delta;
    this.player.updateMovement(movement);
    if (this.player.isDashing) {
      this.player.updateVisuals(movement);
    }
    this.playerWalkingSfx.update(this.player, movement, true);
    this.waveManager.update(delta / 1000);
    this.hud.update(this.player, this.waveManager, getLevel(this.levelIndex).name, this.levelIndex);

    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.isDead) return;
      enemy.updateAI(this.player, this.obstacles, this.enemies);
      this.clampEntity(enemy);
    });

    this.resolveConfusedEnemyCombat(delta);

    this.clampEntity(this.player);

    this.applyCombatDamage(delta);

    this.secondaryProjectileSystem.update(this.enemies);

    if (this.player.coinMagnetActive) {
      this.coins.getChildren().forEach((c) => {
        const coin = c as Coin;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y) < 120) {
          this.physics.moveToObject(coin, this.player, 300);
        }
        this.clampEntity(coin);
      });
    }

  }

  onBossDefeated(): void {
    if (this.levelTransitioning || this.levelExitActive) return;

    this.stopBossMusic();
    stopAllCombatSfx(this);
    this.bossActive = false;
    this.waveManager.waveActive = false;
    this.waveManager.enemiesRemaining = 0;

    if (this.paused) {
      this.setPaused(false);
    }
    this.time.timeScale = 1;
    this.physics.resume();
    this.tweens.resumeAll();

    this.abilitySystem.cancelActiveEffects(this.player);
    this.playerWalkingSfx.stop();
    this.player.setVelocity(0, 0);
    [...this.enemies.getChildren()].forEach((e) => {
      const minion = e as Enemy;
      if (minion.active) minion.destroy();
    });
    [...this.playerProjectiles.getChildren()].forEach((p) => p.destroy());
    [...this.projectiles.getChildren()].forEach((p) => p.destroy());

    this.levelExitActive = true;
    this.revealExitFloor();
    this.exitGateTarget = new Phaser.Math.Vector2(getArenaExitGatePosition().x, getArenaExitGatePosition().y);

    const isFinalLevel = this.levelIndex >= LEVELS.length - 1;
    this.levelCompleteBanner
      .setText(isFinalLevel ? 'YOU WIN!' : 'LEVEL COMPLETE!')
      .setVisible(true);
  }

  private revealExitFloor(): void {
    const level = getLevel(this.levelIndex);
    if (!hasFloorTexture(this, level.id, 'exit')) return;

    const exitFloor = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, getFloorTextureKey(level.id, 'exit'));
    exitFloor.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    exitFloor.setDepth(1);
    exitFloor.setAlpha(0);
    this.tweens.add({
      targets: exitFloor,
      alpha: 1,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.floorSprite?.destroy();
        this.floorSprite = exitFloor;
      },
    });
  }

  private updateLevelExit(_delta: number): void {
    if (!this.exitGateTarget) return;

    const target = this.exitGateTarget;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);

    if (dist < 16) {
      this.finishLevelExit();
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const walk = { x: Math.cos(angle), y: Math.sin(angle) };
    this.player.setVelocity(walk.x * this.player.moveSpeed, walk.y * this.player.moveSpeed);
    this.player.updateVisuals(walk);
    this.playerWalkingSfx.update(this.player, walk, true);
    this.hud.update(this.player, this.waveManager, getLevel(this.levelIndex).name, this.levelIndex);
  }

  private finishLevelExit(): void {
    if (this.levelTransitioning || this.gameEnding) return;

    this.levelExitActive = false;
    this.playerWalkingSfx.stop();
    this.player.setVelocity(0, 0);
    this.exitGateTarget = undefined;

    const isFinalLevel = this.levelIndex >= LEVELS.length - 1;

    if (!isFinalLevel) {
      this.levelTransitioning = true;
      this.registry.set('runScore', this.player.score);
      this.registry.set('runCoins', this.player.coins);
      this.registry.set('characterId', this.characterId);

      const fadeOut = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
        .setDepth(400);

      this.tweens.add({
        targets: fadeOut,
        alpha: 1,
        duration: 350,
        ease: 'Cubic.easeIn',
        onComplete: () => this.goToNextLevel(),
      });
      return;
    }

    this.registry.remove('runScore');
    this.registry.remove('runCoins');
    this.time.delayedCall(800, () => this.gameOver(true));
  }

  private goToNextLevel(): void {
    const nextLevelIndex = this.levelIndex + 1;
    const level2Select = {
      levelIndex: nextLevelIndex,
      continueRun: true,
    };

    if (this.levelIndex === 0) {
      this.scene.start('CharacterSelectScene', level2Select);
      return;
    }

    this.scene.start('GameScene', {
      characterId: this.characterId,
      levelIndex: nextLevelIndex,
    });
  }

  gameOver(won = false): void {
    if (this.gameEnding) return;
    if (this.levelTransitioning && !won) return;
    this.gameEnding = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Enemy;
      enemy.setVelocity(0, 0);
    });
    this.stopAllGameAudio();
    this.abilitySystem.cancelActiveEffects(this.player);
    this.time.delayedCall(0, () => {
      if (!this.scene.isActive()) return;
      this.scene.start('GameOverScene', {
        score: this.player.score,
        coins: this.player.coins,
        characterId: this.characterId,
        levelIndex: this.levelIndex,
        won,
      });
    });
  }

  togglePause(): void {
    this.setPaused(!this.paused);
  }

  private setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.pauseOverlay.setVisible(paused);
    this.hud.setPauseButtonVisible(!paused);

    if (paused) {
      this.player.setVelocity(0, 0);
      this.enemies.getChildren().forEach((e) => {
        const enemy = e as Enemy;
        enemy.setVelocity(0, 0);
      });
      this.physics.pause();
      this.tweens.pauseAll();
      this.time.timeScale = 0;
      this.bossMusic?.pause();
      this.levelMusic?.pause();
      this.abilitySystem.pauseExplosionSfx(true);
      this.playerWalkingSfx.setPaused(true);
      setCombatSfxPaused(this, true);
      this.mobileControls?.setEnabled(false);
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
      this.time.timeScale = 1;
      if (this.bossMusic?.isPaused) {
        this.bossMusic.resume();
      }
      this.levelMusic?.resume();
      this.abilitySystem.pauseExplosionSfx(false);
      this.playerWalkingSfx.setPaused(false);
      setCombatSfxPaused(this, false);
      this.mobileControls?.setEnabled(true);
    }
  }

  private playBossMusic(): void {
    if (!hasBossMusic(this)) return;

    this.stopBossMusic();
    const music = this.sound.add(BOSS_MUSIC_KEY, { loop: false, volume: BOSS_MUSIC_INTRO_VOLUME });
    this.bossMusic = music as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
    music.play({ seek: BOSS_MUSIC_START_SEC });

    const volume = { value: BOSS_MUSIC_INTRO_VOLUME };
    this.bossMusicVolumeTween = this.tweens.add({
      targets: volume,
      value: BOSS_MUSIC_VOLUME,
      duration: BOSS_MUSIC_INTRO_MS,
      ease: 'Cubic.easeIn',
      onUpdate: () => {
        if (music.isPlaying || music.isPaused) {
          music.setVolume(volume.value);
        }
      },
      onComplete: () => {
        music.setVolume(BOSS_MUSIC_VOLUME);
        this.bossMusicVolumeTween = undefined;
      },
    });
  }

  private stopBossMusic(): void {
    this.bossMusicVolumeTween?.stop();
    this.bossMusicVolumeTween = undefined;
    if (!this.bossMusic) return;
    if (this.bossMusic.isPlaying || this.bossMusic.isPaused) {
      this.bossMusic.stop();
    }
    this.bossMusic.destroy();
    this.bossMusic = undefined;
  }

  private startLevelMusic(): void {
    if (this.levelIndex === 0 && hasLevel1Music(this)) {
      this.levelMusic = new LevelMusicCycle(
        this,
        LEVEL_1_MUSIC_KEY,
        LEVEL_1_2_MUSIC_KEY,
        LEVEL_1_MUSIC_VOLUME,
      );
      this.levelMusic.start();
      return;
    }
    if (this.levelIndex === 1 && hasLevel2Music(this)) {
      this.levelMusic = new LevelMusicCycle(
        this,
        LEVEL_2_MUSIC_KEY,
        LEVEL_2_2_MUSIC_KEY,
        LEVEL_2_MUSIC_VOLUME,
      );
      this.levelMusic.start();
    }
  }

  private stopLevelMusic(): void {
    this.levelMusic?.stop();
    this.levelMusic = undefined;
  }

  private createPauseOverlay(): void {
    this.pauseOverlay = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(500)
      .setVisible(false);

    const blocker = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setScrollFactor(0)
      .setInteractive();

    const panel = this.add.graphics().setScrollFactor(0);
    panel.fillStyle(0x140a24, 0.95);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 120, 400, 240, 20);
    panel.lineStyle(2, 0x7b4bb8, 1);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 120, 400, 240, 20);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'PAUSED', {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: '36px',
        color: '#ffc857',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const resumeBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5, '▶  RESUME', {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: '20px',
        color: '#2ed573',
        fontStyle: 'bold',
        backgroundColor: '#1e1030',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerover', () => resumeBtn.setColor('#ffc857'));
    resumeBtn.on('pointerout', () => resumeBtn.setColor('#2ed573'));
    resumeBtn.on('pointerdown', () => this.setPaused(false));

    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 45, 'ESC / P / START', {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: '13px',
        color: '#8a7aa8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const quit = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'QUIT TO MENU', {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: '16px',
        color: '#ff4757',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    quit.on('pointerover', () => quit.setColor('#ffc857'));
    quit.on('pointerout', () => quit.setColor('#ff4757'));
    quit.on('pointerdown', () => this.exitToMainMenu());

    blocker.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev?: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation();
    });

    this.pauseOverlay.add([blocker, panel, title, resumeBtn, hint, quit]);
  }
}
