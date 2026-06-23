import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isMobileTouchDevice } from '../utils/device';

const uiModules = import.meta.glob('../../Assets/UI/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function pickUiUrl(pattern: RegExp): string | undefined {
  return Object.entries(uiModules).find(([path]) => pattern.test(path))?.[1];
}

const PLAY_BUTTON_URL = pickUiUrl(/Play-Button\.png$/i);
const LEADERBOARD_BUTTON_URL = pickUiUrl(/Leaderboard\.png$/i);
const MAIN_MENU_BUTTON_URL = pickUiUrl(/MainMenu\.png$/i);
const SIGN_IN_BUTTON_URL = pickUiUrl(/SignIn\.png$/i);
const LOG_OUT_BUTTON_URL = pickUiUrl(/LogOut\.png$/i);
const TITLE_URL = pickUiUrl(/Title\.png$/i);
const MENU_BACKGROUND_URL = pickUiUrl(/Background\.png$/i);
const LEADERBOARD_BORDER_URL = pickUiUrl(/LeaderboardBorder\.png$/i);
const CONTROLS_URL = pickUiUrl(/Controls\.png$/i);

export const PLAY_BUTTON_TEXTURE_KEY = 'ui_play_button';
export const LEADERBOARD_BUTTON_TEXTURE_KEY = 'ui_leaderboard_button';
export const MAIN_MENU_BUTTON_TEXTURE_KEY = 'ui_main_menu_button';
export const SIGN_IN_BUTTON_TEXTURE_KEY = 'ui_sign_in_button';
export const LOG_OUT_BUTTON_TEXTURE_KEY = 'ui_log_out_button';
export const TITLE_TEXTURE_KEY = 'ui_title';
export const MENU_BACKGROUND_TEXTURE_KEY = 'ui_menu_background';
export const LEADERBOARD_BORDER_TEXTURE_KEY = 'ui_leaderboard_border';
export const CONTROLS_TEXTURE_KEY = 'ui_controls';

/** Leaderboard table panel (1280×720 game space). */
export const LEADERBOARD_PANEL = {
  x: 80,
  y: 100,
  width: GAME_WIDTH - 160,
  height: 480,
} as const;

/** Scale border art so the frame wraps the panel edge (not shrunk inside it). */
const LEADERBOARD_BORDER_WRAP = 1.06;

/** Content layout inside the leaderboard panel (title → tabs → table). */
export function getLeaderboardContentLayout(hasBorder: boolean) {
  const mobile = isMobileTouchDevice();

  const xPad = hasBorder ? 10 : 0;
  const topInner = LEADERBOARD_PANEL.y + (hasBorder ? (mobile ? 64 : 72) : 24);
  const titleY = topInner;
  const subtitleY = topInner + (mobile ? 18 : 22);
  const tabY = topInner + (mobile ? 54 : 66);
  const headerY = tabY + (mobile ? 32 : 38);
  const rowStartY = headerY + (mobile ? 32 : 40);
  return {
    titleY,
    subtitleY,
    tabY,
    headerY,
    rowStartY,
    rowHeight: mobile ? 30 : 34,
    maxRows: mobile ? 8 : 12,
    backY: mobile ? GAME_HEIGHT - 40 : GAME_HEIGHT - 48,
    colHash: 110 + xPad,
    colPlayer: 150 + xPad,
    colMimus: mobile ? 480 : 520,
    colScore: mobile ? 880 : 900,
    rowRectX: 100 + xPad,
    rowRectW: GAME_WIDTH - 200 - xPad * 2,
  };
}

/** Shared width for wide menu button art (1242×293 source). */
export const MENU_BUTTON_DISPLAY_WIDTH = 300;
/** Title graphic (1496×783 source). */
export const TITLE_DISPLAY_WIDTH = 520;

/** Main menu image button transparency. */
export const MAIN_MENU_BUTTON_IDLE_ALPHA = 0.8;
export const MAIN_MENU_BUTTON_HIGHLIGHT_ALPHA = 0.95;
export const MAIN_MENU_FULLSCREEN_BUTTON_ALPHA = 0.82;

const UI_TEXTURE_KEYS = [
  PLAY_BUTTON_TEXTURE_KEY,
  LEADERBOARD_BUTTON_TEXTURE_KEY,
  MAIN_MENU_BUTTON_TEXTURE_KEY,
  SIGN_IN_BUTTON_TEXTURE_KEY,
  LOG_OUT_BUTTON_TEXTURE_KEY,
  TITLE_TEXTURE_KEY,
  MENU_BACKGROUND_TEXTURE_KEY,
  LEADERBOARD_BORDER_TEXTURE_KEY,
  CONTROLS_TEXTURE_KEY,
] as const;

export function loadUiTextures(scene: Phaser.Scene): void {
  loadCriticalUiTextures(scene);
  loadDeferredUiTextures(scene);
}

/** Menu + gameplay chrome needed before first Play. */
export function loadCriticalUiTextures(scene: Phaser.Scene): void {
  const entries: [string, string | undefined][] = [
    [PLAY_BUTTON_TEXTURE_KEY, PLAY_BUTTON_URL],
    [MAIN_MENU_BUTTON_TEXTURE_KEY, MAIN_MENU_BUTTON_URL],
    [SIGN_IN_BUTTON_TEXTURE_KEY, SIGN_IN_BUTTON_URL],
    [LOG_OUT_BUTTON_TEXTURE_KEY, LOG_OUT_BUTTON_URL],
    [TITLE_TEXTURE_KEY, TITLE_URL],
    [MENU_BACKGROUND_TEXTURE_KEY, MENU_BACKGROUND_URL],
  ];

  entries.forEach(([key, url]) => {
    if (url && !scene.textures.exists(key)) {
      scene.load.image(key, url);
    }
  });
}

/** Large reference panels — load after menu is up. */
export function loadDeferredUiTextures(scene: Phaser.Scene): void {
  const entries: [string, string | undefined][] = [
    [LEADERBOARD_BUTTON_TEXTURE_KEY, LEADERBOARD_BUTTON_URL],
    [LEADERBOARD_BORDER_TEXTURE_KEY, LEADERBOARD_BORDER_URL],
    [CONTROLS_TEXTURE_KEY, CONTROLS_URL],
  ];

  entries.forEach(([key, url]) => {
    if (url && !scene.textures.exists(key)) {
      scene.load.image(key, url);
    }
  });
}

export function hasPlayButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(PLAY_BUTTON_TEXTURE_KEY);
}

export function hasLeaderboardButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(LEADERBOARD_BUTTON_TEXTURE_KEY);
}

export function hasMainMenuButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(MAIN_MENU_BUTTON_TEXTURE_KEY);
}

export function hasSignInButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(SIGN_IN_BUTTON_TEXTURE_KEY);
}

export function hasLogOutButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(LOG_OUT_BUTTON_TEXTURE_KEY);
}

export function hasTitleTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(TITLE_TEXTURE_KEY);
}

export function hasMenuBackgroundTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(MENU_BACKGROUND_TEXTURE_KEY);
}

export function hasLeaderboardBorderTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(LEADERBOARD_BORDER_TEXTURE_KEY);
}

export function hasControlsTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(CONTROLS_TEXTURE_KEY);
}

export function addLeaderboardBorder(scene: Phaser.Scene, depth = 1): Phaser.GameObjects.Image | null {
  return addPanelBorder(scene, LEADERBOARD_PANEL, depth);
}

export function addPanelBorder(
  scene: Phaser.Scene,
  panel: { x: number; y: number; width: number; height: number },
  depth = 1,
): Phaser.GameObjects.Image | null {
  const border = createPanelBorderImage(scene, panel);
  if (!border) return null;
  border.setDepth(depth);
  return border;
}

export function createPanelBorderImage(
  scene: Phaser.Scene,
  panel: { x: number; y: number; width: number; height: number },
): Phaser.GameObjects.Image | null {
  if (!hasLeaderboardBorderTexture(scene)) return null;

  const { x, y, width, height } = panel;
  const border = scene.add
    .image(x + width / 2, y + height / 2, LEADERBOARD_BORDER_TEXTURE_KEY)
    .setOrigin(0.5);

  const scale = Math.max(width / border.width, height / border.height) * LEADERBOARD_BORDER_WRAP;
  border.setScale(scale);
  return border;
}

export function addMenuBackground(scene: Phaser.Scene, depth = -10): Phaser.GameObjects.Image | null {
  if (!hasMenuBackgroundTexture(scene)) return null;

  const bg = scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, MENU_BACKGROUND_TEXTURE_KEY)
    .setOrigin(0.5)
    .setDepth(depth);
  bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  return bg;
}

export function addMenuTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  displayWidth = TITLE_DISPLAY_WIDTH,
): Phaser.GameObjects.Image | null {
  if (!hasTitleTexture(scene)) return null;

  const title = scene.add.image(x, y, TITLE_TEXTURE_KEY).setOrigin(0.5).setDepth(1);
  const displayHeight = (displayWidth / title.width) * title.height;
  title.setDisplaySize(displayWidth, displayHeight);
  return title;
}

export function configureUiTextures(scene: Phaser.Scene): void {
  for (const key of UI_TEXTURE_KEYS) {
    if (!scene.textures.exists(key)) continue;
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
