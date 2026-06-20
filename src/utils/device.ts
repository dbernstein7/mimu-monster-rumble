export function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  const touchPoints = navigator.maxTouchPoints > 0;
  return coarse && narrow && touchPoints;
}

export function isPortraitMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return isMobileTouchDevice() && window.matchMedia('(orientation: portrait)').matches;
}

export function syncMobileOrientationUi(): void {
  if (typeof document === 'undefined') return;
  const prompt = document.getElementById('rotate-prompt');
  const gameContainer = document.getElementById('game-container');
  if (!prompt || !gameContainer) return;

  const showPrompt = isPortraitMobile();
  prompt.classList.toggle('visible', showPrompt);
  gameContainer.classList.toggle('mobile-hidden', showPrompt);
}

export function bindMobileOrientationUi(): void {
  if (typeof window === 'undefined') return;
  syncMobileOrientationUi();
  window.addEventListener('orientationchange', syncMobileOrientationUi);
  window.addEventListener('resize', syncMobileOrientationUi);
}

export async function tryLockLandscape(): Promise<void> {
  if (!isMobileTouchDevice()) return;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  if (!orientation?.lock) return;
  try {
    await orientation.lock('landscape');
  } catch {
    // Requires user gesture or is unsupported — rotate prompt still guides the player.
  }
}
