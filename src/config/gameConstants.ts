export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Physics bounds inset so bodies stay inside the visible screen. */
export const WORLD_BODY_PAD = 40;

/** Full-screen playable arena; HUD floats over edges without blocking movement. */
export const PLAY_AREA = {
  x: WORLD_BODY_PAD,
  y: WORLD_BODY_PAD,
  width: GAME_WIDTH - WORLD_BODY_PAD * 2,
  height: GAME_HEIGHT - WORLD_BODY_PAD * 2,
  centerX: GAME_WIDTH / 2,
  centerY: GAME_HEIGHT / 2,
};
