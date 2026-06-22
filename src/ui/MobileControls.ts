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
import { getMobileGameUiInsets } from '../utils/mobileLayout';
import { unlockMobileAudio } from '../utils/audioUnlock';

const EDGE = 22;
const JOYSTICK_MAX_DRAG = 62;
const JOYSTICK_DEADZONE = 0.16;
const ABILITY_RADIUS = 60;
const SECONDARY_RADIUS = 56;
const BTN_GAP = 14;
const ICON_PX = 72;
const BTN_HIT_PAD = 10;

function mobileControlPositions(scene: Phaser.Scene): {
  ability: { x: number; y: number; radius: number };
  secondary: { x: number; y: number; radius: number };
} {
  const inset = getMobileGameUiInsets(scene);
  const ability = {
    x: GAME_WIDTH - inset.right - ABILITY_RADIUS,
    y: GAME_HEIGHT - inset.bottom - ABILITY_RADIUS,
    radius: ABILITY_RADIUS,
  };
  const secondary = {
    x: ability.x - ABILITY_RADIUS - BTN_GAP - SECONDARY_RADIUS,
    y: ability.y,
    radius: SECONDARY_RADIUS,
  };
  return { ability, secondary };
}

function desktopControlPositions(): {
  ability: { x: number; y: number; radius: number };
  secondary: { x: number; y: number; radius: number };
} {
  const ability = {
    x: GAME_WIDTH - EDGE - ABILITY_RADIUS,
    y: GAME_HEIGHT - EDGE - ABILITY_RADIUS,
    radius: ABILITY_RADIUS,
  };
  const secondary = {
    x: ability.x - ABILITY_RADIUS - BTN_GAP - SECONDARY_RADIUS,
    y: ability.y,
    radius: SECONDARY_RADIUS,
  };
  return { ability, secondary };
}

function getControlPositions(scene: Phaser.Scene): {
  ability: { x: number; y: number; radius: number };
  secondary: { x: number; y: number; radius: number };
} {
  return isMobileTouchDevice() ? mobileControlPositions(scene) : desktopControlPositions();
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

function isOnPowerButton(
  x: number,
  y: number,
  ability: { x: number; y: number; radius: number },
  secondary: { x: number; y: number; radius: number },
): boolean {
  if (dist(x, y, ability.x, ability.y) <= ability.radius + BTN_HIT_PAD) return true;
  return dist(x, y, secondary.x, secondary.y) <= secondary.radius + BTN_HIT_PAD;
}

interface PowerButton {
  x: number;
  y: number;
  radius: number;
  container: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  cooldownGfx: Phaser.GameObjects.Graphics;
  hit: Phaser.GameObjects.Arc;
}

export class MobileControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private abilityBtn?: PowerButton;
  private secondaryBtn?: PowerButton;
  private controlPos: ReturnType<typeof getControlPositions> = desktopControlPositions();
  private enabled = true;
  private joystickPointerId: number | null = null;
  private joystickOriginX = 0;
  private joystickOriginY = 0;
  private stickX = 0;
  private stickY = 0;
  private abilityQueued = false;
  private secondaryQueued = false;
  private player?: Player;

  constructor(scene: Phaser.Scene, characterId: CharacterId, player?: Player) {
    this.scene = scene;
    this.player = player;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    if (!isMobileTouchDevice()) {
      this.container.setVisible(false);
      return;
    }

    const primaryKey = getPrimaryAbilityTextureKey(scene, characterId);
    const secondaryKey = getSecondaryAbilityTextureKey(scene, characterId);

    this.controlPos = getControlPositions(scene);

    this.abilityBtn = this.createPowerButton(
      this.controlPos.ability.x,
      this.controlPos.ability.y,
      this.controlPos.ability.radius,
      primaryKey,
      UI_COLORS.orange,
    );
    this.secondaryBtn = this.createPowerButton(
      this.controlPos.secondary.x,
      this.controlPos.secondary.y,
      this.controlPos.secondary.radius,
      secondaryKey,
      UI_COLORS.cyan,
    );

    this.abilityBtn.hit.on('pointerdown', () => this.queueAbilityPress());
    this.secondaryBtn.hit.on('pointerdown', () => this.queueSecondaryPress());

    this.container.add([this.abilityBtn.container, this.secondaryBtn.container]);

    const updateStick = (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== pointer.id) return;
      const dx = pointer.x - this.joystickOriginX;
      const dy = pointer.y - this.joystickOriginY;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, JOYSTICK_MAX_DRAG);
      const angle = Math.atan2(dy, dx);
      this.stickX = (Math.cos(angle) * clamped) / JOYSTICK_MAX_DRAG;
      this.stickY = (Math.sin(angle) * clamped) / JOYSTICK_MAX_DRAG;
    };

    const resetStick = (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== pointer.id) return;
      this.joystickPointerId = null;
      this.stickX = 0;
      this.stickY = 0;
    };

    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled || !pointer.isDown) return;
      unlockMobileAudio(this.scene.game);
      if (this.joystickPointerId !== null) return;
      if (isOnPowerButton(pointer.x, pointer.y, this.controlPos.ability, this.controlPos.secondary)) return;

      this.joystickPointerId = pointer.id;
      this.joystickOriginX = pointer.x;
      this.joystickOriginY = pointer.y;
      updateStick(pointer);
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

  bindPlayer(player: Player): void {
    this.player = player;
  }

  update(player: Player): void {
    this.player = player;
    if (!this.enabled || !this.abilityBtn || !this.secondaryBtn) return;

    this.drawPrimaryCooldown(player);
    this.drawSecondaryCooldown(player);
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

  private queueAbilityPress(): void {
    unlockMobileAudio(this.scene.game);
    if (!this.enabled || !this.player?.canUseAbility()) return;
    this.abilityQueued = true;
    this.flashButton(this.abilityBtn);
  }

  private queueSecondaryPress(): void {
    unlockMobileAudio(this.scene.game);
    if (!this.enabled || !this.player?.canUseSecondaryProjectile()) return;
    this.secondaryQueued = true;
    this.flashButton(this.secondaryBtn);
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

  /** Same ready/cooldown rules as the desktop HUD ability ring. */
  private drawPrimaryCooldown(player: Player): void {
    if (!this.abilityBtn) return;
    const btn = this.abilityBtn;
    const ready = player.canUseAbility();
    const progress = player.getAbilityCooldownProgress();
    btn.cooldownGfx.clear();
    btn.ring.setStrokeStyle(4, ready ? UI_COLORS.success : UI_COLORS.panelHighlight, ready ? 1 : 0.75);
    if (btn.icon instanceof Phaser.GameObjects.Image) {
      btn.icon.setAlpha(ready ? 1 : 0.85);
    }

    if (ready) return;

    const start = Phaser.Math.DegToRad(-90);
    const end = start + Phaser.Math.PI2 * progress;
    btn.cooldownGfx.lineStyle(4, UI_COLORS.gold, 1);
    btn.cooldownGfx.beginPath();
    btn.cooldownGfx.arc(0, 0, btn.radius - 2, start, end, false);
    btn.cooldownGfx.strokePath();

    const remaining = Phaser.Math.Clamp(1 - progress, 0, 1);
    if (remaining <= 0) return;
    const overlayEnd = start + Phaser.Math.PI2 * remaining;
    btn.cooldownGfx.fillStyle(0x0d0618, 0.55);
    btn.cooldownGfx.beginPath();
    btn.cooldownGfx.moveTo(0, 0);
    btn.cooldownGfx.arc(0, 0, btn.radius - 2, start, overlayEnd, false);
    btn.cooldownGfx.closePath();
    btn.cooldownGfx.fillPath();
  }

  /** Same ready/cooldown rules as the desktop HUD secondary ring. */
  private drawSecondaryCooldown(player: Player): void {
    if (!this.secondaryBtn) return;
    const btn = this.secondaryBtn;
    const ready = player.canUseSecondaryProjectile();
    const progress = player.getSecondaryCooldownProgress();
    btn.cooldownGfx.clear();
    btn.ring.setStrokeStyle(4, ready ? UI_COLORS.success : UI_COLORS.panelHighlight, ready ? 1 : 0.75);
    if (btn.icon instanceof Phaser.GameObjects.Image) {
      btn.icon.setAlpha(ready ? 1 : 0.85);
    }

    if (ready) return;

    const onCooldown = !player.secondaryReady;
    if (!onCooldown) return;

    const start = Phaser.Math.DegToRad(-90);
    const end = start + Phaser.Math.PI2 * progress;
    btn.cooldownGfx.lineStyle(4, UI_COLORS.cyan, 1);
    btn.cooldownGfx.beginPath();
    btn.cooldownGfx.arc(0, 0, btn.radius - 2, start, end, false);
    btn.cooldownGfx.strokePath();

    const remaining = Phaser.Math.Clamp(1 - progress, 0, 1);
    if (remaining <= 0) return;
    const overlayEnd = start + Phaser.Math.PI2 * remaining;
    btn.cooldownGfx.fillStyle(0x0d0618, 0.55);
    btn.cooldownGfx.beginPath();
    btn.cooldownGfx.moveTo(0, 0);
    btn.cooldownGfx.arc(0, 0, btn.radius - 2, start, overlayEnd, false);
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
      hit,
    };
  }
}
