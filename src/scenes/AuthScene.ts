import Phaser from 'phaser';
import {
  login,
  register,
  sendPasswordReset,
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
  addPanelBorder,
  hasLeaderboardBorderTexture,
} from '../assets/uiAssets';
import {
  drawSolidBackdrop,
  createGlowTitle,
  createStyledButton,
  drawPanel,
  mountFullscreenButton,
  UI_FONTS,
} from '../ui/theme';
import {
  AUTH_PANEL,
  destroyAuthFormOverlay,
  getAuthContentLayout,
  mountAuthForm,
  type AuthFormHandle,
} from '../ui/authForm';

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

    const hasBorder = hasLeaderboardBorderTexture(this);
    const layout = getAuthContentLayout(hasBorder);

    if (hasBorder) {
      addPanelBorder(this, AUTH_PANEL);
    } else {
      const panel = this.add.graphics().setDepth(0);
      drawPanel(panel, AUTH_PANEL.x, AUTH_PANEL.y, AUTH_PANEL.width, AUTH_PANEL.height);
    }

    createGlowTitle(this, GAME_WIDTH / 2, layout.titleY, 'ACCOUNT', '32px', 6);

    const cloudReady = isFirebaseEnabled();
    if (!cloudReady) {
      this.add
        .text(GAME_WIDTH / 2, layout.formTopY - 18, getCloudAuthRequiredMessage(), {
          fontFamily: UI_FONTS.body,
          fontSize: '13px',
          color: '#ff4757',
          align: 'center',
          wordWrap: { width: AUTH_PANEL.width - 80 },
        })
        .setOrigin(0.5)
        .setDepth(6);
    }

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
          onForgotPassword: () => void this.handleForgotPassword(),
          layout: { formTopY: layout.formTopY, panelBottomY: layout.panelBottomY },
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

  private async handleForgotPassword(): Promise<void> {
    if (!this.authForm || !isFirebaseEnabled()) return;
    if (this.authForm.getMode() !== 'login') return;

    const email = this.authForm.getValues().email;
    this.authForm.setError('');

    if (!email.trim()) {
      this.authForm.setError('Enter your email address first.');
      return;
    }

    this.authForm.setLoading(true);
    try {
      await sendPasswordReset(email);
      this.authForm.setSuccess('Reset link sent! Check your email inbox.');
    } catch (err) {
      this.authForm.setError(formatAuthError(err));
    } finally {
      this.authForm.setLoading(false);
    }
  }
}
