import Phaser from 'phaser';
import { CHARACTERS } from '../config/characters';
import { getLevel } from '../config/levels';
import { InputManager } from '../input/InputManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import {
  createHeadlineGlowTitle,
  mountFullscreenButton,
  subtitleStyle,
  UI_FONTS,
} from '../ui/theme';
import type { CharacterId } from '../types/game';
import { unlockMobileAudio } from '../utils/audioUnlock';
import { returnToMainMenu } from '../utils/sceneNav';
import {
  CHARACTER_SELECT_CARD_CORNER_RADIUS,
  applyRoundedCardMask,
  fitCharacterSelectCard,
  getCharacterSelectCardDisplaySize,
  hasCharacterSelectCard,
  getCharacterSelectCardKey,
  playChooseMimuVideo,
  stopChooseMimuVideo,
  type ChooseMimuAudioHandle,
} from '../assets/characterSelectAssets';

const CARD_LAYOUT = {
  rowY: [243, 531] as const,
  maxWidth: 624,
  maxHeight: 276,
  columnGap: 18,
  hitPadding: 12,
};

export default class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cardImages: (Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle)[] = [];
  private selectionGfx: Phaser.GameObjects.Graphics[] = [];
  private inputManager!: InputManager;
  private targetLevelIndex = 0;
  private continueRun = false;
  private chooseMimuAudio?: ChooseMimuAudioHandle;

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  init(data: { levelIndex?: number; continueRun?: boolean } = {}): void {
    this.continueRun = data.continueRun === true;
    this.targetLevelIndex = this.continueRun ? (data.levelIndex ?? 1) : 0;
  }

  create(): void {
    this.inputManager = new InputManager(this);
    this.cardImages = [];
    this.selectionGfx = [];
    this.selectedIndex = 0;

    if (this.continueRun) {
      const previousId = this.registry.get('characterId') as CharacterId | undefined;
      const previousIndex = CHARACTERS.findIndex((c) => c.id === previousId);
      if (previousIndex >= 0) {
        this.selectedIndex = previousIndex;
      }
    }

    this.cameras.main.setBackgroundColor('#000000');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000).setDepth(-20);
    mountFullscreenButton(this);

    const level = getLevel(this.targetLevelIndex);
    const titleText = this.continueRun ? `LEVEL ${this.targetLevelIndex + 1} — CHOOSE YOUR HERO` : 'CHOOSE YOUR MIMU';
    const subtitleText = this.continueRun
      ? `Pick a fighter for ${level.name}  ·  Score & coins carry over`
      : 'D-Pad to browse  ·  A to confirm';

    createHeadlineGlowTitle(this, GAME_WIDTH / 2, 50, titleText, this.continueRun ? '28px' : '36px');
    this.add.text(GAME_WIDTH / 2, 88, subtitleText, subtitleStyle('14px')).setOrigin(0.5);

    const sampleFrame = hasCharacterSelectCard(this, 'voidWarrior')
      ? this.textures.get(getCharacterSelectCardKey('voidWarrior')).get()
      : { width: CARD_LAYOUT.maxWidth, height: CARD_LAYOUT.maxHeight };
    const cardSize = getCharacterSelectCardDisplaySize(
      sampleFrame.width,
      sampleFrame.height,
      CARD_LAYOUT.maxWidth,
      CARD_LAYOUT.maxHeight,
    );
    const centerX = GAME_WIDTH / 2;
    const colX = [
      centerX - cardSize.width / 2 - CARD_LAYOUT.columnGap / 2,
      centerX + cardSize.width / 2 + CARD_LAYOUT.columnGap / 2,
    ] as const;

    CHARACTERS.forEach((c, i) => {
      const charId = c.id as CharacterId;
      const x = colX[i % 2];
      const y = CARD_LAYOUT.rowY[Math.floor(i / 2)];

      const selection = this.add.graphics().setDepth(3);
      this.selectionGfx.push(selection);

      if (hasCharacterSelectCard(this, charId)) {
        const card = this.add.image(x, y, getCharacterSelectCardKey(charId)).setDepth(1);
        fitCharacterSelectCard(card, CARD_LAYOUT.maxWidth, CARD_LAYOUT.maxHeight);
        applyRoundedCardMask(this, card);
        this.cardImages.push(card);

        const hitW = card.displayWidth + CARD_LAYOUT.hitPadding;
        const hitH = card.displayHeight + CARD_LAYOUT.hitPadding;
        const hit = this.add
          .rectangle(x, y, hitW, hitH, 0x000000, 0.001)
          .setDepth(20)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            this.selectedIndex = i;
            this.refreshHighlight();
          });
        hit.on('pointerdown', () => this.startWithCharacter(charId));
      } else {
        const placeholder = this.add
          .rectangle(x, y, CARD_LAYOUT.maxWidth, CARD_LAYOUT.maxHeight, c.color, 0.35)
          .setDepth(1);
        applyRoundedCardMask(this, placeholder);
        this.cardImages.push(placeholder);

        const hit = this.add
          .rectangle(x, y, CARD_LAYOUT.maxWidth + CARD_LAYOUT.hitPadding, CARD_LAYOUT.maxHeight + CARD_LAYOUT.hitPadding, 0x000000, 0.001)
          .setDepth(20)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            this.selectedIndex = i;
            this.refreshHighlight();
          });
        hit.on('pointerdown', () => this.startWithCharacter(charId));

        this.add
          .text(x, y, c.name.toUpperCase(), {
            fontFamily: UI_FONTS.title,
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(2);
      }
    });

    if (!this.continueRun) {
      const backBtn = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 44, '← BACK', {
          fontFamily: UI_FONTS.body,
          fontSize: '18px',
          color: '#a89bc4',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      backBtn.on('pointerover', () => backBtn.setColor('#ffc857'));
      backBtn.on('pointerout', () => backBtn.setColor('#a89bc4'));
      backBtn.on('pointerup', () => {
        this.stopChooseMimuAudio();
        returnToMainMenu(this.game);
      });
    }

    this.refreshHighlight();

    if (!this.continueRun) {
      this.chooseMimuAudio = playChooseMimuVideo(this, this.chooseMimuAudio);
    }
  }

  shutdown(): void {
    stopChooseMimuVideo(this.chooseMimuAudio);
    this.chooseMimuAudio = undefined;
  }

  update(): void {
    this.inputManager.update();

    if (this.inputManager.isMenuLeftJustPressed() && this.selectedIndex % 2 === 1) {
      this.selectedIndex--;
      this.refreshHighlight();
    }
    if (
      this.inputManager.isMenuRightJustPressed() &&
      this.selectedIndex % 2 === 0 &&
      this.selectedIndex < CHARACTERS.length - 1
    ) {
      this.selectedIndex++;
      this.refreshHighlight();
    }
    if (this.inputManager.isMenuUpJustPressed() && this.selectedIndex >= 2) {
      this.selectedIndex -= 2;
      this.refreshHighlight();
    }
    if (this.inputManager.isMenuDownJustPressed() && this.selectedIndex < 2) {
      this.selectedIndex += 2;
      this.refreshHighlight();
    }
    if (this.inputManager.isConfirmJustPressed()) {
      this.startWithCharacter(CHARACTERS[this.selectedIndex].id as CharacterId);
    }
  }

  private refreshHighlight(): void {
    const radius = CHARACTER_SELECT_CARD_CORNER_RADIUS;

    CHARACTERS.forEach((c, i) => {
      const card = this.cardImages[i];
      const gfx = this.selectionGfx[i];
      const selected = i === this.selectedIndex;

      card.setAlpha(selected ? 1 : 0.85);

      gfx.clear();
      if (!selected) return;

      const bounds = card.getBounds();
      const pad = 5;
      gfx.lineStyle(4, 0xffc857, 1);
      gfx.strokeRoundedRect(
        bounds.x - pad,
        bounds.y - pad,
        bounds.width + pad * 2,
        bounds.height + pad * 2,
        radius + 2,
      );
      gfx.lineStyle(2, c.color, 0.95);
      gfx.strokeRoundedRect(
        bounds.x - pad - 4,
        bounds.y - pad - 4,
        bounds.width + pad * 2 + 8,
        bounds.height + pad * 2 + 8,
        radius + 4,
      );
    });
  }

  private startWithCharacter(id: CharacterId): void {
    unlockMobileAudio(this.game);
    this.stopChooseMimuAudio();

    if (!this.continueRun) {
      this.registry.remove('runScore');
      this.registry.remove('runCoins');
    }

    this.registry.set('characterId', id);
    this.registry.set('levelIndex', this.targetLevelIndex);
    this.scene.start('GameScene', { characterId: id, levelIndex: this.targetLevelIndex });
  }

  private stopChooseMimuAudio(): void {
    stopChooseMimuVideo(this.chooseMimuAudio);
    this.chooseMimuAudio = undefined;
  }
}
