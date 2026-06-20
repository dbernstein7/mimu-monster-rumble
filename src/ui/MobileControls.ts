import Phaser from 'phaser';
import { getCharacter } from '../config/characters';
import { getSecondaryProjectileConfig } from '../config/secondaryProjectiles';
import type { CharacterId } from '../types/game';
import { UI_COLORS, UI_FONTS } from './theme';
import { getMobileControlLayout, isMobileTouchDevice } from '../utils/device';

const JOYSTICK_BASE_RADIUS = 54;
const JOYSTICK_THUMB_RADIUS = 24;
const JOYSTICK_MAX_DRAG = 38;
const JOYSTICK_DEADZONE = 0.18;

export class MobileControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private thumb?: Phaser.GameObjects.Arc;
  private layout = getMobileControlLayout();
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

    // Joystick + two attack buttons need simultaneous touch pointers.
    scene.input.addPointer(2);
    scene.input.setTopOnly(false);

    this.layout = getMobileControlLayout();
    const { joystick, ability, secondary: secondaryBtn } = this.layout;

    const base = scene.add.circle(joystick.x, joystick.y, JOYSTICK_BASE_RADIUS, 0x140a24, 0.55);
    base.setStrokeStyle(3, UI_COLORS.panelHighlight, 0.85);
    base.setInteractive({ useHandCursor: false });

    this.thumb = scene.add.circle(joystick.x, joystick.y, JOYSTICK_THUMB_RADIUS, 0xffc857, 0.75);
    this.thumb.setStrokeStyle(2, 0xffffff, 0.9);

    const abilityButton = this.createActionButton(
      ability.x,
      ability.y,
      ability.radius,
      UI_COLORS.orange,
      'SPEC',
      char.abilityName.split(' ')[0]?.slice(0, 4).toUpperCase() ?? 'SPEC',
      () => {
        this.abilityQueued = true;
      },
    );

    const secondaryButton = this.createActionButton(
      secondaryBtn.x,
      secondaryBtn.y,
      secondaryBtn.radius,
      UI_COLORS.cyan,
      'ALT',
      secondary.name.split(' ')[0]?.slice(0, 4).toUpperCase() ?? 'ALT',
      () => {
        this.secondaryQueued = true;
      },
    );

    this.container.add([base, this.thumb, abilityButton, secondaryButton]);

    const updateStick = (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== pointer.id) return;
      const dx = pointer.x - this.layout.joystick.x;
      const dy = pointer.y - this.layout.joystick.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, JOYSTICK_MAX_DRAG);
      const angle = Math.atan2(dy, dx);
      this.stickX = (Math.cos(angle) * clamped) / JOYSTICK_MAX_DRAG;
      this.stickY = (Math.sin(angle) * clamped) / JOYSTICK_MAX_DRAG;
      this.thumb?.setPosition(
        this.layout.joystick.x + Math.cos(angle) * clamped,
        this.layout.joystick.y + Math.sin(angle) * clamped,
      );
    };

    const resetStick = (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== pointer.id) return;
      this.pointerId = null;
      this.stickX = 0;
      this.stickY = 0;
      this.thumb?.setPosition(this.layout.joystick.x, this.layout.joystick.y);
    };

    base.on('pointerdown', (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event?: Phaser.Types.Input.EventData) => {
      event?.stopPropagation();
      if (!this.enabled) return;
      if (this.pointerId !== null && this.pointerId !== pointer.id) return;
      this.pointerId = pointer.id;
      updateStick(pointer);
    });

    scene.input.on('pointermove', updateStick);
    scene.input.on('pointerup', resetStick);
    scene.input.on('pointerupoutside', resetStick);

    scene.scale.on('resize', () => {
      this.layout = getMobileControlLayout();
    });

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
      this.thumb?.setPosition(this.layout.joystick.x, this.layout.joystick.y);
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
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const hint = this.scene.add
      .text(0, 12, subLabel, {
        fontFamily: UI_FONTS.body,
        fontSize: '9px',
        color: '#f5f0ff',
      })
      .setOrigin(0.5);

    const hit = this.scene.add.circle(0, 0, radius + 6, 0x000000, 0.001).setInteractive({ useHandCursor: false });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event?: Phaser.Types.Input.EventData) => {
      event?.stopPropagation();
      if (!this.enabled) return;
      onPress();
      circle.setAlpha(1);
      pointer.event?.stopPropagation?.();
    });
    hit.on('pointerup', () => circle.setAlpha(0.82));
    hit.on('pointerout', () => circle.setAlpha(0.82));

    btn.add([circle, label, hint, hit]);
    return btn;
  }
}
