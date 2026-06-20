import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConstants';
import {
  ARENA_OCTAGON_VERTICES,
  ARENA_WALL_DEBUG_COLORS,
  ARENA_WALL_LABELS,
  ARENA_WALL_THICKNESS,
  SHOW_ARENA_WALL_DEBUG,
  getArenaOctagonVerticesScreen,
} from '../config/arenaWalls';

type Point = { x: number; y: number };

export function buildOctagonArenaWalls(
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Group,
  options: { thickness?: number; debug?: boolean } = {},
): void {
  const thickness = options.thickness ?? ARENA_WALL_THICKNESS;
  const debug = options.debug ?? SHOW_ARENA_WALL_DEBUG;
  const verts = getArenaOctagonVerticesScreen();

  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    createWallSegment(scene, obstacles, a.x, a.y, b.x, b.y, thickness, debug, i);
  }

  if (debug) {
    buildArenaWallDebugOverlay(scene, verts);
    enablePhysicsDebugDraw(scene);
  }
}

export function buildArenaWallDebugOverlay(
  scene: Phaser.Scene,
  verts = getArenaOctagonVerticesScreen(),
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(250);

  const outline = scene.add.graphics();
  outline.lineStyle(3, 0x00ffff, 1);
  outline.beginPath();
  outline.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    outline.lineTo(verts[i].x, verts[i].y);
  }
  outline.closePath();
  outline.strokePath();
  container.add(outline);

  verts.forEach((v, i) => {
    const corner = scene.add.graphics();
    corner.fillStyle(0xffff00, 1);
    corner.fillCircle(v.x, v.y, 7);
    corner.lineStyle(2, 0x000000, 1);
    corner.strokeCircle(v.x, v.y, 7);
    container.add(corner);

    const nx = ARENA_OCTAGON_VERTICES[i];
    const vertexLabel = scene.add
      .text(v.x + 10, v.y - 10, `V${i}\n(${nx.x.toFixed(3)}, ${nx.y.toFixed(3)})`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffff00',
        backgroundColor: '#000000cc',
        padding: { x: 4, y: 2 },
      })
      .setDepth(251);
    container.add(vertexLabel);
  });

  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const angle = Phaser.Math.RadToDeg(Math.atan2(b.y - a.y, b.x - a.x));
    const color = `#${ARENA_WALL_DEBUG_COLORS[i].toString(16).padStart(6, '0')}`;

    const label = scene.add
      .text(mx, my, ARENA_WALL_LABELS[i], {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: `${color}cc`,
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5)
      .setAngle(angle > 90 || angle < -90 ? angle + 180 : angle);
    container.add(label);
  }

  scene.add
    .text(16, GAME_HEIGHT - 72, `Arena debug · game space ${GAME_WIDTH}×${GAME_HEIGHT}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#00ffff',
      backgroundColor: '#000000bb',
      padding: { x: 8, y: 4 },
    })
    .setScrollFactor(0)
    .setDepth(260);

  return container;
}

function enablePhysicsDebugDraw(scene: Phaser.Scene): void {
  if (!scene.physics.world.debugGraphic) {
    scene.physics.world.debugGraphic = scene.add.graphics().setDepth(249);
  }
  scene.physics.world.drawDebug = true;
}

export function pointInArenaOctagon(x: number, y: number, verts = getArenaOctagonVerticesScreen()): boolean {
  let negative = false;
  let positive = false;

  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross < 0) negative = true;
    if (cross > 0) positive = true;
    if (negative && positive) return false;
  }

  return true;
}

export function randomPointNearArenaWall(spriteRadius = 32, minDistFromCenter = 195): Point {
  const verts = getArenaOctagonVerticesScreen();
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  for (let attempt = 0; attempt < 40; attempt++) {
    const edge = Phaser.Math.Between(0, verts.length - 1);
    const a = verts[edge];
    const b = verts[(edge + 1) % verts.length];
    const t = Phaser.Math.FloatBetween(0.08, 0.92);
    const px = Phaser.Math.Linear(a.x, b.x, t);
    const py = Phaser.Math.Linear(a.y, b.y, t);

    const dx = cx - px;
    const dy = cy - py;
    const len = Math.hypot(dx, dy) || 1;
    const inset = spriteRadius + 26;
    const x = px + (dx / len) * inset;
    const y = py + (dy / len) * inset;

    if (Phaser.Math.Distance.Between(x, y, cx, cy) >= minDistFromCenter && pointInArenaOctagon(x, y)) {
      return { x, y };
    }
  }

  const edge = Phaser.Math.Between(0, verts.length - 1);
  const a = verts[edge];
  const b = verts[(edge + 1) % verts.length];
  const px = Phaser.Math.Linear(a.x, b.x, 0.5);
  const py = Phaser.Math.Linear(a.y, b.y, 0.5);
  const dx = cx - px;
  const dy = cy - py;
  const len = Math.hypot(dx, dy) || 1;
  const inset = spriteRadius + 26;
  return { x: px + (dx / len) * inset, y: py + (dy / len) * inset };
}

function createWallSegment(
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Group,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  debug: boolean,
  segmentIndex: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const color = ARENA_WALL_DEBUG_COLORS[segmentIndex] ?? 0x9b59b6;
  const alpha = debug ? 0.45 : 0;

  if (Math.abs(dy) < 1) {
    addAxisAlignedWall(scene, obstacles, (x1 + x2) / 2, (y1 + y2) / 2, length, thickness, color, alpha);
    return;
  }

  if (Math.abs(dx) < 1) {
    addAxisAlignedWall(scene, obstacles, (x1 + x2) / 2, (y1 + y2) / 2, thickness, length, color, alpha);
    return;
  }

  addDiagonalWall(scene, obstacles, x1, y1, x2, y2, thickness, color, alpha);
}

function addAxisAlignedWall(
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Group,
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
): void {
  const wall = scene.add.rectangle(cx, cy, width, height, color, alpha);
  wall.setDepth(3);
  scene.physics.add.existing(wall, true);
  (wall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  obstacles.add(wall);
}

/** Arcade static bodies are axis-aligned only — tile diagonals with square blocks. */
function addDiagonalWall(
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Group,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  color: number,
  alpha: number,
): void {
  const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
  const steps = Math.max(4, Math.ceil(length / (thickness * 0.82)));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Phaser.Math.Linear(x1, x2, t);
    const py = Phaser.Math.Linear(y1, y2, t);
    addAxisAlignedWall(scene, obstacles, px, py, thickness, thickness, color, alpha);
  }
}
