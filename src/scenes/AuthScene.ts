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
import { focusGameSurface } from '../utils/sceneNav';
import {
  drawSolidBackdrop,
  createGlowTitle,
  createStyledButton,
  drawPanel,
  mountFullscreenButton,
  UI_FONTS,
} from '../ui/theme';
import { AUTH_PANEL, destroyAuthFormOverlay, mountAuthForm, type AuthFormHandle } from '../ui/authForm';

export default class AuthScene extends Phaser.Scene {
  private nextScene = 'MainMenuScene';
  private mode: 'login' | 'register' = 'login';
  private authForm?: AuthFormHandle;
  private fromLogout = false;

  constructor() {
    super({ key: 'AuthScene' });
  }

  init(data: { next?: string; mode?: 'login' | 'register'; fromLogout?: boolean }): void {
    this.nextScene = data.next ?? 'MainMenuScene';
    this.mode = data.mode ?? 'login';
    this.fromLogout = data.fromLogout ?? false;
  }

  create(): void {
    this.input.keyboard?.clearCaptures();
    this.input.resetPointers();

    drawSolidBackdrop(this, 0x000000);
    mountFullscreenButton(this);

    const panel = this.add.graphics();
    drawPanel(panel, AUTH_PANEL.x, AUTH_PANEL.y, AUTH_PANEL.width, AUTH_PANEL.height);

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
          wordWrap: { width: AUTH_PANEL.width - 80 },
        },
      )
      .setOrigin(0.5);

    const signedIn = !this.fromLogout && !!getCurrentUser();

    if (cloudReady) {
      this.authForm = mountAuthForm(
        this,
        this.mode,
        () => void this.handleSubmit(),
        () => this.leaveScene(),
        {
          showContinue: signedIn,
          onContinue: () => this.goToNextScene(),
        },
      );
      this.authForm.setMode(this.mode);
    } else {
      createStyledButton(this, GAME_WIDTH / 2, 610, '← BACK', () => this.leaveScene(), 220);
    }
  }

  shutdown(): void {
    this.teardownAuthForm();
    focusGameSurface();
  }

  private teardownAuthForm(): void {
    this.authForm?.destroy();
    this.authForm = undefined;
    destroyAuthFormOverlay();
  }

  private leaveScene(): void {
    const target =
      this.nextScene === 'CharacterSelectScene' ? 'MainMenuScene' : this.nextScene;
    this.navigateTo(target);
  }

  private goToNextScene(): void {
    this.navigateTo(this.nextScene);
  }

  private navigateTo(target: string): void {
    this.teardownAuthForm();
    focusGameSurface();
    this.input.resetPointers();
    this.scene.start(target);
  }

  private async handleSubmit(): Promise<void> {
    if (!this.authForm || !isFirebaseEnabled()) return;

    const values = this.authForm.getValues();
    this.authForm.setError('');

    if (this.authForm.getMode() === 'register') {
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
          this.mode = 'login';
          this.authForm.setMode('login');
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
