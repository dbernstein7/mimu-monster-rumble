import Phaser from 'phaser';
import { CONTROLS_TEXTURE_KEY, hasControlsTexture } from '../assets/uiAssets';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isMobileTouchDevice } from '../utils/device';
import { createIconButton, UI_COLORS, UI_FONTS } from './theme';
import { setCharacterSelectBackVisible } from './characterSelectOverlay';

const BUTTON_SIZE = 40;
const BUTTON_PAD = 14;
const BUTTON_DEPTH = 245;
const MODAL_DEPTH = 360;
const TOOLTIP_OFFSET_X = 16;
const TOOLTIP_OFFSET_Y = -10;

function attachControlsHoverTooltip(
  scene: Phaser.Scene,
  button: Phaser.GameObjects.Container,
): void {
  if (isMobileTouchDevice()) return;

  const hit = button.getAt(2) as Phaser.GameObjects.Arc | undefined;
  if (!hit?.input) return;

  const tooltip = scene.add
    .text(0, 0, 'Controls', {
      fontFamily: UI_FONTS.body,
      fontSize: '13px',
      color: '#ffc857',
      fontStyle: 'bold',
      backgroundColor: '#2e1a4a',
      padding: { x: 8, y: 4 },
    })
    .setScrollFactor(0)
    .setDepth(BUTTON_DEPTH + 5)
    .setVisible(false);

  const positionTooltip = (pointer: Phaser.Input.Pointer): void => {
    tooltip.setPosition(pointer.x + TOOLTIP_OFFSET_X, pointer.y + TOOLTIP_OFFSET_Y);
  };

  hit.on('pointerover', (pointer: Phaser.Input.Pointer) => {
    tooltip.setVisible(true);
    positionTooltip(pointer);
  });
  hit.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (tooltip.visible) positionTooltip(pointer);
  });
  hit.on('pointerout', () => tooltip.setVisible(false));

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => tooltip.destroy());
}

export interface ControlsButtonOptions {
  depth?: number;
  /** Pause gameplay while the controls panel is open (GameScene desktop only). */
  onOpen?: () => void;
  onClose?: () => void;
}

const modalByScene = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();
const onCloseByScene = new WeakMap<Phaser.Scene, () => void>();

export function isControlsModalOpen(scene: Phaser.Scene): boolean {
  return modalByScene.has(scene);
}

/** Bottom-left of the 1280×720 playfield — same on desktop and mobile. */
export function getControlsButtonPosition(_scene?: Phaser.Scene): { x: number; y: number } {
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
  setCharacterSelectBackVisible(true);
  onClose?.();
}

function openControlsModal(scene: Phaser.Scene, onClose?: () => void): void {
  if (modalByScene.has(scene) || !hasControlsTexture(scene)) return;

  setCharacterSelectBackVisible(false);

  const mobile = isMobileTouchDevice();
  const modal = scene.add.container(0, 0).setScrollFactor(0).setDepth(MODAL_DEPTH);
  modalByScene.set(scene, modal);

  const blocker = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, mobile ? 0.82 : 0.78)
    .setInteractive({ useHandCursor: false });

  const panel = scene.add.graphics();
  const image = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, CONTROLS_TEXTURE_KEY).setOrigin(0.5);
  const maxW = GAME_WIDTH * (mobile ? 0.94 : 0.9);
  const maxH = GAME_HEIGHT * (mobile ? 0.78 : 0.86);
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

  const dismiss = (): void => closeControlsModal(scene, onClose);

  const closeBtn = scene.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - panelH / 2 - 18, mobile ? '✕ CLOSE' : '✕', {
      fontFamily: UI_FONTS.body,
      fontSize: mobile ? '18px' : '16px',
      color: '#ffc857',
      fontStyle: 'bold',
      backgroundColor: '#2e1a4e',
      padding: { x: mobile ? 14 : 10, y: mobile ? 8 : 6 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: !mobile });

  closeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    pointer.event.stopPropagation();
    dismiss();
  });

  const closeLabel = scene.add
    .text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + panelH / 2 + 22,
      mobile ? 'Tap CLOSE or anywhere outside the image' : 'Tap anywhere to close',
      {
        fontFamily: UI_FONTS.body,
        fontSize: mobile ? '13px' : '14px',
        color: '#a89bc4',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 80 },
      },
    )
    .setOrigin(0.5);

  blocker.on('pointerdown', dismiss);

  if (mobile) {
    image.setInteractive({ useHandCursor: false });
  } else {
    image.setInteractive({ useHandCursor: true });
    image.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });
  }

  modal.add([blocker, panel, image, closeBtn, closeLabel]);
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

  const depth = options.depth ?? (isMobileTouchDevice() ? 950 : BUTTON_DEPTH);

  if (options.onClose) {
    onCloseByScene.set(scene, options.onClose);
  }

  const button = createIconButton(
    scene,
    0,
    0,
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
  attachControlsHoverTooltip(scene, button);

  const reposition = (): void => {
    const { x, y } = getControlsButtonPosition(scene);
    button.setPosition(x, y);
  };
  reposition();

  if (isMobileTouchDevice()) {
    scene.scale.on('resize', reposition);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off('resize', reposition);
    });
  }

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    closeControlsModal(scene);
    onCloseByScene.delete(scene);
    button.destroy();
  });

  return button;
}

/** Close controls panel if open — e.g. before boss exit so nothing blocks the scene. */
export function dismissControlsModal(scene: Phaser.Scene): void {
  const wasOpen = modalByScene.has(scene);
  const onClose = onCloseByScene.get(scene);
  closeControlsModal(scene);
  if (wasOpen) {
    onClose?.();
  }
}
