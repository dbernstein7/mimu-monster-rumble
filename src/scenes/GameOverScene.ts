import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getLevel } from '../config/levels';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { getCurrentUser, submitScore, type ScoreSaveTarget } from '../services/firebase';
import { bankRunCoins } from '../services/userProfile';
import {
  hasLeaderboardButtonTexture,
  LEADERBOARD_BUTTON_TEXTURE_KEY,
  MAIN_MENU_BUTTON_HIGHLIGHT_ALPHA,
  MAIN_MENU_BUTTON_IDLE_ALPHA,
  MENU_BUTTON_DISPLAY_WIDTH,
} from '../assets/uiAssets';
import {
  createHeadlineGlowTitle,
  createImageMenuButton,
  createStyledButton,
  drawPanel,
  formatScore,
  mountFullscreenButton,
  subtitleStyle,
  valueStyle,
  UI_FONTS,
  UI_COLORS,
} from '../ui/theme';
import type { CharacterId } from '../types/game';
import { resetRunState } from '../utils/runState';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: {
    score?: number;
    coins?: number;
    characterId?: CharacterId;
    levelIndex?: number;
    won?: boolean;
  }): void {
    const score = data.score ?? 0;
    const coins = data.coins ?? 0;
    const won = data.won ?? false;
    const character = getCharacter(data.characterId ?? 'voidWarrior');
    const level = getLevel(data.levelIndex ?? 0);

    this.cameras.main.setBackgroundColor('#000000');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000).setDepth(-20);
    mountFullscreenButton(this);

    const panel = this.add.graphics();
    drawPanel(panel, GAME_WIDTH / 2 - 280, 120, 560, 320);

    createHeadlineGlowTitle(
      this,
      GAME_WIDTH / 2,
      won ? 175 : 165,
      won ? 'VICTORY!' : 'GAME OVER',
      won ? '48px' : '44px',
      won ? '#ffc857' : '#ff4757',
      won ? 0xff8c32 : 0xcc0022,
    );

    this.add
      .text(GAME_WIDTH / 2, 230, formatScore(score), {
        ...valueStyle('40px', won ? '#ffc857' : '#f5f0ff'),
        fontFamily: UI_FONTS.title,
      })
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 205, 'FINAL SCORE', subtitleStyle('12px')).setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 275, `◎ ${formatScore(coins)} coins this run`, {
        fontFamily: UI_FONTS.body,
        fontSize: '20px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 310, `${character.name}  ·  ${level.name}`, subtitleStyle('15px'))
      .setOrigin(0.5);

    const statusText = this.add
      .text(GAME_WIDTH / 2, 345, 'Saving run...', {
        fontFamily: UI_FONTS.body,
        fontSize: '14px',
        color: '#5dffe0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const user = getCurrentUser();
    if (user) {
      void this.saveRunResults(statusText, user, score, coins, character.name, level.name);
    } else {
      statusText.setText('Sign in to bank coins and save scores');
      statusText.setColor('#a89bc4');
    }

    if (won) {
      this.addLeaderboardButton(GAME_WIDTH / 2, 490);
      createStyledButton(
        this,
        GAME_WIDTH / 2,
        560,
        'MAIN MENU',
        () => this.goToMainMenu(),
        300,
        UI_COLORS.panelBorder,
      );
    } else {
      createStyledButton(
        this,
        GAME_WIDTH / 2,
        490,
        'MAIN MENU',
        () => this.goToMainMenu(),
        300,
        UI_COLORS.panelBorder,
      );
      this.addLeaderboardButton(GAME_WIDTH / 2, 560);
    }
  }

  private async saveRunResults(
    statusText: Phaser.GameObjects.Text,
    user: { userId: string; username: string },
    score: number,
    coins: number,
    characterName: string,
    levelName: string,
  ): Promise<void> {
    const parts: string[] = [];

    try {
      if (coins > 0) {
        const bank = await bankRunCoins(coins);
        if (bank.banked > 0) {
          parts.push(
            bank.target === 'firebase'
              ? `Banked ${formatScore(bank.banked)} coins · Wallet ${formatScore(bank.totalCoins)}`
              : `Banked ${formatScore(bank.banked)} coins · Wallet ${formatScore(bank.totalCoins)}`,
          );
        } else if (coins > 0) {
          parts.push(`Could not bank ${formatScore(coins)} coins — try again`);
        }
      }

      const target = await submitScore({
        userId: user.userId,
        username: user.username,
        score,
        character: characterName,
        level: levelName,
        timestamp: Date.now(),
      });
      parts.push(scoreSaveMessage(target));
      statusText.setText(parts.join('  ·  '));
    } catch {
      statusText.setText(parts.length ? parts.join('  ·  ') : 'Could not save run — try again');
      statusText.setColor('#ff4757');
    }
  }

  private addLeaderboardButton(x: number, y: number): void {
    const goToLeaderboard = () => this.scene.start('LeaderboardScene');

    if (hasLeaderboardButtonTexture(this)) {
      const button = createImageMenuButton(
        this,
        x,
        y,
        LEADERBOARD_BUTTON_TEXTURE_KEY,
        MENU_BUTTON_DISPLAY_WIDTH,
        goToLeaderboard,
        50,
        MAIN_MENU_BUTTON_IDLE_ALPHA,
        MAIN_MENU_BUTTON_HIGHLIGHT_ALPHA,
      );
      button.hit.on('pointerover', () => button.setHighlighted(true));
      button.hit.on('pointerout', () => button.setHighlighted(false));
      return;
    }

    createStyledButton(this, x, y, 'LEADERBOARD', goToLeaderboard, 300, UI_COLORS.cyan);
  }

  private goToMainMenu(): void {
    resetRunState(this.registry);
    this.scene.start('MainMenuScene');
  }
}

function scoreSaveMessage(target: ScoreSaveTarget): string {
  switch (target) {
    case 'firebase':
      return 'Score saved to cloud leaderboard';
    case 'api':
      return 'Score saved to live leaderboard';
    default:
      return 'Score saved on this device';
  }
}
