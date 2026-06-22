import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isFullscreen, isFullscreenSupported, toggleFullscreen } from '../utils/fullscreen';

export const UI_COLORS = {
  bgTop: 0x0d0618,
  bgBottom: 0x2a1450,
  panel: 0x140a24,
  panelBorder: 0x7b4bb8,
  panelHighlight: 0xb86bff,
  gold: 0xffc857,
  orange: 0xff8c32,
  cyan: 0x5dffe0,
  text: 0xf5f0ff,
  textMuted: 0xa89bc4,
  danger: 0xff4757,
  success: 0x2ed573,
  coin: 0xffd166,
};

export const UI_FONTS = {
  title: '"Orbitron", sans-serif',
  body: '"Exo 2", sans-serif',
  headline: '"TEXT", "Orbitron", sans-serif',
};

export function drawMenuBackdrop(scene: Phaser.Scene, depth = -10): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  g.fillGradientStyle(UI_COLORS.bgTop, UI_COLORS.bgTop, UI_COLORS.bgBottom, UI_COLORS.bgBottom, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  g.fillStyle(UI_COLORS.panelHighlight, 0.06);
  g.fillCircle(GAME_WIDTH * 0.15, GAME_HEIGHT * 0.2, 180);
  g.fillCircle(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.75, 220);
  g.fillStyle(UI_COLORS.orange, 0.04);
  g.fillCircle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, 300);

  return g;
}

export function drawSolidBackdrop(
  scene: Phaser.Scene,
  color = 0x000000,
  depth = -10,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(color, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  return g;
}

export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.92,
): void {
  g.fillStyle(UI_COLORS.panel, alpha);
  g.fillRoundedRect(x, y, w, h, 14);
  g.lineStyle(2, UI_COLORS.panelBorder, 0.9);
  g.strokeRoundedRect(x, y, w, h, 14);
}

export function titleStyle(fontSize = '42px'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONTS.title,
    fontSize,
    color: '#ffc857',
    fontStyle: 'bold',
    stroke: '#4a1a6b',
    strokeThickness: 4,
  };
}

export function headlineTitleStyle(fontSize = '42px'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONTS.headline,
    fontSize,
    color: '#ffc857',
    fontStyle: 'bold',
    stroke: '#4a1a6b',
    strokeThickness: 4,
  };
}

export function subtitleStyle(fontSize = '18px'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONTS.body,
    fontSize,
    color: '#c9b8e8',
  };
}

export function labelStyle(fontSize = '13px'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONTS.body,
    fontSize,
    color: '#8a7aa8',
    fontStyle: 'bold',
  };
}

export function valueStyle(fontSize = '22px', color = '#f5f0ff'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONTS.body,
    fontSize,
    color,
    fontStyle: 'bold',
  };
}

export function createGlowTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize = '42px',
): Phaser.GameObjects.Text {
  const glow = scene.add.text(x, y, text, titleStyle(fontSize)).setOrigin(0.5).setDepth(0);
  glow.setTint(0xff8c32);
  glow.setAlpha(0.35);
  return scene.add.text(x, y, text, titleStyle(fontSize)).setOrigin(0.5).setDepth(1);
}

export function createHeadlineGlowTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize = '42px',
  color = '#ffc857',
  glowTint = 0xff8c32,
): Phaser.GameObjects.Text {
  const style = { ...headlineTitleStyle(fontSize), color };
  const glow = scene.add.text(x, y, text, style).setOrigin(0.5).setDepth(0);
  glow.setTint(glowTint);
  glow.setAlpha(0.35);
  return scene.add.text(x, y, text, style).setOrigin(0.5).setDepth(1);
}

export interface StyledButton {
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
  setHighlighted: (on: boolean) => void;
}

export interface ImageMenuButton {
  image: Phaser.GameObjects.Image;
  hit: Phaser.GameObjects.Rectangle;
  setHighlighted: (on: boolean) => void;
}

export interface MenuButtonHighlight {
  setHighlighted: (on: boolean) => void;
}

export function createStyledButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 300,
  accent = UI_COLORS.panelHighlight,
  depth = 50,
): StyledButton {
  const g = scene.add.graphics().setDepth(depth);
  const draw = (highlight: boolean) => {
    g.clear();
    g.fillStyle(highlight ? accent : UI_COLORS.panel, highlight ? 0.95 : 0.88);
    g.fillRoundedRect(x - width / 2, y - 26, width, 52, 12);
    g.lineStyle(2, highlight ? UI_COLORS.gold : UI_COLORS.panelBorder, 1);
    g.strokeRoundedRect(x - width / 2, y - 26, width, 52, 12);
  };
  draw(false);

  const text = scene.add
    .text(x, y, label, {
      fontFamily: UI_FONTS.body,
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const hit = scene.add
    .rectangle(x, y, width, 56, 0x000000, 0.001)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => draw(true));
  hit.on('pointerout', () => draw(false));
  hit.on('pointerdown', onClick);

  return {
    bg: g,
    label: text,
    hit,
    setHighlighted: draw,
  };
}

export function createImageMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string,
  displayWidth: number,
  onClick: () => void,
  depth = 50,
  idleAlpha = 0.9,
  highlightAlpha = 1,
): ImageMenuButton {
  const image = scene.add.image(x, y, textureKey).setOrigin(0.5).setDepth(depth);
  const baseScale = displayWidth / image.width;
  image.setScale(baseScale);

  const hit = scene.add
    .rectangle(x, y, image.displayWidth, image.displayHeight, 0x000000, 0.001)
    .setDepth(depth + 1)
    .setInteractive({ useHandCursor: true });

  const setHighlighted = (on: boolean) => {
    image.setScale(baseScale * (on ? 1.04 : 1));
    image.setAlpha(on ? highlightAlpha : idleAlpha);
    hit.setSize(image.displayWidth, image.displayHeight);
  };
  setHighlighted(false);

  hit.on('pointerdown', onClick);

  return { image, hit, setHighlighted };
}

export function createIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: string,
  onClick: () => void,
  size = 44,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(UI_COLORS.panel, hover ? 0.95 : 0.8);
    g.fillCircle(0, 0, size / 2);
    g.lineStyle(2, hover ? UI_COLORS.gold : UI_COLORS.panelBorder, 1);
    g.strokeCircle(0, 0, size / 2);
  };
  draw(false);

  const text = scene.add.text(0, 0, icon, { fontSize: '22px' }).setOrigin(0.5);
  const hit = scene.add
    .circle(0, 0, size / 2, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => draw(true));
  hit.on('pointerout', () => draw(false));
  hit.on('pointerdown', onClick);
  container.add([g, text, hit]);
  return container;
}

export const FULLSCREEN_BUTTON_WIDTH = 132;
export const FULLSCREEN_BUTTON_HEIGHT = 34;

export function getFullscreenButtonBottomRightPosition(): { x: number; y: number } {
  const pad = 14;
  return {
    x: GAME_WIDTH - pad - FULLSCREEN_BUTTON_WIDTH / 2,
    y: GAME_HEIGHT - pad - FULLSCREEN_BUTTON_HEIGHT / 2,
  };
}

export function mountFullscreenButton(
  scene: Phaser.Scene,
  x = GAME_WIDTH - 14 - FULLSCREEN_BUTTON_WIDTH / 2,
  y = 14 + FULLSCREEN_BUTTON_HEIGHT / 2,
  depth = 250,
): Phaser.GameObjects.Container | null {
  if (!isFullscreenSupported(scene)) return null;

  const buttonW = FULLSCREEN_BUTTON_WIDTH;
  const buttonH = FULLSCREEN_BUTTON_HEIGHT;

  const container = scene.add.container(x, y).setDepth(depth).setScrollFactor(0);
  const g = scene.add.graphics();
  const label = scene.add
    .text(0, 0, 'FULLSCREEN', {
      fontFamily: UI_FONTS.body,
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const refresh = () => {
    const active = isFullscreen(scene);
    label.setText(active ? 'EXIT FULLSCREEN' : 'FULLSCREEN');
    g.clear();
    g.fillStyle(UI_COLORS.panel, 0.92);
    g.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 8);
    g.lineStyle(2, active ? UI_COLORS.gold : UI_COLORS.panelHighlight, 1);
    g.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 8);
  };

  const hit = scene.add
    .rectangle(0, 0, buttonW, buttonH, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => {
    g.clear();
    g.fillStyle(UI_COLORS.panel, 0.98);
    g.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 8);
    g.lineStyle(2, UI_COLORS.gold, 1);
    g.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 8);
  });
  hit.on('pointerout', refresh);
  hit.on('pointerdown', () => toggleFullscreen(scene));

  container.add([g, label, hit]);
  refresh();

  const onFullscreenChange = () => refresh();
  scene.scale.on('enterfullscreen', onFullscreenChange);
  scene.scale.on('leavefullscreen', onFullscreenChange);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off('enterfullscreen', onFullscreenChange);
    scene.scale.off('leavefullscreen', onFullscreenChange);
    container.destroy();
  });

  return container;
}

export function formatScore(n: number): string {
  return n.toLocaleString();
}

export function drawHudBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(0x000000, 0.55);
  g.fillRoundedRect(x + 2, y + 3, w, h, 10);
  g.fillStyle(UI_COLORS.panel, 0.88);
  g.fillRoundedRect(x, y, w, h, 10);
  g.fillStyle(0xffffff, 0.04);
  g.fillRoundedRect(x + 1, y + 1, w - 2, h * 0.45, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.lineStyle(1, UI_COLORS.panelBorder, 0.65);
  g.strokeRoundedRect(x, y, w, h, 10);
  g.lineStyle(1, UI_COLORS.panelHighlight, 0.18);
  g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 9);
}

export function drawHudDivider(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  h: number,
): void {
  g.lineStyle(1, UI_COLORS.panelBorder, 0.35);
  g.lineBetween(x, y, x, y + h);
  g.lineStyle(1, 0xffffff, 0.06);
  g.lineBetween(x + 1, y, x + 1, y + h);
}

export function drawProgressBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  fillColor = UI_COLORS.gold,
): void {
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x, y + 1, w, h, h / 2);
  g.fillStyle(0x1e1030, 0.95);
  g.fillRoundedRect(x, y, w, h, h / 2);
  if (progress > 0) {
    const fillW = Math.max(h, w * progress);
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x, y, fillW, h, h / 2);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(x + 1, y + 1, Math.max(0, fillW - 2), Math.max(2, h * 0.35), {
      tl: h / 2,
      tr: h / 2,
      bl: 0,
      br: 0,
    });
  }
  g.lineStyle(1, UI_COLORS.panelBorder, 0.7);
  g.strokeRoundedRect(x, y, w, h, h / 2);
}
