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
import { mountControlsButton } from '../ui/controlsOverlay';
import type { CharacterId } from '../types/game';
import { isMobileTouchDevice } from '../utils/device';
import { unlockMobileAudio } from '../utils/audioUnlock';
import {
  destroyCharacterSelectOverlay,
  mountCharacterSelectBackButton,
} from '../ui/characterSelectOverlay';
import {
  focusGameSurface,
  MAIN_MENU_INPUT_GUARD_MS,
  MAIN_MENU_SCENE_KEY,
} from '../utils/sceneNav';
import { resetRunState, RUN_MIMU1_KEY } from '../utils/runState';
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
  rowY: [243, 500] as const,
  maxWidth: 624,
  maxHeight: 260,
  columnGap: 18,
  hitPadding: 12,
};

function getCardLayout() {
  if (!isMobileTouchDevice()) return CARD_LAYOUT;
  return {
    rowY: [236, 492] as const,
    maxWidth: 628,
    maxHeight: 272,
    columnGap: 10,
    hitPadding: 12,
  };
}

const LORE_LEFT_X = 22;
const LORE_CARD_GAP = 36;

function shouldShowCharacterSelectLore(): boolean {
  return !isMobileTouchDevice();
}

function getLoreColumnWidth(cardWidth: number, columnGap: number): number {
  const centerX = GAME_WIDTH / 2;
  const leftColumnCenter = centerX - cardWidth / 2 - columnGap / 2;
  const leftCardEdge = leftColumnCenter - cardWidth / 2;
  const available = Math.floor(leftCardEdge - LORE_LEFT_X - LORE_CARD_GAP);
  return Phaser.Math.Clamp(available, 118, 168);
}

function mountCharacterSelectLore(
  scene: Phaser.Scene,
  startY: number,
  cardWidth: number,
  columnGap: number,
): void {
  const centerX = GAME_WIDTH / 2;
  const leftColumnCenter = centerX - cardWidth / 2 - columnGap / 2;
  const clipRight = Math.floor(leftColumnCenter - cardWidth / 2 - LORE_CARD_GAP);
  const maxWidth = getLoreColumnWidth(cardWidth, columnGap);

  const maskShape = scene.add.graphics().setVisible(false);
  maskShape.fillStyle(0xffffff, 1);
  maskShape.fillRect(LORE_LEFT_X, 0, Math.max(1, clipRight - LORE_LEFT_X), GAME_HEIGHT);
  const loreMask = maskShape.createGeometryMask();

  const addLoreText = (
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    originX = 0,
  ): Phaser.GameObjects.Text => {
    const text = scene.add.text(x, y, content, style).setOrigin(originX, 0).setDepth(0);
    text.setWordWrapWidth(maxWidth, true);
    text.setMask(loreMask);
    return text;
  };

  const loreCenterX = LORE_LEFT_X + maxWidth / 2;
  let y = startY;
  const paragraphGap = 11;
  const bodyStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: UI_FONTS.body,
    fontSize: '11px',
    color: '#a89bc4',
    wordWrap: { width: maxWidth, useAdvancedWrap: true },
    lineSpacing: 4,
  };

  const headline = addLoreText(
    loreCenterX,
    y,
    'The Chaos Core has awakened.',
    {
      ...bodyStyle,
      color: '#ffc857',
      fontStyle: 'bold',
      align: 'center',
    },
    0.5,
  );
  y += headline.height + paragraphGap;

  const bodyOne = addLoreText(
    LORE_LEFT_X,
    y,
    'A mysterious corruption is spreading across the world of Mimu, twisting innocent creatures into terrifying monsters.',
    bodyStyle,
  );
  y += bodyOne.height + paragraphGap;

  const bodyTwo = addLoreText(
    LORE_LEFT_X,
    y,
    'As one of the four legendary Guardians—master of Fire, Frost, Nature, or Void—you are the last hope against the growing darkness.',
    bodyStyle,
  );
  y += bodyTwo.height + paragraphGap;

  addLoreText(
    LORE_LEFT_X,
    y,
    'Battle endless waves of corrupted enemies, unlock powerful abilities, recover the lost Guardian Fragments, and destroy the Chaos Core before Mimu is consumed by Chaos forever.',
    bodyStyle,
  );
}

export default class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cardImages: (Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle)[] = [];
  private selectionGfx: Phaser.GameObjects.Graphics[] = [];
  private inputManager!: InputManager;
  private targetLevelIndex = 0;
  private continueRun = false;
  private chooseMimuAudio?: ChooseMimuAudioHandle;
  private leaving = false;

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  init(data: { levelIndex?: number; continueRun?: boolean } = {}): void {
    this.continueRun = data.continueRun === true;
    this.targetLevelIndex = this.continueRun ? (data.levelIndex ?? 1) : 0;
    this.leaving = false;
  }

  create(): void {
    this.input.keyboard?.clearCaptures();
    this.input.resetPointers();
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
    mountControlsButton(this);

    const level = getLevel(this.targetLevelIndex);
    const showLore = shouldShowCharacterSelectLore();
    const titleText = this.continueRun ? `LEVEL ${this.targetLevelIndex + 1} — CHOOSE YOUR HERO` : 'CHOOSE YOUR MIMU';
    const subtitleText = this.continueRun
      ? `Pick a fighter for ${level.name}  ·  Score & coins carry over`
      : isMobileTouchDevice()
        ? 'Tap a card to select  ·  Use BACK to return'
        : 'D-Pad to browse  ·  A to confirm';

    const cardLayout = getCardLayout();
    const sampleFrame = hasCharacterSelectCard(this, 'voidWarrior')
      ? this.textures.get(getCharacterSelectCardKey('voidWarrior')).get()
      : { width: cardLayout.maxWidth, height: cardLayout.maxHeight };
    const cardSize = getCharacterSelectCardDisplaySize(
      sampleFrame.width,
      sampleFrame.height,
      cardLayout.maxWidth,
      cardLayout.maxHeight,
    );
    const centerX = GAME_WIDTH / 2;

    createHeadlineGlowTitle(
      this,
      GAME_WIDTH / 2,
      isMobileTouchDevice() ? 42 : 50,
      titleText,
      this.continueRun ? '28px' : isMobileTouchDevice() ? '30px' : '36px',
    );
    this.add
      .text(GAME_WIDTH / 2, isMobileTouchDevice() ? 76 : 88, subtitleText, subtitleStyle('14px'))
      .setOrigin(0.5);

    if (showLore) {
      mountCharacterSelectLore(this, 128, cardSize.width, cardLayout.columnGap);
    }

    const colX = [
      centerX - cardSize.width / 2 - cardLayout.columnGap / 2,
      centerX + cardSize.width / 2 + cardLayout.columnGap / 2,
    ] as const;

    CHARACTERS.forEach((c, i) => {
      const charId = c.id as CharacterId;
      const x = colX[i % 2];
      const y = cardLayout.rowY[Math.floor(i / 2)];

      const selection = this.add.graphics().setDepth(3);
      this.selectionGfx.push(selection);

      if (hasCharacterSelectCard(this, charId)) {
        const card = this.add.image(x, y, getCharacterSelectCardKey(charId)).setDepth(1);
        fitCharacterSelectCard(card, cardLayout.maxWidth, cardLayout.maxHeight);
        applyRoundedCardMask(this, card);
        this.cardImages.push(card);

        const hitW = card.displayWidth + cardLayout.hitPadding;
        const hitH = card.displayHeight + cardLayout.hitPadding;
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
          .rectangle(x, y, cardLayout.maxWidth, cardLayout.maxHeight, c.color, 0.35)
          .setDepth(1);
        applyRoundedCardMask(this, placeholder);
        this.cardImages.push(placeholder);

        const hit = this.add
          .rectangle(x, y, cardLayout.maxWidth + cardLayout.hitPadding, cardLayout.maxHeight + cardLayout.hitPadding, 0x000000, 0.001)
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

    mountCharacterSelectBackButton(this, () => this.goBackToMainMenu());

    this.refreshHighlight();

    if (!this.continueRun) {
      this.chooseMimuAudio = playChooseMimuVideo(this, this.chooseMimuAudio);
    }
  }

  shutdown(): void {
    stopChooseMimuVideo(this.chooseMimuAudio);
    this.chooseMimuAudio = undefined;
    destroyCharacterSelectOverlay();
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
    if (this.inputManager.isPauseJustPressed() || this.inputManager.isPauseQuitJustPressed()) {
      this.goBackToMainMenu();
    }
  }

  private goBackToMainMenu(): void {
    if (this.leaving) return;
    this.leaving = true;

    this.stopChooseMimuAudio();
    destroyCharacterSelectOverlay();
    focusGameSurface();
    this.input.resetPointers();

    if (!this.continueRun) {
      resetRunState(this.registry);
    }

    this.scene.start(MAIN_MENU_SCENE_KEY, {
      menuInputDelayMs: MAIN_MENU_INPUT_GUARD_MS,
    });
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
    if (this.leaving) return;

    unlockMobileAudio(this.game);
    this.stopChooseMimuAudio();
    destroyCharacterSelectOverlay();

    if (!this.continueRun) {
      this.registry.remove('runScore');
      this.registry.remove('runCoins');
      this.registry.remove(RUN_MIMU1_KEY);
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
