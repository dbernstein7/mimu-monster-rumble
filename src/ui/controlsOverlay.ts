import Phaser from 'phaser';
import { CONTROLS_TEXTURE_KEY, hasControlsTexture } from '../assets/uiAssets';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isMobileTouchDevice } from '../utils/device';
import { getMobileGameUiInsets } from '../utils/mobileLayout';
import { createIconButton, UI_COLORS, UI_FONTS } from './theme';

const BUTTON_SIZE = 40;
const BUTTON_PAD = 14;
const BUTTON_DEPTH = 245;
const MODAL_DEPTH = 360;

export interface ControlsButtonOptions {
  depth?: number;
  /** Pause gameplay while the controls panel is open (GameScene). */
  onOpen?: () => void;
  onClose?: () => void;
}

const modalByScene = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();

export function getControlsButtonPosition(scene: Phaser.Scene): { x: number; y: number } {
  if (isMobileTouchDevice()) {
    const inset = getMobileGameUiInsets(scene);
    return {
      x: inset.left + BUTTON_PAD + BUTTON_SIZE / 2,
      y: GAME_HEIGHT - inset.bottom - BUTTON_PAD - BUTTON_SIZE / 2,
    };
  }

  return {
    x: BUTTON_PAD + BUTTON_SIZE / 2,
    y: GAME_HEIGHT - BUTTON_PAD - BUTTON_SIZE / 2,
  };
}

function closeControlsModal(scene: Phaser.Scene, onClose?: () => void): void {
  const modal = modalByScene.get(scene);
  if (modal) {
    modal.destroy();
    modalByScene.delete(scene);
  }
  onClose?.();
}

function openControlsModal(scene: Phaser.Scene, onClose?: () => void): void {
  if (modalByScene.has(scene) || !hasControlsTexture(scene)) return;

  const modal = scene.add.container(0, 0).setScrollFactor(0).setDepth(MODAL_DEPTH);
  modalByScene.set(scene, modal);

  const blocker = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
    .setInteractive();

  const panel = scene.add.graphics();
  const image = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, CONTROLS_TEXTURE_KEY).setOrigin(0.5);
  const maxW = GAME_WIDTH * 0.9;
  const maxH = GAME_HEIGHT * 0.86;
  const imageScale = Math.min(maxW / image.width, maxH / image.height);
  image.setScale(imageScale);

  const panelW = image.displayWidth + 24;
  const panelH = image.displayHeight + 24;
  panel.fillStyle(UI_COLORS.panel, 0.96);
  panel.fillRoundedRect(
    GAME_WIDTH / 2 - panelW / 2,
    GAME_HEIGHT / 2 - panelH / 2,
    panelW,
    panelH,
    12,
  );
  panel.lineStyle(2, UI_COLORS.panelBorder, 1);
  panel.strokeRoundedRect(
    GAME_WIDTH / 2 - panelW / 2,
    GAME_HEIGHT / 2 - panelH / 2,
    panelW,
    panelH,
    12,
  );

  const closeLabel = scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + panelH / 2 + 22, 'Tap anywhere to close', {
      fontFamily: UI_FONTS.body,
      fontSize: '14px',
      color: '#a89bc4',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const dismiss = (): void => closeControlsModal(scene, onClose);
  blocker.on('pointerdown', dismiss);
  image.setInteractive({ useHandCursor: true });
  image.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    pointer.event.stopPropagation();
  });

  modal.add([blocker, panel, image, closeLabel]);
}

function openControlsPanel(scene: Phaser.Scene, options?: ControlsButtonOptions): void {
  options?.onOpen?.();
  openControlsModal(scene, options?.onClose);
}

/** Cog button (bottom-left) that opens the controls reference image. */
export function mountControlsButton(
  scene: Phaser.Scene,
  options: ControlsButtonOptions = {},
): Phaser.GameObjects.Container | null {
  if (!hasControlsTexture(scene)) return null;

  const { x, y } = getControlsButtonPosition(scene);
  const depth = options.depth ?? BUTTON_DEPTH;

  const button = createIconButton(
    scene,
    x,
    y,
    '⚙',
    () => {
      if (modalByScene.has(scene)) {
        closeControlsModal(scene, options.onClose);
      } else {
        openControlsPanel(scene, options);
      }
    },
    BUTTON_SIZE,
  );
  button.setScrollFactor(0).setDepth(depth);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    closeControlsModal(scene);
    button.destroy();
  });

  return button;
}
