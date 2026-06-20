import Phaser from 'phaser';
import { fetchCoinLeaderboard, fetchLeaderboard, isFirebaseEnabled } from '../services/firebase';
import { loadUserProfile } from '../services/userProfile';
import { probeLiveLeaderboard } from '../services/leaderboardApi';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import {
  createGlowTitle,
  drawPanel,
  formatScore,
  mountFullscreenButton,
  subtitleStyle,
  UI_FONTS,
  labelStyle,
} from '../ui/theme';
import type { CoinLeaderboardEntry, LeaderboardEntry } from '../types/game';

function formatScoreMimus(entry: LeaderboardEntry): string {
  if (entry.character2) {
    return `${entry.character} · ${entry.character2}`;
  }
  return entry.character;
}

type LeaderboardTab = 'scores' | 'coins';

export default class LeaderboardScene extends Phaser.Scene {
  private activeTab: LeaderboardTab = 'scores';
  private listContainer?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private loadingText?: Phaser.GameObjects.Text;
  private headerLabels: Phaser.GameObjects.Text[] = [];
  private tabScoresLabel?: Phaser.GameObjects.Text;
  private tabCoinsLabel?: Phaser.GameObjects.Text;
  private tabUnderline?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000).setDepth(-20);
    mountFullscreenButton(this);
    createGlowTitle(this, GAME_WIDTH / 2, 50, 'LEADERBOARD', '34px');

    const panel = this.add.graphics();
    drawPanel(panel, 80, 100, GAME_WIDTH - 160, 480);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 88, '', subtitleStyle('13px'))
      .setOrigin(0.5)
      .setDepth(1);

    this.createTabs();
    this.updateHeaders();

    const back = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, '← BACK', {
        fontFamily: UI_FONTS.body,
        fontSize: '18px',
        color: '#a89bc4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    back.on('pointerover', () => back.setColor('#ffc857'));
    back.on('pointerout', () => back.setColor('#a89bc4'));
    back.on('pointerdown', () => this.scene.start('MainMenuScene'));

    void this.loadActiveTab();
  }

  private createTabs(): void {
    const tabY = 118;
    const scoresX = GAME_WIDTH / 2 - 130;
    const coinsX = GAME_WIDTH / 2 + 130;

    this.tabUnderline = this.add.graphics().setDepth(2);

    this.tabScoresLabel = this.add
      .text(scoresX, tabY, 'HIGH SCORES', {
        fontFamily: UI_FONTS.body,
        fontSize: '15px',
        color: '#ffc857',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.tabCoinsLabel = this.add
      .text(coinsX, tabY, 'TOTAL COINS', {
        fontFamily: UI_FONTS.body,
        fontSize: '15px',
        color: '#a89bc4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    const selectScores = () => {
      if (this.activeTab === 'scores') return;
      this.activeTab = 'scores';
      this.syncTabStyles();
      void this.loadActiveTab();
    };
    const selectCoins = () => {
      if (this.activeTab === 'coins') return;
      this.activeTab = 'coins';
      this.syncTabStyles();
      void this.loadActiveTab();
    };

    this.tabScoresLabel.on('pointerdown', selectScores);
    this.tabCoinsLabel.on('pointerdown', selectCoins);
    this.tabScoresLabel.on('pointerover', () => {
      if (this.activeTab !== 'scores') this.tabScoresLabel?.setColor('#f5f0ff');
    });
    this.tabScoresLabel.on('pointerout', () => this.syncTabStyles());
    this.tabCoinsLabel.on('pointerover', () => {
      if (this.activeTab !== 'coins') this.tabCoinsLabel?.setColor('#f5f0ff');
    });
    this.tabCoinsLabel.on('pointerout', () => this.syncTabStyles());

    this.syncTabStyles();
  }

  private syncTabStyles(): void {
    const activeColor = '#ffc857';
    const inactiveColor = '#a89bc4';
    this.tabScoresLabel?.setColor(this.activeTab === 'scores' ? activeColor : inactiveColor);
    this.tabCoinsLabel?.setColor(this.activeTab === 'coins' ? activeColor : inactiveColor);

    const underline = this.tabUnderline;
    const activeLabel = this.activeTab === 'scores' ? this.tabScoresLabel : this.tabCoinsLabel;
    underline?.clear();
    if (activeLabel) {
      const w = Math.max(90, activeLabel.width + 8);
      underline?.lineStyle(2, 0xffc857, 1);
      underline?.strokeLineShape(
        new Phaser.Geom.Line(activeLabel.x - w / 2, activeLabel.y + 14, activeLabel.x + w / 2, activeLabel.y + 14),
      );
    }
  }

  private clearList(): void {
    this.listContainer?.destroy(true);
    this.listContainer = undefined;
    this.loadingText?.destroy();
    this.loadingText = undefined;
  }

  private beginContentContainer(): Phaser.GameObjects.Container {
    this.clearList();
    const container = this.add.container(0, 0).setDepth(2);
    this.listContainer = container;
    return container;
  }

  private updateHeaders(): void {
    const headerY = 152;
    const configs =
      this.activeTab === 'scores'
        ? [
            { x: 110, text: '#' },
            { x: 150, text: 'PLAYER' },
            { x: 520, text: 'MIMUS' },
            { x: 900, text: 'SCORE' },
          ]
        : [
            { x: 110, text: '#' },
            { x: 150, text: 'ACCOUNT' },
            { x: 900, text: 'TOTAL' },
          ];

    if (this.headerLabels.length !== configs.length) {
      this.headerLabels.forEach((label) => label.destroy());
      this.headerLabels = configs.map(({ x, text }) =>
        this.add.text(x, headerY, text, labelStyle()).setDepth(1),
      );
      return;
    }

    configs.forEach((config, i) => {
      this.headerLabels[i].setPosition(config.x, headerY).setText(config.text);
    });
  }

  private async loadActiveTab(): Promise<void> {
    this.clearList();
    this.updateHeaders();

    this.loadingText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
        fontFamily: UI_FONTS.body,
        fontSize: '18px',
        color: '#c9b8e8',
      })
      .setOrigin(0.5)
      .setDepth(1);

    if (this.activeTab === 'scores') {
      const entries = await fetchLeaderboard();
      const live = await probeLiveLeaderboard();
      this.statusText?.setText(live ? 'Live global scores' : 'Showing scores saved on this device');
      this.loadingText?.destroy();
      this.loadingText = undefined;

      if (entries.length === 0) {
        const container = this.beginContentContainer();
        container.add(
          this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No legends yet — claim the top spot!', subtitleStyle('18px'))
            .setOrigin(0.5),
        );
        return;
      }

      this.renderScoreEntries(entries);
      return;
    }

    if (isFirebaseEnabled()) {
      await loadUserProfile();
    }
    const entries = await fetchCoinLeaderboard();
    const liveCoins = isFirebaseEnabled();
    this.statusText?.setText(
      liveCoins
        ? 'All coins you earn across runs — added to your wallet when a run ends'
        : 'Showing wallets saved on this device',
    );
    this.loadingText?.destroy();
    this.loadingText = undefined;

    if (entries.length === 0) {
      const container = this.beginContentContainer();
      container.add(
        this.add
          .text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            'No totals yet — finish a run while signed in and coins stack up here!',
            subtitleStyle('18px'),
          )
          .setOrigin(0.5),
      );
      return;
    }

    this.renderCoinEntries(entries);
  }

  private renderScoreEntries(entries: LeaderboardEntry[]): void {
    const container = this.beginContentContainer();

    entries.slice(0, 12).forEach((entry, i) => {
      const y = 192 + i * 34;
      const rankColors = ['#ffc857', '#e8e8e8', '#cd7f32', '#f5f0ff'];
      const rankColor = rankColors[Math.min(i, 3)];

      if (i % 2 === 0) {
        const row = this.add.graphics();
        row.fillStyle(0xffffff, 0.04);
        row.fillRoundedRect(100, y - 12, GAME_WIDTH - 200, 30, 6);
        container.add(row);
      }

      container.add(
        this.add.text(110, y, `${i + 1}`, { fontFamily: UI_FONTS.title, fontSize: '16px', color: rankColor }),
      );
      container.add(
        this.add.text(150, y, entry.username.slice(0, 16), {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#f5f0ff',
          fontStyle: 'bold',
        }),
      );
      container.add(
        this.add.text(520, y, formatScoreMimus(entry), {
          ...subtitleStyle('13px'),
          wordWrap: { width: 340 },
        }),
      );
      container.add(
        this.add.text(900, y, formatScore(entry.score), {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#2ed573',
          fontStyle: 'bold',
        }),
      );
    });
  }

  private renderCoinEntries(entries: CoinLeaderboardEntry[]): void {
    const container = this.beginContentContainer();

    entries.slice(0, 12).forEach((entry, i) => {
      const y = 192 + i * 34;
      const rankColors = ['#ffc857', '#e8e8e8', '#cd7f32', '#f5f0ff'];
      const rankColor = rankColors[Math.min(i, 3)];

      if (i % 2 === 0) {
        const row = this.add.graphics();
        row.fillStyle(0xffffff, 0.04);
        row.fillRoundedRect(100, y - 12, GAME_WIDTH - 200, 30, 6);
        container.add(row);
      }

      container.add(
        this.add.text(110, y, `${i + 1}`, { fontFamily: UI_FONTS.title, fontSize: '16px', color: rankColor }),
      );
      container.add(
        this.add.text(150, y, entry.username.slice(0, 20), {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#f5f0ff',
          fontStyle: 'bold',
        }),
      );
      container.add(
        this.add.text(900, y, formatScore(entry.totalCoins), {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#ffc857',
          fontStyle: 'bold',
        }),
      );
    });
  }
}
