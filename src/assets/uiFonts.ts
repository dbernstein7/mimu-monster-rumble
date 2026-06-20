import textFontUrl from '../../Assets/UI/TEXT.otf?url';

export const HEADLINE_FONT_FAMILY = 'TEXT';

let loadPromise: Promise<void> | undefined;

/** Load TEXT.otf from Assets/UI for headline UI text. */
export function loadHeadlineFont(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (typeof document === 'undefined' || !textFontUrl) return;
    try {
      const face = new FontFace(HEADLINE_FONT_FAMILY, `url(${textFontUrl})`);
      const loaded = await face.load();
      document.fonts.add(loaded);
    } catch {
      // Orbitron fallback in UI_FONTS.headline
    }
  })();

  return loadPromise;
}
