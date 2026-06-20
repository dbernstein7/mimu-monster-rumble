import Phaser from 'phaser';
import {
  applyAttackIconSizing,
  getPrimaryAbilityTextureKey,
  getSecondaryAbilityTextureKey,
} from '../config/characterAttacks';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import type { CharacterId } from '../types/game';
import type { Player } from '../entities/Player';
import { UI_COLORS } from './theme';
import { isMobileTouchDevice } from '../utils/device';

const EDGE = 22;
const JOYSTICK_BASE_RADIUS = 82;
const JOYSTICK_THUMB_RADIUS = 36;
const JOYSTICK_MAX_DRAG = 62;
const JOYSTICK_DEADZONE = 0.16;
const ABILITY_RADIUS = 60;
const SECONDARY_RADIUS = 56;
const BTN_GAP = 14;
const ICON_PX = 72;

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

interface PowerButton {
  x: number;
  y: number;
  radius: number;
  container: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  cooldownGfx: Phaser.GameObjects.Graphics;
}

export class MobileControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private thumb?: Phaser.GameObjects.Arc;
  private abilityBtn?: PowerButton;
  private secondaryBtn?: PowerButton;
  private enabled = true;
  private joystickPointerId: number | null = null;
  private stickX = 0;
  private stickY = 0;
  private abilityQueued = false;
  private secondaryQueued = false;
  private player?: Player;

  constructor(scene: Phaser.Scene, characterId: CharacterId) {
    this.scene = scene;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    if (!isMobileTouchDevice()) {
      this.container.setVisible(false);
      return;
    }

    const base = scene.add.circle(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, JOYSTICK_BASE_RADIUS, 0x140a24, 0.6);
    base.setStrokeStyle(4, UI_COLORS.panelHighlight, 0.9);

    this.thumb = scene.add.circle(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, JOYSTICK_THUMB_RADIUS, 0xffc857, 0.8);
    this.thumb.setStrokeStyle(3, 0xffffff, 0.95);

    const primaryKey = getPrimaryAbilityTextureKey(scene, characterId);
    const secondaryKey = getSecondaryAbilityTextureKey(scene, characterId);

    this.abilityBtn = this.createPowerButton(
      ABILITY_BTN.x,
      ABILITY_BTN.y,
      ABILITY_BTN.radius,
      primaryKey,
      UI_COLORS.orange,
    );
    this.secondaryBtn = this.createPowerButton(
      SECONDARY_BTN.x,
      SECONDARY_BTN.y,
      SECONDARY_BTN.radius,
      secondaryKey,
      UI_COLORS.cyan,
    );

    this.container.add([
      base,
      this.thumb,
      this.abilityBtn.container,
      this.secondaryBtn.container,
    ]);

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

      if (
        this.player?.canUseAbility() &&
        dist(pointer.x, pointer.y, ABILITY_BTN.x, ABILITY_BTN.y) <= ABILITY_BTN.radius + 8
      ) {
        this.abilityQueued = true;
        this.flashButton(this.abilityBtn);
        return;
      }

      if (
        this.player?.canUseSecondaryProjectile() &&
        dist(pointer.x, pointer.y, SECONDARY_BTN.x, SECONDARY_BTN.y) <= SECONDARY_BTN.radius + 8
      ) {
        this.secondaryQueued = true;
        this.flashButton(this.secondaryBtn);
        return;
      }

      if (
        this.joystickPointerId === null &&
        dist(pointer.x, pointer.y, JOYSTICK_CENTER.x, JOYSTICK_CENTER.y) <= JOYSTICK_BASE_RADIUS + 16
      ) {
        this.joystickPointerId = pointer.id;
        updateStick(pointer);
      }
    };

    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
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

  update(player: Player): void {
    this.player = player;
    if (!this.enabled || !this.abilityBtn || !this.secondaryBtn) return;

    this.drawButtonCooldown(
      this.abilityBtn,
      player.canUseAbility(),
      player.getAbilityCooldownProgress(),
    );
    this.drawButtonCooldown(
      this.secondaryBtn,
      player.canUseSecondaryProjectile(),
      player.getSecondaryCooldownProgress(),
    );
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
      this.abilityBtn?.cooldownGfx.clear();
      this.secondaryBtn?.cooldownGfx.clear();
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

  private flashButton(btn?: PowerButton): void {
    if (!btn || !(btn.icon instanceof Phaser.GameObjects.Image)) return;
    const icon = btn.icon;
    icon.setScale(icon.scale * 0.92);
    this.scene.time.delayedCall(80, () => {
      if (icon.active) {
        applyAttackIconSizing(icon, ICON_PX);
      }
    });
  }

  private drawButtonCooldown(btn: PowerButton, ready: boolean, progress: number): void {
    btn.cooldownGfx.clear();
    btn.ring.setStrokeStyle(4, ready ? UI_COLORS.success : UI_COLORS.panelHighlight, ready ? 1 : 0.75);
    if (btn.icon instanceof Phaser.GameObjects.Image) {
      btn.icon.setAlpha(ready ? 1 : 0.85);
    }

    if (ready) return;

    const remaining = Phaser.Math.Clamp(1 - progress, 0, 1);
    if (remaining <= 0) return;

    const start = Phaser.Math.DegToRad(-90);
    const end = start + Phaser.Math.PI2 * remaining;
    btn.cooldownGfx.fillStyle(0x0d0618, 0.62);
    btn.cooldownGfx.beginPath();
    btn.cooldownGfx.moveTo(0, 0);
    btn.cooldownGfx.arc(0, 0, btn.radius - 2, start, end, false);
    btn.cooldownGfx.closePath();
    btn.cooldownGfx.fillPath();
  }

  private createPowerButton(
    x: number,
    y: number,
    radius: number,
    textureKey: string | null,
    fallbackColor: number,
  ): PowerButton {
    const btn = this.scene.add.container(x, y);
    const ring = this.scene.add.circle(0, 0, radius, 0x140a24, 0.72);
    ring.setStrokeStyle(4, UI_COLORS.panelHighlight, 0.85);

    let icon: Phaser.GameObjects.Image | undefined;
    if (textureKey) {
      icon = this.scene.add.image(0, 0, textureKey).setOrigin(0.5);
      applyAttackIconSizing(icon, ICON_PX);
    } else {
      const fallback = this.scene.add.circle(0, 0, radius * 0.55, fallbackColor, 0.9);
      btn.add(fallback);
    }

    const cooldownGfx = this.scene.add.graphics();

    const hit = this.scene.add
      .circle(0, 0, radius, 0x000000, 0.001)
      .setInteractive({ useHandCursor: false });

    hit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, ev?: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation();
    });

    if (icon) btn.add(icon);
    btn.add([ring, cooldownGfx, hit]);
    return {
      x,
      y,
      radius,
      container: btn,
      ring,
      icon: icon ?? ring,
      cooldownGfx,
    };
  }
}
