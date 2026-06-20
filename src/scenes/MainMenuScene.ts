import Phaser from 'phaser';
import {
  getCurrentUser,
  logout,
  isSignedInAccount,
  waitForAuthReady,
} from '../services/firebase';
import { loadUserProfile } from '../services/userProfile';
import { InputManager } from '../input/InputManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import {
  drawMenuBackdrop,
  createStyledButton,
  createImageMenuButton,
  mountFullscreenButton,
  subtitleStyle,
  formatScore,
  UI_FONTS,
  type MenuButtonHighlight,
} from '../ui/theme';
import {
  addMenuBackground,
  addMenuTitle,
  hasLeaderboardButtonTexture,
  hasLogOutButtonTexture,
  hasMenuBackgroundTexture,
  hasPlayButtonTexture,
  hasSignInButtonTexture,
  hasTitleTexture,
  LEADERBOARD_BUTTON_TEXTURE_KEY,
  LOG_OUT_BUTTON_TEXTURE_KEY,
  MAIN_MENU_BUTTON_HIGHLIGHT_ALPHA,
  MAIN_MENU_BUTTON_IDLE_ALPHA,
  MAIN_MENU_FULLSCREEN_BUTTON_ALPHA,
  MENU_BUTTON_DISPLAY_WIDTH,
  PLAY_BUTTON_TEXTURE_KEY,
  SIGN_IN_BUTTON_TEXTURE_KEY,
} from '../assets/uiAssets';
import { resetRunState, FRESH_RUN_SELECT_DATA } from '../utils/runState';
import { isMobileTouchDevice } from '../utils/device';
import { onGameAudioUnlocked, unlockMobileAudio } from '../utils/audioUnlock';
import {
  hasIntroSfx,
  INTRO_SFX_GAP_MS,
  playIntroSfxOnce,
  startMenuBackgroundSfx,
  stopAllCombatSfx,
  stopIntroSfx,
  stopMenuBackgroundSfx,
} from '../assets/soundFxAssets';
import {
  BOSS_MUSIC_KEY,
  hasBossMusic,
  stopLevel1Music,
  stopLevel2Music,
} from '../assets/musicAssets';

type MenuAction = () => void;

export default class MainMenuScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private menuItems: { button: MenuButtonHighlight; action: MenuAction }[] = [];
  private selectedIndex = 0;
  private menuUi!: Phaser.GameObjects.Container;
  private introLoopTimer?: Phaser.Time.TimerEvent;
  private introSound?: Phaser.Sound.BaseSound;
  private menuBackgroundSound?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.silenceGameplayAudio();

    this.inputManager = new InputManager(this);
    this.menuItems = [];
    this.selectedIndex = 0;

    if (hasMenuBackgroundTexture(this)) {
      addMenuBackground(this);
    } else {
      drawMenuBackdrop(this);
    }

    this.menuUi = this.add.container(0, 0).setDepth(10);

    const titleCenterY = 128;
    let contentBottomY = 195;

    if (hasTitleTexture(this)) {
      const title = addMenuTitle(this, GAME_WIDTH / 2, titleCenterY);
      if (title) {
        title.setDepth(0);
        this.menuUi.add(title);
        contentBottomY = title.y + title.displayHeight / 2;
      }
    } else {
      const titleGlow = this.add
        .text(GAME_WIDTH / 2, 90, 'MIMU VS MONSTER', {
          fontFamily: UI_FONTS.title,
          fontSize: '38px',
          color: '#ffc857',
          fontStyle: 'bold',
          stroke: '#4a1a6b',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setTint(0xff8c32)
        .setAlpha(0.35);
      const titleMain = this.add
        .text(GAME_WIDTH / 2, 90, 'MIMU VS MONSTER', {
          fontFamily: UI_FONTS.title,
          fontSize: '38px',
          color: '#ffc857',
          fontStyle: 'bold',
          stroke: '#4a1a6b',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      const subtitle = this.add
        .text(GAME_WIDTH / 2, 130, 'MONSTER RUMBLE', {
          fontFamily: UI_FONTS.title,
          fontSize: '28px',
          color: '#5dffe0',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const tagline = this.add
        .text(GAME_WIDTH / 2, 175, 'Survive the Rumble. Be the Legend.', subtitleStyle())
        .setOrigin(0.5);
      this.menuUi.add([titleGlow, titleMain, subtitle, tagline]);
    }

    const user = getCurrentUser();

    const menuButtonWidth = MENU_BUTTON_DISPLAY_WIDTH;
    const menuButtonGap = 76;
    const menuButtonHeight = menuButtonWidth * (293 / 1242);
    const menuStartY = contentBottomY + 34;

    if (hasPlayButtonTexture(this)) {
      this.addImageMenuButton(
        GAME_WIDTH / 2,
        menuStartY,
        PLAY_BUTTON_TEXTURE_KEY,
        menuButtonWidth,
        () => this.startGame(),
      );
    } else {
      this.addMenuButton(GAME_WIDTH / 2, menuStartY, '▶  PLAY', () => this.startGame());
    }

    if (hasLeaderboardButtonTexture(this)) {
      this.addImageMenuButton(
        GAME_WIDTH / 2,
        menuStartY + menuButtonGap,
        LEADERBOARD_BUTTON_TEXTURE_KEY,
        menuButtonWidth,
        () => this.scene.start('LeaderboardScene'),
      );
    } else {
      this.addMenuButton(GAME_WIDTH / 2, menuStartY + menuButtonGap, '🏆  LEADERBOARD', () => {
        this.scene.start('LeaderboardScene');
      });
    }

    const authButtonY = menuStartY + menuButtonGap * 2;

    if (user) {
      if (hasLogOutButtonTexture(this)) {
        this.addImageMenuButton(
          GAME_WIDTH / 2,
          authButtonY,
          LOG_OUT_BUTTON_TEXTURE_KEY,
          menuButtonWidth,
          () => {
            void logout().then(() => this.scene.start('AuthScene', { next: 'MainMenuScene' }));
          },
        );
      } else {
        this.addMenuButton(GAME_WIDTH / 2, authButtonY, 'LOG OUT', () => {
          void logout().then(() => this.scene.start('AuthScene', { next: 'MainMenuScene' }));
        });
      }
    } else if (hasSignInButtonTexture(this)) {
      this.addImageMenuButton(
        GAME_WIDTH / 2,
        authButtonY,
        SIGN_IN_BUTTON_TEXTURE_KEY,
        menuButtonWidth,
        () => this.scene.start('AuthScene', { next: 'MainMenuScene', mode: 'login' }),
      );
    } else {
      this.addMenuButton(GAME_WIDTH / 2, authButtonY, 'SIGN IN / REGISTER', () => {
        this.scene.start('AuthScene', { next: 'MainMenuScene', mode: 'login' });
      });
    }

    const usernameY = authButtonY + menuButtonHeight / 2 + 22;
    let footerY = authButtonY + menuButtonHeight / 2 + 72;

    if (user) {
      const username = this.add
        .text(GAME_WIDTH / 2, usernameY, `●  ${user.username}`, {
          fontFamily: UI_FONTS.body,
          fontSize: '16px',
          color: '#2ed573',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.menuUi.add(username);
      void waitForAuthReady().then(async () => {
        const profile = await loadUserProfile();
        if (!profile || !this.scene.isActive()) return;
        const wallet = this.add
          .text(GAME_WIDTH / 2, usernameY + 22, `◎ ${formatScore(profile.totalCoins)} banked coins`, {
            fontFamily: UI_FONTS.body,
            fontSize: '14px',
            color: '#ffd166',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        this.menuUi.add(wallet);
      });
      footerY = usernameY + 74;
    }

    if (!isMobileTouchDevice()) {
      const fullscreenBtn = mountFullscreenButton(this, GAME_WIDTH / 2, footerY);
      fullscreenBtn?.setAlpha(MAIN_MENU_FULLSCREEN_BUTTON_ALPHA);
      if (fullscreenBtn) this.menuUi.add(fullscreenBtn);
      footerY += 52;
    }

    const footerHint = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 36,
        isMobileTouchDevice()
          ? 'Rotate to landscape  ·  Touch controls in-game'
          : 'Click FULLSCREEN for best view  ·  Space / A to confirm  ·  Mouse + Keyboard + Controller',
        {
          fontFamily: UI_FONTS.body,
          fontSize: isMobileTouchDevice() ? '12px' : '13px',
          color: '#6e5f8a',
          align: 'center',
          wordWrap: { width: GAME_WIDTH - 48 },
        },
      )
      .setOrigin(0.5);
    this.menuUi.add(footerHint);

    this.refreshHighlight();
    this.startMenuAudio();
    onGameAudioUnlocked(() => {
      if (!this.scene.isActive()) return;
      if (this.menuBackgroundSound?.isPlaying) return;
      this.startMenuAudio();
    }, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopMenuAudio());
  }

  private silenceGameplayAudio(): void {
    stopAllCombatSfx(this);
    stopLevel1Music(this);
    stopLevel2Music(this);
    if (hasBossMusic(this)) {
      this.sound.stopByKey(BOSS_MUSIC_KEY);
    }
  }

  private startMenuAudio(): void {
    this.menuBackgroundSound = startMenuBackgroundSfx(this);
    this.startIntroLoop();
  }

  private stopMenuAudio(): void {
    this.stopIntroLoop();
    if (this.menuBackgroundSound) {
      this.menuBackgroundSound.stop();
      this.menuBackgroundSound.destroy();
      this.menuBackgroundSound = undefined;
    } else {
      stopMenuBackgroundSfx(this);
    }
  }

  private startIntroLoop(): void {
    if (!hasIntroSfx(this)) return;
    this.playNextIntro();
  }

  private playNextIntro(): void {
    this.introSound?.destroy();
    this.introSound = playIntroSfxOnce(this, () => {
      this.introSound = undefined;
      this.introLoopTimer = this.time.delayedCall(INTRO_SFX_GAP_MS, () => {
        this.playNextIntro();
      });
    });
  }

  private stopIntroLoop(): void {
    this.introLoopTimer?.destroy();
    this.introLoopTimer = undefined;
    this.introSound?.destroy();
    this.introSound = undefined;
    stopIntroSfx(this);
  }

  private startGame(): void {
    unlockMobileAudio(this.game);

    if (!isSignedInAccount() || !getCurrentUser()) {
      this.scene.start('AuthScene', { next: 'CharacterSelectScene', mode: 'login' });
      return;
    }

    resetRunState(this.registry);

    this.scene.start('CharacterSelectScene', FRESH_RUN_SELECT_DATA);
  }

  update(): void {
    this.inputManager.update();

    if (this.inputManager.isMenuUpJustPressed()) {
      this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.refreshHighlight();
    }
    if (this.inputManager.isMenuDownJustPressed()) {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
      this.refreshHighlight();
    }
    if (this.inputManager.isConfirmJustPressed()) {
      this.menuItems[this.selectedIndex]?.action();
    }
  }

  private addImageMenuButton(
    x: number,
    y: number,
    textureKey: string,
    displayWidth: number,
    onClick: () => void,
  ): void {
    const button = createImageMenuButton(
      this,
      x,
      y,
      textureKey,
      displayWidth,
      () => {
        unlockMobileAudio(this.game);
        onClick();
      },
      50,
      MAIN_MENU_BUTTON_IDLE_ALPHA,
      MAIN_MENU_BUTTON_HIGHLIGHT_ALPHA,
    );
    this.menuUi.add([button.image, button.hit]);

    const index = this.menuItems.length;
    button.hit.on('pointerover', () => {
      this.selectedIndex = index;
      this.refreshHighlight();
    });
    this.menuItems.push({ button, action: onClick });
  }

  private addMenuButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = createStyledButton(this, x, y, label, () => {
      unlockMobileAudio(this.game);
      onClick();
    });
    button.bg.setAlpha(MAIN_MENU_BUTTON_IDLE_ALPHA);
    button.label.setAlpha(MAIN_MENU_BUTTON_HIGHLIGHT_ALPHA);
    this.menuUi.add([button.bg, button.label, button.hit]);

    const index = this.menuItems.length;
    button.hit.on('pointerover', () => {
      this.selectedIndex = index;
      this.refreshHighlight();
    });
    this.menuItems.push({ button, action: onClick });
  }

  private refreshHighlight(): void {
    this.menuItems.forEach((item, i) => item.button.setHighlighted(i === this.selectedIndex));
  }
}
