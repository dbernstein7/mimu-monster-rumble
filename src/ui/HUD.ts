import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { WaveManager } from '../systems/GameSystems';
import { hasPowerUpTexture } from '../assets/powerUpAssets';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import type { CharacterId } from '../types/game';
import {
  applyAttackIconSizing,
  getPrimaryAbilityTextureKey,
  getSecondaryAbilityTextureKey,
} from '../config/characterAttacks';
import { getSecondaryProjectileConfig } from '../config/secondaryProjectiles';
import {
  UI_COLORS,
  UI_FONTS,
  drawProgressBar,
  formatScore,
  createIconButton,
} from './theme';
import { isMobileTouchDevice } from '../utils/device';
import { getMobileGameUiInsets } from '../utils/mobileLayout';

const HUD_TEXT_STROKE = { stroke: '#0d0618', strokeThickness: 4 };

export class HUD {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  private readonly hideMobilePowerHud = isMobileTouchDevice();
  private mobileUiInset: ReturnType<typeof getMobileGameUiInsets> | null = null;
  progressGfx!: Phaser.GameObjects.Graphics;
  abilityGfx!: Phaser.GameObjects.Graphics;
  secondaryGfx!: Phaser.GameObjects.Graphics;

  scoreLabel!: Phaser.GameObjects.Text;
  scoreValue!: Phaser.GameObjects.Text;
  coinValue!: Phaser.GameObjects.Text;
  waveBadge!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  heartsGfx!: Phaser.GameObjects.Graphics;
  lifeIcons: Phaser.GameObjects.Image[] = [];
  abilityIcon!: Phaser.GameObjects.Image;
  abilityName!: Phaser.GameObjects.Text;
  abilityStatus!: Phaser.GameObjects.Text;
  secondaryIcon!: Phaser.GameObjects.Image;
  secondaryName!: Phaser.GameObjects.Text;
  secondaryStatus!: Phaser.GameObjects.Text;
  progressLabel!: Phaser.GameObjects.Text;
  pauseBtn!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onPause: () => void) {
    this.scene = scene;
    if (isMobileTouchDevice()) {
      this.mobileUiInset = getMobileGameUiInsets(scene);
    }
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    this.progressGfx = scene.add.graphics();
    this.abilityGfx = scene.add.graphics();
    this.secondaryGfx = scene.add.graphics();
    this.heartsGfx = scene.add.graphics();

    this.scoreLabel = scene.add.text(28, 22, 'SCORE', {
      fontFamily: UI_FONTS.body,
      fontSize: '11px',
      color: '#8a7aa8',
      fontStyle: 'bold',
      ...HUD_TEXT_STROKE,
    });
    this.scoreValue = scene.add.text(28, 38, '0', {
      fontFamily: UI_FONTS.body,
      fontSize: '24px',
      color: '#f5f0ff',
      fontStyle: 'bold',
      ...HUD_TEXT_STROKE,
    });

    this.coinValue = scene.add.text(160, 38, '◎ 0', {
      fontFamily: UI_FONTS.body,
      fontSize: '18px',
      color: '#ffd166',
      fontStyle: 'bold',
      stroke: '#0d0618',
      strokeThickness: 4,
    });

    this.waveBadge = scene.add
      .text(GAME_WIDTH / 2, 28, 'WAVE 1', {
        fontFamily: UI_FONTS.title,
        fontSize: '22px',
        color: '#ffc857',
        fontStyle: 'bold',
        stroke: '#0d0618',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0);

    this.timerText = scene.add
      .text(GAME_WIDTH / 2, 54, '45', {
        fontFamily: UI_FONTS.body,
        fontSize: '18px',
        color: '#5dffe0',
        fontStyle: 'bold',
        ...HUD_TEXT_STROKE,
      })
      .setOrigin(0.5, 0);

    this.abilityIcon = scene.add
      .image(200, GAME_HEIGHT - 38, 'attack_voidSlam')
      .setOrigin(0.5)
      .setVisible(false);

    this.abilityName = scene.add.text(28, GAME_HEIGHT - 48, 'VOID SLAM', {
      fontFamily: UI_FONTS.body,
      fontSize: '14px',
      color: '#c9b8e8',
      fontStyle: 'bold',
      ...HUD_TEXT_STROKE,
    });
    this.abilityStatus = scene.add.text(28, GAME_HEIGHT - 30, 'READY', {
      fontFamily: UI_FONTS.body,
      fontSize: '12px',
      color: '#2ed573',
      fontStyle: 'bold',
      ...HUD_TEXT_STROKE,
    });

    this.secondaryIcon = scene.add
      .image(GAME_WIDTH - 320, GAME_HEIGHT - 38, 'player_proj_void')
      .setOrigin(0.5)
      .setVisible(false);

    this.secondaryName = scene.add.text(GAME_WIDTH - 280, GAME_HEIGHT - 48, '', {
      fontFamily: UI_FONTS.body,
      fontSize: '14px',
      color: '#c9b8e8',
      fontStyle: 'bold',
      ...HUD_TEXT_STROKE,
    }).setVisible(false);

    this.secondaryStatus = scene.add.text(GAME_WIDTH - 280, GAME_HEIGHT - 30, '', {
      fontFamily: UI_FONTS.body,
      fontSize: '12px',
      color: '#2ed573',
      fontStyle: 'bold',
      ...HUD_TEXT_STROKE,
    }).setVisible(false);

    this.progressLabel = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'Haunted Carnival', {
        fontFamily: UI_FONTS.body,
        fontSize: '13px',
        color: '#a89bc4',
        fontStyle: 'bold',
        ...HUD_TEXT_STROKE,
      })
      .setOrigin(0.5);

    this.pauseBtn = createIconButton(scene, GAME_WIDTH - 44, 46, 'II', onPause, 40);

    if (hasPowerUpTexture(scene, 'health')) {
      const lifeIconScale = 0.088;
      const lifeIconSpacing = 28;
      const lifeIconY = 46;
      const maxHp = 3;
      for (let i = 0; i < maxHp; i++) {
        const x = GAME_WIDTH - 100 - (maxHp - 1 - i) * lifeIconSpacing;
        const icon = scene.add.image(x, lifeIconY, 'powerup_health').setScale(lifeIconScale).setOrigin(0.5);
        this.lifeIcons.push(icon);
      }
    }

    if (isMobileTouchDevice()) {
      const inset = this.mobileUiInset ?? getMobileGameUiInsets(scene);
      const pauseX = inset.left + 24;
      const pauseY = inset.top + 24;
      this.pauseBtn.setPosition(pauseX, pauseY);
      this.scoreLabel.setPosition(inset.left + 52, inset.top + 8);
      this.scoreValue.setPosition(inset.left + 52, inset.top + 24);
      this.coinValue.setPosition(inset.left + 168, inset.top + 24);
      this.waveBadge.setY(inset.top + 14);
      this.timerText.setY(inset.top + 40);
      this.progressLabel.setY(GAME_HEIGHT - inset.bottom - 36);
      const lifeIconY = inset.top + 24;
      const lifeIconSpacing = 28;
      const maxHp = 3;
      for (let i = 0; i < this.lifeIcons.length; i++) {
        const x = GAME_WIDTH - inset.right - 24 - (maxHp - 1 - i) * lifeIconSpacing;
        this.lifeIcons[i].setPosition(x, lifeIconY);
      }
    }

    this.container.add([
      this.progressGfx,
      this.abilityGfx,
      this.secondaryGfx,
      this.heartsGfx,
      ...this.lifeIcons,
      this.scoreLabel,
      this.scoreValue,
      this.coinValue,
      this.waveBadge,
      this.timerText,
      this.abilityIcon,
      this.abilityName,
      this.abilityStatus,
      this.secondaryIcon,
      this.secondaryName,
      this.secondaryStatus,
      this.progressLabel,
      this.pauseBtn,
    ]);
  }

  update(player: Player, waveManager: WaveManager, levelName: string, levelIndex = 0): void {
    this.scoreValue.setText(formatScore(player.score));
    this.coinValue.setText(`◎ ${formatScore(player.coins)}`);
    this.waveBadge.setText(`WAVE ${waveManager.currentWave + 1}`);
    const secs = Math.ceil(Math.max(0, waveManager.waveTimer));
    this.timerText.setText(`${secs}s`);
    this.timerText.setColor(secs <= 10 ? '#ff6b81' : '#5dffe0');

    this.drawHearts(player.hp, player.maxHp);
    this.drawAbility(player);
    this.drawSecondaryProjectile(player, levelIndex);
    this.drawLevelProgress(waveManager.getProgress(), levelName);
  }

  private drawHearts(hp: number, maxHp: number): void {
    if (this.lifeIcons.length > 0) {
      this.heartsGfx.clear();
      this.lifeIcons.forEach((icon, i) => {
        if (i >= maxHp) {
          icon.setVisible(false);
          return;
        }
        icon.setVisible(true);
        const filled = i < hp;
        icon.setAlpha(filled ? 1 : 0.25);
        icon.setTint(filled ? 0xffffff : 0x555555);
      });
      return;
    }

    this.heartsGfx.clear();
    const startX = GAME_WIDTH - 36 - maxHp * 28;
    for (let i = 0; i < maxHp; i++) {
      const x = startX + i * 28;
      const filled = i < hp;
      this.heartsGfx.fillStyle(filled ? UI_COLORS.danger : 0x2a1450, filled ? 1 : 0.8);
      this.heartsGfx.fillCircle(x, 46, 10);
      this.heartsGfx.lineStyle(2, filled ? 0xff6b81 : UI_COLORS.panelBorder, 1);
      this.heartsGfx.strokeCircle(x, 46, 10);
      if (filled) {
        this.heartsGfx.fillStyle(0xffffff, 0.35);
        this.heartsGfx.fillCircle(x - 3, 43, 3);
      }
    }
  }

  private drawAbility(player: Player): void {
    this.abilityGfx.clear();
    if (this.hideMobilePowerHud) {
      this.abilityIcon.setVisible(false);
      this.abilityName.setVisible(false);
      this.abilityStatus.setVisible(false);
      return;
    }

    const cx = 200;
    const cy = GAME_HEIGHT - 38;
    const ready = player.canUseAbility();
    const progress = player.getAbilityCooldownProgress();

    this.abilityGfx.lineStyle(3, 0x2a1450, 0.85);
    this.abilityGfx.strokeCircle(cx, cy, 18);
    if (ready) {
      this.abilityGfx.fillStyle(UI_COLORS.success, 0.35);
      this.abilityGfx.fillCircle(cx, cy, 16);
      this.abilityGfx.lineStyle(2, UI_COLORS.success, 1);
      this.abilityGfx.strokeCircle(cx, cy, 16);
    } else {
      this.abilityGfx.lineStyle(4, UI_COLORS.gold, 1);
      this.abilityGfx.beginPath();
      this.abilityGfx.arc(cx, cy, 16, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * progress));
      this.abilityGfx.strokePath();
    }

    const primaryKey = getPrimaryAbilityTextureKey(this.scene, player.config.id);
    if (primaryKey) {
      this.abilityIcon.setTexture(primaryKey).setVisible(true);
      applyAttackIconSizing(this.abilityIcon, 28);
      this.abilityIcon.setAlpha(ready ? 1 : 0.45);
    } else {
      this.abilityIcon.setVisible(false);
    }

    this.abilityName.setText(player.config.abilityName.toUpperCase());
    this.abilityName.setX(230);
    if (ready) {
      this.abilityStatus.setText('READY  ·  SPACE / A');
      this.abilityStatus.setColor('#2ed573');
    } else {
      const sec = Math.ceil((player.abilityCooldownUntil - this.scene.time.now) / 1000);
      this.abilityStatus.setText(`COOLDOWN  ${sec}s`);
      this.abilityStatus.setColor('#8a7aa8');
    }
    this.abilityStatus.setX(230);
  }

  private drawSecondaryProjectile(player: Player, _levelIndex: number): void {
    this.secondaryGfx.clear();
    if (this.hideMobilePowerHud) {
      this.secondaryIcon.setVisible(false);
      this.secondaryName.setVisible(false);
      this.secondaryStatus.setVisible(false);
      return;
    }

    const show = true;
    this.secondaryName.setVisible(show);
    this.secondaryStatus.setVisible(show);
    if (!show) return;

    const cfg = getSecondaryProjectileConfig(player.config.id as CharacterId);
    const cx = GAME_WIDTH - 320;
    const cy = GAME_HEIGHT - 38;
    const ready = player.canUseSecondaryProjectile();
    const progress = player.getSecondaryCooldownProgress();

    this.secondaryGfx.lineStyle(3, 0x2a1450, 0.85);
    this.secondaryGfx.strokeCircle(cx, cy, 18);
    if (ready) {
      this.secondaryGfx.fillStyle(cfg.color, 0.4);
      this.secondaryGfx.fillCircle(cx, cy, 16);
      this.secondaryGfx.lineStyle(2, cfg.color, 1);
      this.secondaryGfx.strokeCircle(cx, cy, 16);
    } else {
      this.secondaryGfx.lineStyle(4, UI_COLORS.cyan, 1);
      this.secondaryGfx.beginPath();
      this.secondaryGfx.arc(cx, cy, 16, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * progress));
      this.secondaryGfx.strokePath();
    }

    const secondaryKey = getSecondaryAbilityTextureKey(this.scene, player.config.id);
    if (secondaryKey) {
      this.secondaryIcon.setTexture(secondaryKey).setVisible(true);
      applyAttackIconSizing(this.secondaryIcon, 28);
      this.secondaryIcon.setAlpha(ready ? 1 : 0.45);
    } else {
      this.secondaryIcon.setVisible(false);
    }

    this.secondaryName.setText(cfg.name.toUpperCase());
    this.secondaryName.setX(GAME_WIDTH - 288);
    this.secondaryStatus.setX(GAME_WIDTH - 288);
    if (ready) {
      this.secondaryStatus.setText('READY  ·  Q / RT');
      this.secondaryStatus.setColor('#2ed573');
    } else {
      const sec = Math.ceil((player.secondaryCooldownUntil - this.scene.time.now) / 1000);
      this.secondaryStatus.setText(`COOLDOWN  ${sec}s`);
      this.secondaryStatus.setColor('#8a7aa8');
    }
  }

  private drawLevelProgress(progress: number, levelName: string): void {
    this.progressGfx.clear();
    const barW = 340;
    const barH = 8;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const inset = this.mobileUiInset;
    const barY = inset ? GAME_HEIGHT - inset.bottom - 14 : GAME_HEIGHT - 22;
    drawProgressBar(this.progressGfx, barX, barY, barW, barH, progress, UI_COLORS.orange);
    this.progressLabel.setText(`${levelName}  ·  ${Math.round(progress * 100)}%`);
  }

  setPauseButtonVisible(visible: boolean): void {
    this.pauseBtn.setVisible(visible);
  }
}
