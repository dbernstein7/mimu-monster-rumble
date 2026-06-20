import Phaser from 'phaser';
import { guestLogin, login, register } from '../services/firebase';
import { GAME_WIDTH } from '../config/gameConstants';
import {
  drawMenuBackdrop,
  createGlowTitle,
  createStyledButton,
  drawPanel,
  mountFullscreenButton,
  UI_FONTS,
} from '../ui/theme';
import { FRESH_RUN_SELECT_DATA } from '../utils/runState';

export default class AuthScene extends Phaser.Scene {
  private nextScene = 'MainMenuScene';
  private mode: 'login' | 'register' | 'guest' = 'guest';
  private emailInput = '';
  private passwordInput = '';
  private usernameInput = 'Player';
  private statusText!: Phaser.GameObjects.Text;
  private formObjects: Phaser.GameObjects.GameObject[] = [];
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super({ key: 'AuthScene' });
  }

  init(data: { next?: string }): void {
    this.nextScene = data.next ?? 'MainMenuScene';
  }

  create(): void {
    drawMenuBackdrop(this);
    mountFullscreenButton(this);
    const panel = this.add.graphics();
    drawPanel(panel, GAME_WIDTH / 2 - 320, 80, 640, 520);

    createGlowTitle(this, GAME_WIDTH / 2, 130, 'ACCOUNT', '32px');
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 540, '', {
        fontFamily: UI_FONTS.body,
        fontSize: '14px',
        color: '#ff4757',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    createStyledButton(this, GAME_WIDTH / 2, 260, '▶  PLAY NOW (SKIP LOGIN)', () => {
      guestLogin(this.usernameInput || 'Player');
      this.scene.start('CharacterSelectScene', FRESH_RUN_SELECT_DATA);
    }, 360, 0x2ed573);

    this.createTabButton(GAME_WIDTH / 2 - 160, 200, 'GUEST', () => {
      this.mode = 'guest';
      this.refreshForm();
    });
    this.createTabButton(GAME_WIDTH / 2, 200, 'LOGIN', () => {
      this.mode = 'login';
      this.refreshForm();
    });
    this.createTabButton(GAME_WIDTH / 2 + 160, 200, 'REGISTER', () => {
      this.mode = 'register';
      this.refreshForm();
    });

    this.refreshForm();

    createStyledButton(this, GAME_WIDTH / 2, 580, '← BACK', () => this.scene.start('MainMenuScene'), 220);
  }

  shutdown(): void {
    if (this.keyboardHandler) {
      this.input.keyboard?.off('keydown', this.keyboardHandler);
    }
  }

  private createTabButton(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: UI_FONTS.body,
        fontSize: '14px',
        color: '#a89bc4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setColor('#ffc857'));
    btn.on('pointerout', () => btn.setColor('#a89bc4'));
  }

  private clearForm(): void {
    this.formObjects.forEach((o) => o.destroy());
    this.formObjects = [];
    if (this.keyboardHandler) {
      this.input.keyboard?.off('keydown', this.keyboardHandler);
      this.keyboardHandler = undefined;
    }
  }

  private trackForm(...objects: Phaser.GameObjects.GameObject[]): void {
    this.formObjects.push(...objects);
  }

  private refreshForm(): void {
    this.clearForm();

    let y = 320;

    if (this.mode === 'guest') {
      this.trackForm(this.addFormText(GAME_WIDTH / 2, y, 'Username (type on keyboard):'));
      y += 36;
      const usernameDisplay = this.addFormText(GAME_WIDTH / 2, y, this.usernameInput || 'Player', true);
      this.setupKeyboard((key) => {
        if (key === 'Backspace') this.usernameInput = this.usernameInput.slice(0, -1);
        else if (key.length === 1 && this.usernameInput.length < 16) this.usernameInput += key;
        usernameDisplay.setText(this.usernameInput || 'Player');
      });
      y += 56;
      const guestBtn = createStyledButton(this, GAME_WIDTH / 2, y, 'SAVE & CONTINUE', () => {
        guestLogin(this.usernameInput || 'Player');
        this.scene.start(this.nextScene);
      }, 260);
      this.trackForm(guestBtn.bg, guestBtn.label, guestBtn.hit);
      return;
    }

    this.trackForm(this.addFormText(GAME_WIDTH / 2, y, 'Email:'));
    y += 28;
    const emailDisplay = this.addFormText(GAME_WIDTH / 2, y, this.emailInput || 'email@example.com', true);
    y += 40;

    if (this.mode === 'register') {
      this.trackForm(this.addFormText(GAME_WIDTH / 2, y, 'Username:'));
      y += 28;
      const usernameDisplay = this.addFormText(GAME_WIDTH / 2, y, this.usernameInput, true);
      y += 40;
      this.setupKeyboard((key) => {
        if (key === 'Backspace') this.usernameInput = this.usernameInput.slice(0, -1);
        else if (key.length === 1 && this.usernameInput.length < 16) this.usernameInput += key;
        usernameDisplay.setText(this.usernameInput || 'Player');
      });
    }

    this.trackForm(this.addFormText(GAME_WIDTH / 2, y, 'Password:'));
    y += 28;
    const passDisplay = this.addFormText(
      GAME_WIDTH / 2,
      y,
      this.passwordInput.length ? '*'.repeat(this.passwordInput.length) : '(type password)',
      true,
    );
    y += 48;

    this.setupKeyboard((key) => {
      if (key === 'Backspace') {
        this.passwordInput = this.passwordInput.slice(0, -1);
        passDisplay.setText(this.passwordInput.length ? '*'.repeat(this.passwordInput.length) : '(type password)');
      } else if (key.length === 1 && /[\w@.]/.test(key)) {
        if (this.mode === 'register' && !this.passwordInput && !this.emailInput) {
          this.usernameInput += key;
        } else if (!this.passwordInput && passDisplay.text.includes('password')) {
          this.passwordInput = key;
        } else if (passDisplay.text.startsWith('*') || this.passwordInput) {
          if (this.passwordInput.length < 24) this.passwordInput += key;
        } else {
          this.emailInput += key;
          emailDisplay.setText(this.emailInput);
        }
        passDisplay.setText(this.passwordInput.length ? '*'.repeat(this.passwordInput.length) : '(type password)');
      }
    });

    const submitBtn = createStyledButton(
      this,
      GAME_WIDTH / 2,
      y,
      this.mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT',
      async () => {
        try {
          if (this.mode === 'login') {
            await login(this.emailInput, this.passwordInput);
          } else {
            await register(this.emailInput, this.passwordInput, this.usernameInput);
          }
          this.scene.start(this.nextScene);
        } catch {
          guestLogin(this.usernameInput || 'Player');
          this.statusText.setText('Offline — saved as guest');
          this.time.delayedCall(800, () => this.scene.start(this.nextScene));
        }
      },
      280,
    );
    this.trackForm(submitBtn.bg, submitBtn.label, submitBtn.hit);
  }

  private addFormText(x: number, y: number, text: string, isField = false): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: UI_FONTS.body,
        fontSize: isField ? '18px' : '14px',
        color: isField ? '#f5f0ff' : '#a89bc4',
        fontStyle: isField ? 'bold' : 'normal',
        backgroundColor: isField ? '#1e1030' : undefined,
        padding: isField ? { x: 16, y: 8 } : undefined,
      })
      .setOrigin(0.5);
  }

  private setupKeyboard(onKey: (key: string) => void): void {
    if (this.keyboardHandler) {
      this.input.keyboard?.off('keydown', this.keyboardHandler);
    }
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') onKey('Backspace');
      else if (event.key.length === 1) onKey(event.key);
    };
    this.input.keyboard?.on('keydown', this.keyboardHandler);
  }
}
