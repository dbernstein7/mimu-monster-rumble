import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getLevel } from '../config/levels';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { getCurrentUser, submitScore, waitForAuthReady, type SubmitScoreResult } from '../services/firebase';
import { bankRunCoins, getCachedProfile, loadUserProfile } from '../services/userProfile';
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
  startSceneNextTick,
} from '../utils/sceneNav';
import { isMobileTouchDevice } from '../utils/device';
import { destroyGameOverOverlay, mountGameOverNav } from '../ui/gameOverOverlay';

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
  private saveToken = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(): void {
    this.leaving = false;
    this.saveToken += 1;
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
    focusGameSurface();
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
      .text(GAME_WIDTH / 2, layout.finalScoreY, 'FINAL SCORE', subtitleStyle('12px'))
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, layout.scoreY, formatScore(score), {
        ...valueStyle('40px', won ? '#ffc857' : '#f5f0ff'),
        fontFamily: UI_FONTS.title,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, layout.coinsY, `${formatScore(coins)} coins this run`, {
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
        fontSize: '13px',
        color: '#5dffe0',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: GAME_OVER_PANEL.width - 48 },
      })
      .setOrigin(0.5, 0.5);

    const saveToken = this.saveToken;
    const user = getCurrentUser();
    if (user) {
      void this.saveRunResults(
        saveToken,
        statusText,
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
    const depth = 40;

    if (hasLeaderboardButtonTexture(this)) {
      createImageMenuButton(
        this,
        cx,
        leaderboardY,
        LEADERBOARD_BUTTON_TEXTURE_KEY,
        MENU_BUTTON_DISPLAY_WIDTH,
        () => this.goToLeaderboard(),
        depth,
        0.9,
        1,
        false,
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
        depth,
        0.9,
        1,
        false,
      );
    } else {
      createStyledButton(this, cx, mainMenuY, 'MAIN MENU', () => this.goToMainMenu());
    }

    if (hasLeaderboardButtonTexture(this) && hasMainMenuButtonTexture(this)) {
      mountGameOverNav(this, {
        won,
        hitTargetsOnly: true,
        onMainMenu: () => this.goToMainMenu(),
        onLeaderboard: () => this.goToLeaderboard(),
      });
    }
  }

  private leaveToScene(sceneKey: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.saveToken += 1;
    destroyGameOverOverlay();
    this.input.resetPointers();
    if (sceneKey === MAIN_MENU_SCENE_KEY) {
      resetRunState(this.registry);
    }
    focusGameSurface();
    const handoffDelay = isMobileTouchDevice() ? 0 : 50;
    startSceneNextTick(this.game, sceneKey, data, handoffDelay);
  }

  private async saveRunResults(
    saveToken: number,
    statusText: Phaser.GameObjects.Text,
    score: number,
    coins: number,
    characterName: string,
    character2Name: string | undefined,
    levelName: string,
  ): Promise<void> {
    const applyStatus = (text: string, color = '#5dffe0'): void => {
      if (saveToken !== this.saveToken || !this.scene.isActive() || !statusText.active) return;
      statusText.setText(text);
      statusText.setColor(color);
    };

    const lines: string[] = [];

    try {
      await waitForAuthReady();
      if (saveToken !== this.saveToken) return;

      const user = getCurrentUser();
      if (!user) {
        applyStatus('Sign in to bank coins and save scores', '#a89bc4');
        return;
      }

      await loadUserProfile();
      if (saveToken !== this.saveToken) return;

      const username = getCachedProfile()?.username ?? user.username;

      if (coins > 0) {
        const bank = await bankRunCoins(coins);
        if (saveToken !== this.saveToken) return;
        if (bank.banked > 0) {
          lines.push(`Banked ${formatScore(bank.banked)} coins`);
        } else {
          lines.push(`Could not bank ${formatScore(coins)} coins`);
        }
      }

      if (score > 0) {
        const scoreResult = await submitScore({
          userId: user.userId,
          username,
          score,
          character: characterName,
          character2: character2Name,
          level: levelName,
          timestamp: Date.now(),
        });
        if (saveToken !== this.saveToken) return;
        lines.push(scoreSaveMessage(scoreResult));
      }

      applyStatus(lines.length ? lines.join('\n') : 'Run saved');
    } catch {
      applyStatus(lines.length ? lines.join('\n') : 'Could not save run — try again', '#ff4757');
    }
  }

  private goToMainMenu(): void {
    this.leaveToScene(MAIN_MENU_SCENE_KEY, {
      menuInputDelayMs: MAIN_MENU_INPUT_GUARD_MS,
    });
  }

  private goToLeaderboard(): void {
    this.leaveToScene('LeaderboardScene');
  }
}

function scoreSaveMessage(result: SubmitScoreResult): string {
  if (result.saved) {
    return result.target === 'api'
      ? 'High score saved to global leaderboard'
      : 'High score saved to cloud leaderboard';
  }
  if (result.reason === 'not_best') {
    return 'Run score below your personal best';
  }
  if (result.reason === 'invalid_score') {
    return 'No score to save this run';
  }
  return 'Could not save high score — try again';
}
