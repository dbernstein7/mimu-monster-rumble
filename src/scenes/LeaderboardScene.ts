import Phaser from 'phaser';
import { fetchLeaderboard } from '../services/firebase';
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
import type { LeaderboardEntry } from '../types/game';

export default class LeaderboardScene extends Phaser.Scene {
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

    const headerY = 125;
    this.add.text(110, headerY, '#', labelStyle()).setDepth(1);
    this.add.text(150, headerY, 'PLAYER', labelStyle()).setDepth(1);
    this.add.text(520, headerY, 'MIMU', labelStyle()).setDepth(1);
    this.add.text(900, headerY, 'SCORE', labelStyle()).setDepth(1);

    const loading = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
        fontFamily: UI_FONTS.body,
        fontSize: '18px',
        color: '#c9b8e8',
      })
      .setOrigin(0.5)
      .setDepth(1);

    fetchLeaderboard().then((entries) => {
      loading.destroy();
      if (entries.length === 0) {
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No legends yet — claim the top spot!', subtitleStyle('18px'))
          .setOrigin(0.5)
          .setDepth(1);
      } else {
        this.renderEntries(entries);
      }
    });

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
  }

  private renderEntries(entries: LeaderboardEntry[]): void {
    entries.slice(0, 12).forEach((entry, i) => {
      const y = 165 + i * 34;
      const rankColors = ['#ffc857', '#e8e8e8', '#cd7f32', '#f5f0ff'];
      const rankColor = rankColors[Math.min(i, 3)];

      if (i % 2 === 0) {
        const row = this.add.graphics().setDepth(1);
        row.fillStyle(0xffffff, 0.04);
        row.fillRoundedRect(100, y - 12, GAME_WIDTH - 200, 30, 6);
      }

      this.add.text(110, y, `${i + 1}`, { fontFamily: UI_FONTS.title, fontSize: '16px', color: rankColor }).setDepth(2);
      this.add
        .text(150, y, entry.username.slice(0, 16), {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#f5f0ff',
          fontStyle: 'bold',
        })
        .setDepth(2);
      this.add.text(520, y, entry.character, subtitleStyle('14px')).setDepth(2);
      this.add
        .text(900, y, formatScore(entry.score), {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#2ed573',
          fontStyle: 'bold',
        })
        .setDepth(2);
    });
  }
}
