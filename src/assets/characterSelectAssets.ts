import Phaser from 'phaser';
import type { CharacterId } from '../types/game';

const cardModules = import.meta.glob('../../Assets/Character Select/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const chooseMimuVideoModules = import.meta.glob('../../Assets/SoundFX/*.{mov,mp4,webm}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function pickCardUrl(pattern: RegExp): string | undefined {
  return Object.entries(cardModules).find(([path]) => pattern.test(path))?.[1];
}

function pickChooseMimuVideoUrl(): string | undefined {
  return Object.entries(chooseMimuVideoModules).find(([path]) =>
    /Choose Your mimu\.(mov|mp4|webm)$/i.test(path.replace(/\\/g, '/')),
  )?.[1];
}

const CARD_URLS: Record<CharacterId, string | undefined> = {
  voidWarrior: pickCardUrl(/Void-Warrior\.png$/i),
  frostGuardian: pickCardUrl(/Frost-Guardian\.png$/i),
  chaosTrickster: pickCardUrl(/Chaos-Trickster\.png$/i),
  fireStriker: pickCardUrl(/Fire-Striker\.png$/i),
};

export const CHARACTER_SELECT_CARD_CORNER_RADIUS = 18;

export const CHOOSE_MIMU_VIDEO_VOLUME = 0.85;
const CHOOSE_MIMU_VIDEO_URL = pickChooseMimuVideoUrl();

export interface ChooseMimuAudioHandle {
  destroy: () => void;
}

export function getCharacterSelectCardKey(id: CharacterId): string {
  return `char_select_${id}`;
}

export function loadCharacterSelectCards(scene: Phaser.Scene): void {
  (Object.keys(CARD_URLS) as CharacterId[]).forEach((id) => {
    const url = CARD_URLS[id];
    if (url) {
      scene.load.image(getCharacterSelectCardKey(id), url);
    }
  });
}

/** Ensure downscaled card art uses smooth filtering (not blocky NEAREST). */
export function configureCharacterSelectCardTextures(scene: Phaser.Scene): void {
  (Object.keys(CARD_URLS) as CharacterId[]).forEach((id) => {
    const key = getCharacterSelectCardKey(id);
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  });
}

export function hasCharacterSelectCard(scene: Phaser.Scene, id: CharacterId): boolean {
  return scene.textures.exists(getCharacterSelectCardKey(id));
}

export function hasChooseMimuVideo(): boolean {
  return !!CHOOSE_MIMU_VIDEO_URL;
}

/** Play choose-your-mimu audio from the clip without Phaser video preload/rendering. */
export function playChooseMimuVideo(
  _scene: Phaser.Scene,
  existing?: ChooseMimuAudioHandle,
): ChooseMimuAudioHandle | undefined {
  if (!CHOOSE_MIMU_VIDEO_URL) return;

  stopChooseMimuVideo(existing);

  const el = document.createElement('video');
  el.src = CHOOSE_MIMU_VIDEO_URL;
  el.volume = CHOOSE_MIMU_VIDEO_VOLUME;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.style.cssText =
    'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';

  document.body.appendChild(el);

  const destroy = (): void => {
    el.pause();
    el.removeAttribute('src');
    el.load();
    el.remove();
  };

  el.addEventListener('ended', destroy, { once: true });
  el.addEventListener('error', destroy, { once: true });
  void el.play().catch(() => destroy());

  return { destroy };
}

export function stopChooseMimuVideo(handle?: ChooseMimuAudioHandle): void {
  handle?.destroy();
}

export function getCharacterSelectCardDisplaySize(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.floor(srcWidth * scale),
    height: Math.floor(srcHeight * scale),
  };
}

/** Scale full card art down to fit, snapping to whole pixels for a crisp result. */
export function fitCharacterSelectCard(
  image: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number,
): void {
  const { width: srcW, height: srcH } = image.frame;
  const { width: displayW, height: displayH } = getCharacterSelectCardDisplaySize(
    srcW,
    srcH,
    maxWidth,
    maxHeight,
  );

  image.setDisplaySize(displayW, displayH);
  image.setPosition(Math.round(image.x), Math.round(image.y));
}

export function applyRoundedCardMask(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle,
  cornerRadius = CHARACTER_SELECT_CARD_CORNER_RADIUS,
): Phaser.GameObjects.Graphics {
  const maskGfx = scene.make.graphics({ x: target.x, y: target.y }, false);
  maskGfx.setVisible(false);

  const w = target.displayWidth;
  const h = target.displayHeight;
  maskGfx.fillStyle(0xffffff);
  maskGfx.fillRoundedRect(-w / 2, -h / 2, w, h, cornerRadius);

  target.setMask(maskGfx.createGeometryMask());
  return maskGfx;
}
