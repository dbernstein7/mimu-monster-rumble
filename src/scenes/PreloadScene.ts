import Phaser from 'phaser';
import { CHARACTERS } from '../config/characters';
import { ENEMIES, BOSS_CONFIG } from '../config/enemies';
import { POWERUPS } from '../config/powerups';
import { loadAttackTextures, registerAttackAnimations } from '../assets/attackAssets';
import { loadCoinTextures } from '../assets/coinAssets';
import {
  configureCharacterSelectCardTextures,
  loadCharacterSelectCards,
} from '../assets/characterSelectAssets';
import { loadFloorTextures } from '../assets/floorTextures';
import { loadBoss2SlimeBallTextures } from '../assets/bossProjectileAssets';
import { loadBossMusic, loadLevelMusic, warmUpBossMusic } from '../assets/musicAssets';
import { loadSoundEffects } from '../assets/soundFxAssets';
import { configureUiTextures, loadUiTextures } from '../assets/uiAssets';
import { loadPowerUpTextures } from '../assets/powerUpAssets';
import { CHARACTER_SPRITES } from '../config/playerSprites';
import { loadEnemySprites, registerEnemyAnimations } from '../systems/EnemyAnimation';
import { loadCharacterSprites, registerCharacterAnimations } from '../systems/PlayerAnimation';
import { ENEMY_SPRITES } from '../config/enemySprites';
import type { CharacterId, EnemyType } from '../types/game';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.scale;
    const barWidth = Math.min(420, width * 0.6);
    const barHeight = 18;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 20;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x2a1a4e, 0.9);
    progressBox.fillRoundedRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8, 6);

    const progressBar = this.add.graphics();
    const loadingText = this.add
      .text(width / 2, barY - 28, 'Loading…', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#ffc857',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffc857, 1);
      progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 4);
      loadingText.setText(`Loading… ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    loadFloorTextures(this);
    loadCharacterSelectCards(this);
    loadAttackTextures(this);
    loadPowerUpTextures(this);
    loadCoinTextures(this);
    loadBossMusic(this);
    loadLevelMusic(this);
    loadSoundEffects(this);
    loadBoss2SlimeBallTextures(this);
    loadUiTextures(this);
    (Object.keys(CHARACTER_SPRITES) as CharacterId[]).forEach((id) => {
      loadCharacterSprites(this, id);
    });
    (Object.keys(ENEMY_SPRITES) as EnemyType[]).forEach((type) => {
      loadEnemySprites(this, type);
    });
    loadEnemySprites(this, 'boss');
    loadEnemySprites(this, 'boss2');
  }

  create(): void {
    (Object.keys(CHARACTER_SPRITES) as CharacterId[]).forEach((id) => {
      registerCharacterAnimations(this, id);
    });
    (Object.keys(ENEMY_SPRITES) as EnemyType[]).forEach((type) => {
      registerEnemyAnimations(this, type);
    });
    registerEnemyAnimations(this, 'boss');
    registerEnemyAnimations(this, 'boss2');
    registerAttackAnimations(this);
    configureCharacterSelectCardTextures(this);
    configureUiTextures(this);
    this.generateTextures();
    warmUpBossMusic(this);
    document.getElementById('boot-loader')?.classList.add('hidden');
    this.scene.start('MainMenuScene');
  }

  private generateTextures(): void {
    CHARACTERS.forEach((c) => {
      if (this.anims.exists(`${c.id}_run`)) return;
      if (this.textures.exists(`${c.id}_run_0`) || this.textures.exists(`${c.id}_run_sheet`)) return;

      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(c.color, 1);
      g.fillCircle(16, 16, 16);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(16, 16, 16);
      g.generateTexture(`player_${c.id}`, 32, 32);
      g.destroy();
    });

    Object.values(ENEMIES).forEach((e) => {
      if (this.textures.exists(`${e.type}_run_0`)) return;

      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(e.color, 1);
      g.fillCircle(e.radius, e.radius, e.radius);
      g.generateTexture(`enemy_${e.type}`, e.radius * 2, e.radius * 2);
      g.destroy();
    });

    if (!this.textures.exists('boss_run_0')) {
      const bossG = this.make.graphics({ x: 0, y: 0 });
      bossG.fillStyle(BOSS_CONFIG.color, 1);
      bossG.fillCircle(40, 40, 38);
      bossG.lineStyle(4, 0xffd700, 1);
      bossG.strokeCircle(40, 40, 38);
      bossG.fillStyle(0xff0000, 1);
      bossG.fillCircle(28, 30, 6);
      bossG.fillCircle(52, 30, 6);
      bossG.generateTexture('boss', 80, 80);
      bossG.destroy();
    }

    Object.entries(POWERUPS).forEach(([key, p]) => {
      if (this.textures.exists(`powerup_${key}`)) return;

      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(p.color, 1);
      g.fillRect(2, 2, 20, 20);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(2, 2, 20, 20);
      g.generateTexture(`powerup_${key}`, 24, 24);
      g.destroy();
    });

    if (!this.textures.exists('coin_1')) {
      const coinG = this.make.graphics({ x: 0, y: 0 });
      coinG.fillStyle(0xf1c40f, 1);
      coinG.fillCircle(8, 8, 8);
      coinG.generateTexture('coin', 16, 16);
      coinG.destroy();
    }

    const projG = this.make.graphics({ x: 0, y: 0 });
    projG.fillStyle(0x9b59b6, 1);
    projG.fillCircle(6, 6, 6);
    projG.generateTexture('projectile', 12, 12);
    projG.destroy();

    const playerProjDefs: [string, number, number][] = [
      ['player_proj_void', 14, 0x9b59b6],
      ['player_proj_chaos', 16, 0x2ecc71],
      ['player_proj_fire', 28, 0xe74c3c],
    ];
    playerProjDefs.push(['player_proj_frost', 9, 0x85c1e9]);
    playerProjDefs.forEach(([key, radius, color]) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(color, 1);
      g.fillCircle(radius, radius, radius);
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokeCircle(radius, radius, radius - 1);
      g.generateTexture(key, radius * 2, radius * 2);
      g.destroy();
    });
  }
}
