/** Vite-resolved URLs for character animation frames (must use static glob paths). */
function sortFrameUrls(modules: Record<string, string>): string[] {
  return Object.entries(modules)
    .sort(([pathA], [pathB]) => {
      const numA = parseInt(pathA.match(/(\d+)\.png$/i)?.[1] ?? '0', 10);
      const numB = parseInt(pathB.match(/(\d+)\.png$/i)?.[1] ?? '0', 10);
      return numA - numB;
    })
    .map(([, url]) => url);
}

const voidWarriorRunModules = import.meta.glob('../../Assets/Running Mimu/Purple/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const frostGuardianRunModules = import.meta.glob('../../Assets/Running Mimu/Blue/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const chaosTricksterRunModules = import.meta.glob('../../Assets/Running Mimu/Green/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const fireStrikerRunModules = import.meta.glob('../../Assets/Running Mimu/Red/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const VOID_WARRIOR_RUN_URLS = sortFrameUrls(voidWarriorRunModules);
export const FROST_GUARDIAN_RUN_URLS = sortFrameUrls(frostGuardianRunModules);
export const CHAOS_TRICKSTER_RUN_URLS = sortFrameUrls(chaosTricksterRunModules);
export const FIRE_STRIKER_RUN_URLS = sortFrameUrls(fireStrikerRunModules);
