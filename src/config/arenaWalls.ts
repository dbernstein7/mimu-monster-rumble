import { GAME_HEIGHT, GAME_WIDTH } from './gameConstants';

/**
 * Flat-top octagon for Haunted / Mutated arena floor art (1280×720 game space).
 * Vertices go clockwise; each edge is one wall segment:
 *   V0→V1 TOP (horizontal) · V1→V2 top-right diagonal · V2→V3 RIGHT (vertical)
 *   V3→V4 bottom-right diagonal · V4→V5 BOTTOM · V5→V6 bottom-left diagonal
 *   V6→V7 LEFT (vertical) · V7→V0 top-left diagonal
 */
/** Tuned to red-circle markers on Haunted Carnival floor art (1280×720). */
export const ARENA_OCTAGON_VERTICES = [
  { x: 0.23, y: 0.088 }, // V0 top-left · gate / tree corner
  { x: 0.77, y: 0.088 }, // V1 top-right · gate / dead-tree corner
  { x: 0.934, y: 0.331 }, // V2 upper-right lantern
  { x: 0.955, y: 0.638 }, // V3 lower-right lantern
  { x: 0.84, y: 0.785 }, // V4 bottom-right · step corner
  { x: 0.16, y: 0.785 }, // V5 bottom-left · step corner
  { x: 0.042, y: 0.638 }, // V6 lower-left lantern
  { x: 0.061, y: 0.331 }, // V7 upper-left lantern
] as const;

export const ARENA_WALL_THICKNESS = 40;

/** Set false once wall colliders are aligned with the floor art. */
export const SHOW_ARENA_WALL_DEBUG = false;

export const ARENA_WALL_LABELS = [
  '1 · TOP',
  '2 · TOP-RIGHT',
  '3 · RIGHT',
  '4 · BOTTOM-RIGHT',
  '5 · BOTTOM',
  '6 · BOTTOM-LEFT',
  '7 · LEFT',
  '8 · TOP-LEFT',
] as const;

export const ARENA_WALL_DEBUG_COLORS = [
  0xf1c40f,
  0xe67e22,
  0xe74c3c,
  0xff6b81,
  0x9b59b6,
  0x3498db,
  0x2ecc71,
  0x1abc9c,
] as const;

export function getArenaOctagonVerticesScreen(): { x: number; y: number }[] {
  return ARENA_OCTAGON_VERTICES.map((v) => ({
    x: v.x * GAME_WIDTH,
    y: v.y * GAME_HEIGHT,
  }));
}

/** Top-center gate — player walks here after the boss is defeated. */
export function getArenaExitGatePosition(): { x: number; y: number } {
  const topY = ARENA_OCTAGON_VERTICES[0].y * GAME_HEIGHT;
  return {
    x: GAME_WIDTH / 2,
    y: topY + 52,
  };
}
