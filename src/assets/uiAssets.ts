import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';

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
const SIGN_IN_BUTTON_URL = pickUiUrl(/SignIn\.png$/i);
const LOG_OUT_BUTTON_URL = pickUiUrl(/LogOut\.png$/i);
const TITLE_URL = pickUiUrl(/Title\.png$/i);
const MENU_BACKGROUND_URL = pickUiUrl(/Background\.png$/i);

export const PLAY_BUTTON_TEXTURE_KEY = 'ui_play_button';
export const LEADERBOARD_BUTTON_TEXTURE_KEY = 'ui_leaderboard_button';
export const SIGN_IN_BUTTON_TEXTURE_KEY = 'ui_sign_in_button';
export const LOG_OUT_BUTTON_TEXTURE_KEY = 'ui_log_out_button';
export const TITLE_TEXTURE_KEY = 'ui_title';
export const MENU_BACKGROUND_TEXTURE_KEY = 'ui_menu_background';

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
  SIGN_IN_BUTTON_TEXTURE_KEY,
  LOG_OUT_BUTTON_TEXTURE_KEY,
  TITLE_TEXTURE_KEY,
  MENU_BACKGROUND_TEXTURE_KEY,
] as const;

export function loadUiTextures(scene: Phaser.Scene): void {
  const entries: [string, string | undefined][] = [
    [PLAY_BUTTON_TEXTURE_KEY, PLAY_BUTTON_URL],
    [LEADERBOARD_BUTTON_TEXTURE_KEY, LEADERBOARD_BUTTON_URL],
    [SIGN_IN_BUTTON_TEXTURE_KEY, SIGN_IN_BUTTON_URL],
    [LOG_OUT_BUTTON_TEXTURE_KEY, LOG_OUT_BUTTON_URL],
    [TITLE_TEXTURE_KEY, TITLE_URL],
    [MENU_BACKGROUND_TEXTURE_KEY, MENU_BACKGROUND_URL],
  ];

  entries.forEach(([key, url]) => {
    if (url) scene.load.image(key, url);
  });
}

export function hasPlayButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(PLAY_BUTTON_TEXTURE_KEY);
}

export function hasLeaderboardButtonTexture(scene: Phaser.Scene): boolean {
  return scene.textures.exists(LEADERBOARD_BUTTON_TEXTURE_KEY);
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

export function addMenuBackground(scene: Phaser.Scene, depth = -10): Phaser.GameObjects.Image | null {
  if (!hasMenuBackgroundTexture(scene)) return null;

  const bg = scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, MENU_BACKGROUND_TEXTURE_KEY)
    .setOrigin(0.5)
    .setDepth(depth);
  bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  return bg;
}

export function addMenuTitle(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image | null {
  if (!hasTitleTexture(scene)) return null;

  const title = scene.add.image(x, y, TITLE_TEXTURE_KEY).setOrigin(0.5).setDepth(1);
  const displayHeight = (TITLE_DISPLAY_WIDTH / title.width) * title.height;
  title.setDisplaySize(TITLE_DISPLAY_WIDTH, displayHeight);
  return title;
}

export function configureUiTextures(scene: Phaser.Scene): void {
  for (const key of UI_TEXTURE_KEYS) {
    if (!scene.textures.exists(key)) continue;
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
