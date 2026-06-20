import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getSecondaryProjectileConfig } from '../config/secondaryProjectiles';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import type { CharacterId } from '../types/game';
import { UI_COLORS, UI_FONTS } from './theme';
import { isMobileTouchDevice } from '../utils/device';

const EDGE = 16;
const JOYSTICK_BASE_RADIUS = 58;
const JOYSTICK_THUMB_RADIUS = 26;
const JOYSTICK_MAX_DRAG = 42;
const JOYSTICK_DEADZONE = 0.18;
const ABILITY_RADIUS = 46;
const SECONDARY_RADIUS = 42;
const BTN_GAP = 10;

const JOYSTICK_CENTER = {
  x: EDGE + JOYSTICK_BASE_RADIUS,
  y: GAME_HEIGHT - EDGE - JOYSTICK_BASE_RADIUS,
};
const ABILITY_BTN = {
  x: GAME_WIDTH - EDGE - ABILITY_RADIUS,
  y: GAME_HEIGHT - EDGE - ABILITY_RADIUS,
  radius: ABILITY_RADIUS,
};
const SECONDARY_BTN = {
  x: ABILITY_BTN.x - ABILITY_RADIUS - BTN_GAP - SECONDARY_RADIUS,
  y: ABILITY_BTN.y,
  radius: SECONDARY_RADIUS,
};

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

export class MobileControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private thumb?: Phaser.GameObjects.Arc;
  private abilityCircle?: Phaser.GameObjects.Arc;
  private secondaryCircle?: Phaser.GameObjects.Arc;
  private enabled = true;
  private joystickPointerId: number | null = null;
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

    this.thumb = scene.add.circle(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, JOYSTICK_THUMB_RADIUS, 0xffc857, 0.75);
    this.thumb.setStrokeStyle(2, 0xffffff, 0.9);

    const abilityBtn = this.createActionButton(
      ABILITY_BTN.x,
      ABILITY_BTN.y,
      ABILITY_BTN.radius,
      UI_COLORS.orange,
      'SPEC',
      char.abilityName.split(' ')[0]?.slice(0, 4).toUpperCase() ?? 'SPEC',
    );
    this.abilityCircle = abilityBtn.circle;

    const secondaryBtn = this.createActionButton(
      SECONDARY_BTN.x,
      SECONDARY_BTN.y,
      SECONDARY_BTN.radius,
      UI_COLORS.cyan,
      'ALT',
      secondary.name.split(' ')[0]?.slice(0, 4).toUpperCase() ?? 'ALT',
    );
    this.secondaryCircle = secondaryBtn.circle;

    this.container.add([base, this.thumb, abilityBtn.container, secondaryBtn.container]);

    const updateStick = (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== pointer.id) return;
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
      if (this.joystickPointerId !== pointer.id) return;
      this.joystickPointerId = null;
      this.stickX = 0;
      this.stickY = 0;
      this.thumb?.setPosition(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y);
    };

    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled || !pointer.isDown) return;

      if (dist(pointer.x, pointer.y, ABILITY_BTN.x, ABILITY_BTN.y) <= ABILITY_BTN.radius) {
        this.abilityQueued = true;
        this.abilityCircle?.setAlpha(1);
        return;
      }

      if (dist(pointer.x, pointer.y, SECONDARY_BTN.x, SECONDARY_BTN.y) <= SECONDARY_BTN.radius) {
        this.secondaryQueued = true;
        this.secondaryCircle?.setAlpha(1);
        return;
      }

      if (
        this.joystickPointerId === null &&
        dist(pointer.x, pointer.y, JOYSTICK_CENTER.x, JOYSTICK_CENTER.y) <= JOYSTICK_BASE_RADIUS + 12
      ) {
        this.joystickPointerId = pointer.id;
        updateStick(pointer);
      }
    };

    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (dist(pointer.x, pointer.y, ABILITY_BTN.x, ABILITY_BTN.y) <= ABILITY_BTN.radius + 8) {
        this.abilityCircle?.setAlpha(0.82);
      }
      if (dist(pointer.x, pointer.y, SECONDARY_BTN.x, SECONDARY_BTN.y) <= SECONDARY_BTN.radius + 8) {
        this.secondaryCircle?.setAlpha(0.82);
      }
      resetStick(pointer);
    };

    scene.input.on('pointerdown', onPointerDown);
    scene.input.on('pointermove', updateStick);
    scene.input.on('pointerup', onPointerUp);
    scene.input.on('pointerupoutside', onPointerUp);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', onPointerDown);
      scene.input.off('pointermove', updateStick);
      scene.input.off('pointerup', onPointerUp);
      scene.input.off('pointerupoutside', onPointerUp);
      this.container.destroy();
    });
  }

  isActive(): boolean {
    return isMobileTouchDevice() && this.enabled && this.container.visible;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.joystickPointerId = null;
      this.stickX = 0;
      this.stickY = 0;
      this.thumb?.setPosition(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y);
      this.abilityCircle?.setAlpha(0.82);
      this.secondaryCircle?.setAlpha(0.82);
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
  ): { container: Phaser.GameObjects.Container; circle: Phaser.GameObjects.Arc } {
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

    btn.add([circle, label, hint]);
    return { container: btn, circle };
  }
}
