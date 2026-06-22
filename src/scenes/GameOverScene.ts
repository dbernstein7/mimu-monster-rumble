import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getLevel } from '../config/levels';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { getCurrentUser, submitScore, type ScoreSaveTarget } from '../services/firebase';
import { bankRunCoins } from '../services/userProfile';
import {
  hasLeaderboardButtonTexture,
  LEADERBOARD_BUTTON_TEXTURE_KEY,
  MENU_BUTTON_DISPLAY_WIDTH,
} from '../assets/uiAssets';
import {
  createHeadlineGlowTitle,
  drawPanel,
  formatScore,
  mountFullscreenButton,
  subtitleStyle,
  valueStyle,
  UI_FONTS,
} from '../ui/theme';
import type { CharacterId } from '../types/game';
import { resetRunState } from '../utils/runState';
import {
  focusGameSurface,
  MAIN_MENU_INPUT_GUARD_MS,
  MAIN_MENU_SCENE_KEY,
} from '../utils/sceneNav';
import { destroyGameOverOverlay, mountGameOverNav } from '../ui/gameOverOverlay';

function formatRunMimuLine(mimu1: CharacterId | undefined, mimu2: CharacterId): string {
  const second = getCharacter(mimu2).name;
  if (!mimu1 || mimu1 === mimu2) return second;
  return `${getCharacter(mimu1).name}  ·  ${second}`;
}

export default class GameOverScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: {
    score?: number;
    coins?: number;
    characterId?: CharacterId;
    runMimu1?: CharacterId;
    levelIndex?: number;
    won?: boolean;
  }): void {
    this.leaving = false;
    this.input.keyboard?.clearCaptures();
    this.input.resetPointers();

    const score = data.score ?? 0;
    const coins = data.coins ?? 0;
    const won = data.won ?? false;
    const characterId = data.characterId ?? 'voidWarrior';
    const runMimu1 = data.runMimu1;
    const character = getCharacter(characterId);
    const level = getLevel(data.levelIndex ?? 0);
    const mimuLine = formatRunMimuLine(runMimu1, characterId);

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
      .text(GAME_WIDTH / 2, 310, `${mimuLine}  ·  ${level.name}`, subtitleStyle('15px'))
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
      void this.saveRunResults(
        statusText,
        user,
        score,
        coins,
        runMimu1 ? getCharacter(runMimu1).name : character.name,
        runMimu1 && runMimu1 !== characterId ? character.name : undefined,
        level.name,
      );
    } else {
      statusText.setText('Sign in to bank coins and save scores');
      statusText.setColor('#a89bc4');
    }

    this.drawNavButtonArt(won);

    mountGameOverNav({
      won,
      onMainMenu: () => this.goToMainMenu(),
      onLeaderboard: () => this.goToLeaderboard(),
    });
  }

  shutdown(): void {
    destroyGameOverOverlay();
  }

  /** Decorative canvas art only — real clicks use the HTML overlay. */
  private drawNavButtonArt(won: boolean): void {
    if (won) {
      this.addLeaderboardArt(GAME_WIDTH / 2, 490);
      this.addMainMenuArt(GAME_WIDTH / 2, 560);
      return;
    }

    this.addMainMenuArt(GAME_WIDTH / 2, 490);
    this.addLeaderboardArt(GAME_WIDTH / 2, 560);
  }

  private addLeaderboardArt(x: number, y: number): void {
    if (hasLeaderboardButtonTexture(this)) {
      const image = this.add.image(x, y, LEADERBOARD_BUTTON_TEXTURE_KEY).setOrigin(0.5).setDepth(5);
      const scale = MENU_BUTTON_DISPLAY_WIDTH / image.width;
      image.setScale(scale);
      return;
    }

    this.add
      .text(x, y, 'LEADERBOARD', {
        fontFamily: UI_FONTS.body,
        fontSize: '20px',
        color: '#5dffe0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private addMainMenuArt(x: number, y: number): void {
    const g = this.add.graphics().setDepth(5);
    const width = 300;
    g.fillStyle(0x2e1a4a, 0.88);
    g.fillRoundedRect(x - width / 2, y - 26, width, 52, 12);
    g.lineStyle(2, 0xa89bc4, 1);
    g.strokeRoundedRect(x - width / 2, y - 26, width, 52, 12);

    this.add
      .text(x, y, 'MAIN MENU', {
        fontFamily: UI_FONTS.body,
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private async saveRunResults(
    statusText: Phaser.GameObjects.Text,
    user: { userId: string; username: string },
    score: number,
    coins: number,
    characterName: string,
    character2Name: string | undefined,
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
        character2: character2Name,
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

  private goToMainMenu(): void {
    if (this.leaving) return;
    this.leaving = true;

    resetRunState(this.registry);
    destroyGameOverOverlay();
    focusGameSurface();
    this.input.resetPointers();
    this.scene.start(MAIN_MENU_SCENE_KEY, {
      menuInputDelayMs: MAIN_MENU_INPUT_GUARD_MS,
    });
  }

  private goToLeaderboard(): void {
    if (this.leaving) return;
    this.leaving = true;

    destroyGameOverOverlay();
    focusGameSurface();
    this.input.resetPointers();
    this.scene.start('LeaderboardScene');
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
