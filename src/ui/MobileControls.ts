import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getSecondaryProjectileConfig } from '../config/secondaryProjectiles';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import type { CharacterId } from '../types/game';
import { UI_COLORS, UI_FONTS } from './theme';
import { isMobileTouchDevice } from '../utils/device';

const JOYSTICK_CENTER = { x: 108, y: GAME_HEIGHT - 92 };
const JOYSTICK_BASE_RADIUS = 58;
const JOYSTICK_THUMB_RADIUS = 26;
const JOYSTICK_MAX_DRAG = 42;
const JOYSTICK_DEADZONE = 0.18;

const ABILITY_BTN = { x: GAME_WIDTH - 78, y: GAME_HEIGHT - 108, radius: 46 };
const SECONDARY_BTN = { x: GAME_WIDTH - 168, y: GAME_HEIGHT - 72, radius: 42 };

export class MobileControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private thumb?: Phaser.GameObjects.Arc;
  private enabled = true;
  private pointerId: number | null = null;
  private stickX = 0;
  private stickY = 0;
  private abilityQueued = false;
  private secondaryQueued = false;

  constructor(scene: Phaser.Scene, characterId: CharacterId) {
    this.scene = scene;
    const char = getCharacter(characterId);
    const secondary = getSecondaryProjectileConfig(characterId);

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    if (!isMobileTouchDevice()) {
      this.container.setVisible(false);
      return;
    }

    const base = scene.add.circle(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, JOYSTICK_BASE_RADIUS, 0x140a24, 0.55);
    base.setStrokeStyle(3, UI_COLORS.panelHighlight, 0.85);
    base.setInteractive({ useHandCursor: false });

    this.thumb = scene.add.circle(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, JOYSTICK_THUMB_RADIUS, 0xffc857, 0.75);
    this.thumb.setStrokeStyle(2, 0xffffff, 0.9);

    const abilityBtn = this.createActionButton(
      ABILITY_BTN.x,
      ABILITY_BTN.y,
      ABILITY_BTN.radius,
      UI_COLORS.orange,
      'SPEC',
      char.abilityName.split(' ')[0]?.slice(0, 4).toUpperCase() ?? 'SPEC',
      () => {
        this.abilityQueued = true;
      },
    );

    const secondaryBtn = this.createActionButton(
      SECONDARY_BTN.x,
      SECONDARY_BTN.y,
      SECONDARY_BTN.radius,
      UI_COLORS.cyan,
      'ALT',
      secondary.name.split(' ')[0]?.slice(0, 4).toUpperCase() ?? 'ALT',
      () => {
        this.secondaryQueued = true;
      },
    );

    this.container.add([base, this.thumb, abilityBtn, secondaryBtn]);

    const updateStick = (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== pointer.id) return;
      const dx = pointer.x - JOYSTICK_CENTER.x;
      const dy = pointer.y - JOYSTICK_CENTER.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, JOYSTICK_MAX_DRAG);
      const angle = Math.atan2(dy, dx);
      this.stickX = (Math.cos(angle) * clamped) / JOYSTICK_MAX_DRAG;
      this.stickY = (Math.sin(angle) * clamped) / JOYSTICK_MAX_DRAG;
      this.thumb?.setPosition(
        JOYSTICK_CENTER.x + Math.cos(angle) * clamped,
        JOYSTICK_CENTER.y + Math.sin(angle) * clamped,
      );
    };

    const resetStick = (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== pointer.id) return;
      this.pointerId = null;
      this.stickX = 0;
      this.stickY = 0;
      this.thumb?.setPosition(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y);
    };

    base.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled || this.pointerId !== null) return;
      this.pointerId = pointer.id;
      updateStick(pointer);
    });

    scene.input.on('pointermove', updateStick);
    scene.input.on('pointerup', resetStick);
    scene.input.on('pointerupoutside', resetStick);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointermove', updateStick);
      scene.input.off('pointerup', resetStick);
      scene.input.off('pointerupoutside', resetStick);
      this.container.destroy();
    });
  }

  isActive(): boolean {
    return isMobileTouchDevice() && this.enabled && this.container.visible;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pointerId = null;
      this.stickX = 0;
      this.stickY = 0;
      this.thumb?.setPosition(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y);
    }
  }

  getMovement(): { x: number; y: number } {
    const len = Math.hypot(this.stickX, this.stickY);
    if (len < JOYSTICK_DEADZONE) return { x: 0, y: 0 };
    const scale = Math.min(1, len);
    return { x: (this.stickX / len) * scale, y: (this.stickY / len) * scale };
  }

  consumeAbilityPress(): boolean {
    if (!this.abilityQueued) return false;
    this.abilityQueued = false;
    return true;
  }

  consumeSecondaryPress(): boolean {
    if (!this.secondaryQueued) return false;
    this.secondaryQueued = false;
    return true;
  }

  private createActionButton(
    x: number,
    y: number,
    radius: number,
    color: number,
    shortLabel: string,
    subLabel: string,
    onPress: () => void,
  ): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);
    const circle = this.scene.add.circle(0, 0, radius, color, 0.82);
    circle.setStrokeStyle(3, 0xffffff, 0.85);
    const label = this.scene.add
      .text(0, -6, shortLabel, {
        fontFamily: UI_FONTS.body,
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const hint = this.scene.add
      .text(0, 14, subLabel, {
        fontFamily: UI_FONTS.body,
        fontSize: '10px',
        color: '#f5f0ff',
      })
      .setOrigin(0.5);

    const hit = this.scene.add.circle(0, 0, radius, 0x000000, 0.001).setInteractive({ useHandCursor: false });
    hit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event?: Phaser.Types.Input.EventData) => {
      event?.stopPropagation();
      if (!this.enabled) return;
      onPress();
      circle.setAlpha(1);
    });
    hit.on('pointerup', () => circle.setAlpha(0.82));
    hit.on('pointerout', () => circle.setAlpha(0.82));

    btn.add([circle, label, hint, hit]);
    return btn;
  }
}
