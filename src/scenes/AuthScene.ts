import Phaser from 'phaser';
import {
  login,
  register,
  isFirebaseEnabled,
  formatAuthError,
  getCurrentUser,
  getCloudAuthRequiredMessage,
} from '../services/firebase';
import {
  validateLoginInput,
  validateRegistrationInput,
} from '../services/userProfile';
import { GAME_WIDTH } from '../config/gameConstants';
import {
  drawMenuBackdrop,
  createGlowTitle,
  createStyledButton,
  drawPanel,
  mountFullscreenButton,
  UI_FONTS,
} from '../ui/theme';
import { destroyAuthFormOverlay, mountAuthForm, type AuthFormHandle } from '../ui/authForm';

export default class AuthScene extends Phaser.Scene {
  private nextScene = 'MainMenuScene';
  private mode: 'login' | 'register' = 'login';
  private authForm?: AuthFormHandle;
  private tabButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'AuthScene' });
  }

  init(data: { next?: string; mode?: 'login' | 'register' }): void {
    this.nextScene = data.next ?? 'MainMenuScene';
    this.mode = data.mode ?? 'login';
  }

  create(): void {
    drawMenuBackdrop(this);
    mountFullscreenButton(this);

    const panel = this.add.graphics();
    drawPanel(panel, GAME_WIDTH / 2 - 320, 80, 640, 520);

    createGlowTitle(this, GAME_WIDTH / 2, 130, 'ACCOUNT', '32px');

    const cloudReady = isFirebaseEnabled();
    this.add
      .text(
        GAME_WIDTH / 2,
        168,
        cloudReady
          ? 'Create an account or log in — your wallet and scores sync in the cloud'
          : getCloudAuthRequiredMessage(),
        {
          fontFamily: UI_FONTS.body,
          fontSize: '13px',
          color: cloudReady ? '#8a7aa8' : '#ff4757',
          align: 'center',
          wordWrap: { width: 520 },
        },
      )
      .setOrigin(0.5);

    if (cloudReady) {
      this.createTabButton(GAME_WIDTH / 2 - 90, 210, 'REGISTER', () => this.switchMode('register'));
      this.createTabButton(GAME_WIDTH / 2 + 90, 210, 'LOG IN', () => this.switchMode('login'));
      this.syncTabColors();

      this.authForm = mountAuthForm(this.mode, () => void this.handleSubmit());
      this.authForm.setMode(this.mode);
    }

    const signedIn = !!getCurrentUser();
    if (signedIn) {
      createStyledButton(
        this,
        GAME_WIDTH / 2,
        610,
        'CONTINUE →',
        () => this.goToNextScene(),
        320,
        0x2ed573,
      );
    }

    createStyledButton(this, GAME_WIDTH / 2, signedIn ? 672 : 610, '← BACK', () => this.leaveScene(), 220);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownAuthForm());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardownAuthForm());
  }

  shutdown(): void {
    this.teardownAuthForm();
    this.tabButtons = [];
  }

  private teardownAuthForm(): void {
    this.authForm?.destroy();
    this.authForm = undefined;
    destroyAuthFormOverlay();
  }

  private leaveScene(): void {
    this.teardownAuthForm();
    this.scene.start(this.nextScene === 'CharacterSelectScene' ? 'MainMenuScene' : this.nextScene);
  }

  private goToNextScene(): void {
    this.teardownAuthForm();
    this.scene.start(this.nextScene);
  }

  private switchMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.authForm?.setMode(mode);
    this.syncTabColors();
  }

  private syncTabColors(): void {
    this.tabButtons.forEach((btn) => {
      const active =
        (this.mode === 'register' && btn.text === 'REGISTER') ||
        (this.mode === 'login' && btn.text === 'LOG IN');
      btn.setColor(active ? '#ffc857' : '#a89bc4');
    });
  }

  private createTabButton(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: UI_FONTS.body,
        fontSize: '15px',
        color: label === 'LOG IN' ? '#ffc857' : '#a89bc4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setColor('#ffc857'));
    btn.on('pointerout', () => this.syncTabColors());
    this.tabButtons.push(btn);
  }

  private async handleSubmit(): Promise<void> {
    if (!this.authForm || !isFirebaseEnabled()) return;

    const values = this.authForm.getValues();
    this.authForm.setError('');

    if (this.mode === 'register') {
      const validationError = validateRegistrationInput(values.email, values.password, values.username);
      if (validationError) {
        this.authForm.setError(validationError);
        return;
      }

      this.authForm.setLoading(true);
      try {
        await register(values.email, values.password, values.username);
        this.goToNextScene();
      } catch (err) {
        const message = formatAuthError(err);
        this.authForm.setError(message);
        if (message.includes('already registered')) {
          this.switchMode('login');
        }
      } finally {
        this.authForm.setLoading(false);
      }
      return;
    }

    const validationError = validateLoginInput(values.email, values.password);
    if (validationError) {
      this.authForm.setError(validationError);
      return;
    }

    this.authForm.setLoading(true);
    try {
      await login(values.email, values.password);
      this.goToNextScene();
    } catch (err) {
      this.authForm.setError(formatAuthError(err));
    } finally {
      this.authForm.setLoading(false);
    }
  }
}
