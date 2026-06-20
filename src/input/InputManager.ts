import Phaser from 'phaser';
import type { MobileControls } from '../ui/MobileControls';

export interface MovementVector {
  x: number;
  y: number;
}

export class InputManager {
  private scene: Phaser.Scene;
  private mobileControls?: MobileControls;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
    P: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
  };
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private lastAbilityBtn = false;
  private lastSecondaryBtn = false;
  private lastPauseBtn = false;
  private lastConfirmBtn = false;
  private lastPauseQuitBtn = false;
  private lastDpadUp = false;
  private lastDpadDown = false;
  private lastDpadLeft = false;
  private lastDpadRight = false;
  lastMovement: MovementVector = { x: 0, y: 0 };

  setMobileControls(controls: MobileControls | undefined): void {
    this.mobileControls = controls;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.Q,
    ]);
    this.cursors = kb.createCursorKeys();
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ESC: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      P: kb.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      ENTER: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      Q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
    };

    if (scene.input.gamepad) {
      scene.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        this.pad = pad;
      });
      const existing = scene.input.gamepad.gamepads;
      if (existing?.[0]) this.pad = existing[0];
    }
  }

  update(): void {
    const pads = this.scene.input.gamepad?.gamepads;
    if (pads?.[0]?.connected) this.pad = pads[0];
    if (this.pad && !this.pad.up) this.lastDpadUp = false;
    if (this.pad && !this.pad.down) this.lastDpadDown = false;
    if (this.pad && !this.pad.left) this.lastDpadLeft = false;
    if (this.pad && !this.pad.right) this.lastDpadRight = false;
    this.lastMovement = this.getMovement();
  }

  getMovement(): MovementVector {
    if (this.mobileControls?.isActive()) {
      return this.mobileControls.getMovement();
    }

    let x = 0;
    let y = 0;
    let fromKeyboard = false;

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      x -= 1;
      fromKeyboard = true;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      x += 1;
      fromKeyboard = true;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown) {
      y -= 1;
      fromKeyboard = true;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      y += 1;
      fromKeyboard = true;
    }

    if (fromKeyboard && x !== 0 && y !== 0) {
      x *= 0.707;
      y *= 0.707;
    }

    if (this.pad) {
      const deadzone = 0.2;
      const stickX = this.pad.leftStick?.x ?? 0;
      const stickY = this.pad.leftStick?.y ?? 0;

      if (Math.abs(stickX) > deadzone || Math.abs(stickY) > deadzone) {
        x = stickX;
        y = stickY;
      } else if (this.pad.left || this.pad.up || this.pad.right || this.pad.down) {
        if (this.pad.left) x = -1;
        if (this.pad.right) x = 1;
        if (this.pad.up) y = -1;
        if (this.pad.down) y = 1;
      }

      const len = Math.sqrt(x * x + y * y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
    }

    return { x, y };
  }

  isAbilityJustPressed(): boolean {
    if (this.mobileControls?.isActive()) {
      return this.mobileControls.consumeAbilityPress();
    }
    const keyPressed = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    const btnPressed = this.isGamepadButtonJustPressed(0, 'ability');
    return keyPressed || btnPressed;
  }

  isSecondaryProjectileJustPressed(): boolean {
    if (this.mobileControls?.isActive()) {
      return this.mobileControls.consumeSecondaryPress();
    }
    const keyPressed = Phaser.Input.Keyboard.JustDown(this.keys.Q);
    const btnPressed = this.isGamepadButtonJustPressed(7, 'secondary');
    return keyPressed || btnPressed;
  }

  isPauseJustPressed(): boolean {
    const keyPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.ESC) || Phaser.Input.Keyboard.JustDown(this.keys.P);
    const btnPressed = this.isGamepadButtonJustPressed(9, 'pause');
    return keyPressed || btnPressed;
  }

  /** Q / gamepad B while on the pause overlay. */
  isPauseQuitJustPressed(): boolean {
    const keyPressed = Phaser.Input.Keyboard.JustDown(this.keys.Q);
    const btnPressed = this.isGamepadButtonJustPressed(1, 'pauseQuit');
    return keyPressed || btnPressed;
  }

  isConfirmJustPressed(): boolean {
    const keyPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.ENTER);
    const btnPressed = this.isGamepadButtonJustPressed(0, 'confirm');
    return keyPressed || btnPressed;
  }

  isMenuLeftJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors.left!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.A) ||
      this.isDpadJustPressed('left')
    );
  }

  isMenuRightJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors.right!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.D) ||
      this.isDpadJustPressed('right')
    );
  }

  isMenuUpJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W) ||
      this.isDpadJustPressed('up')
    );
  }

  isMenuDownJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.S) ||
      this.isDpadJustPressed('down')
    );
  }

  isGamepadConnected(): boolean {
    return this.pad?.connected ?? false;
  }

  private isDpadJustPressed(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (!this.pad) return false;
    const pressed = this.pad[direction];
    const trackerKey = `lastDpad${direction.charAt(0).toUpperCase()}${direction.slice(1)}` as
      | 'lastDpadUp'
      | 'lastDpadDown'
      | 'lastDpadLeft'
      | 'lastDpadRight';
    const wasPressed = this[trackerKey];
    const justPressed = pressed && !wasPressed;
    this[trackerKey] = pressed;
    return justPressed;
  }

  private isGamepadButtonJustPressed(
    index: number,
    tracker: 'ability' | 'secondary' | 'pause' | 'confirm' | 'pauseQuit',
  ): boolean {
    if (!this.pad) return false;
    const pressed = this.pad.buttons[index]?.pressed ?? false;
    const trackers = {
      ability: 'lastAbilityBtn',
      secondary: 'lastSecondaryBtn',
      pause: 'lastPauseBtn',
      confirm: 'lastConfirmBtn',
      pauseQuit: 'lastPauseQuitBtn',
    } as const;
    const key = trackers[tracker];
    const wasPressed = this[key];
    const justPressed = pressed && !wasPressed;
    this[key] = pressed;
    return justPressed;
  }
}
