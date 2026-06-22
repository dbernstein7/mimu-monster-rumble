import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getLevel } from '../config/levels';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { getCurrentUser, submitScore, type ScoreSaveTarget } from '../services/firebase';
import { bankRunCoins } from '../services/userProfile';
import {
  addPanelBorder,
  hasLeaderboardBorderTexture,
  hasLeaderboardButtonTexture,
  hasMainMenuButtonTexture,
  LEADERBOARD_BUTTON_TEXTURE_KEY,
  MAIN_MENU_BUTTON_TEXTURE_KEY,
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
} from '../ui/theme';
import type { CharacterId } from '../types/game';
import { resetRunState } from '../utils/runState';
import {
  focusGameSurface,
  MAIN_MENU_INPUT_GUARD_MS,
  MAIN_MENU_SCENE_KEY,
} from '../utils/sceneNav';
import { destroyGameOverOverlay } from '../ui/gameOverOverlay';

/** Score summary panel — same border treatment as leaderboard / account. */
const GAME_OVER_PANEL = {
  x: Math.round((GAME_WIDTH - 560) / 2),
  y: 120,
  width: 560,
  height: 320,
} as const;

const NAV_BUTTON_Y = {
  first: 490,
  second: 560,
} as const;

function getGameOverContentLayout(hasBorder: boolean) {
  const insets = hasBorder
    ? { top: 0.18, bottom: 0.12 }
    : { top: 0.08, bottom: 0.08 };

  const innerTop = GAME_OVER_PANEL.y + GAME_OVER_PANEL.height * insets.top;
  const innerBottom = GAME_OVER_PANEL.y + GAME_OVER_PANEL.height * (1 - insets.bottom);
  const innerHeight = innerBottom - innerTop;

  return {
    titleY: innerTop + innerHeight * 0.12,
    finalScoreY: innerTop + innerHeight * 0.28,
    scoreY: innerTop + innerHeight * 0.42,
    coinsY: innerTop + innerHeight * 0.58,
    mimuY: innerTop + innerHeight * 0.72,
    statusY: innerTop + innerHeight * 0.88,
  };
}

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
    destroyGameOverOverlay();
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

    const hasBorder = hasLeaderboardBorderTexture(this);
    const layout = getGameOverContentLayout(hasBorder);
    if (hasBorder) {
      addPanelBorder(this, GAME_OVER_PANEL);
    } else {
      const panel = this.add.graphics().setDepth(0);
      drawPanel(panel, GAME_OVER_PANEL.x, GAME_OVER_PANEL.y, GAME_OVER_PANEL.width, GAME_OVER_PANEL.height);
    }

    createHeadlineGlowTitle(
      this,
      GAME_WIDTH / 2,
      layout.titleY,
      won ? 'VICTORY!' : 'GAME OVER',
      won ? '48px' : '44px',
      won ? '#ffc857' : '#ff4757',
      won ? 0xff8c32 : 0xcc0022,
    );

    this.add
      .text(GAME_WIDTH / 2, layout.scoreY, formatScore(score), {
        ...valueStyle('40px', won ? '#ffc857' : '#f5f0ff'),
        fontFamily: UI_FONTS.title,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, layout.finalScoreY, 'FINAL SCORE', subtitleStyle('12px'))
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, layout.coinsY, `◎ ${formatScore(coins)} coins this run`, {
        fontFamily: UI_FONTS.body,
        fontSize: '20px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, layout.mimuY, `${mimuLine}  ·  ${level.name}`, subtitleStyle('15px'))
      .setOrigin(0.5);

    const statusText = this.add
      .text(GAME_WIDTH / 2, layout.statusY, 'Saving run...', {
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

    this.createNavButtons(won);
  }

  shutdown(): void {
    destroyGameOverOverlay();
  }

  private createNavButtons(won: boolean): void {
    const leaderboardY = won ? NAV_BUTTON_Y.first : NAV_BUTTON_Y.second;
    const mainMenuY = won ? NAV_BUTTON_Y.second : NAV_BUTTON_Y.first;
    const cx = GAME_WIDTH / 2;

    if (hasLeaderboardButtonTexture(this)) {
      createImageMenuButton(
        this,
        cx,
        leaderboardY,
        LEADERBOARD_BUTTON_TEXTURE_KEY,
        MENU_BUTTON_DISPLAY_WIDTH,
        () => this.goToLeaderboard(),
      );
    } else {
      createStyledButton(this, cx, leaderboardY, 'LEADERBOARD', () => this.goToLeaderboard());
    }

    if (hasMainMenuButtonTexture(this)) {
      createImageMenuButton(
        this,
        cx,
        mainMenuY,
        MAIN_MENU_BUTTON_TEXTURE_KEY,
        MENU_BUTTON_DISPLAY_WIDTH,
        () => this.goToMainMenu(),
      );
    } else {
      createStyledButton(this, cx, mainMenuY, 'MAIN MENU', () => this.goToMainMenu());
    }
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
