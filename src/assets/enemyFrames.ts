/** Vite-resolved URLs for enemy animation frames (must use static glob paths). */
function sortFrameUrls(modules: Record<string, string>): string[] {
  return Object.entries(modules)
    .sort(([pathA], [pathB]) => {
      const numA = parseInt(pathA.match(/(\d+)\.png$/i)?.[1] ?? '0', 10);
      const numB = parseInt(pathB.match(/(\d+)\.png$/i)?.[1] ?? '0', 10);
      return numA - numB;
    })
    .map(([, url]) => url);
}

const pumpkinHeadRunModules = import.meta.glob('../../Assets/Monsters/PumpkinHead/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const batRunModules = import.meta.glob('../../Assets/Monsters/Bat/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ghostRunModules = import.meta.glob('../../Assets/Monsters/Ghost/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const boss1RunModules = import.meta.glob('../../Assets/Monsters/Boss1/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const boss2RunModules = import.meta.glob('../../Assets/Monsters/Boss2/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const boss2SlimeBallModules = import.meta.glob('../../Assets/Monsters/Boss2/SlimeBall/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const skeletonRunModules = import.meta.glob('../../Assets/Monsters/Skeleton/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const slimeRunModules = import.meta.glob('../../Assets/Monsters/Slime/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const slimeManRunModules = import.meta.glob('../../Assets/Monsters/Slime Man/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const flyingEyeRunModules = import.meta.glob('../../Assets/Monsters/Flying Eye/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const PUMPKIN_HEAD_RUN_URLS = sortFrameUrls(pumpkinHeadRunModules);
export const BAT_RUN_URLS = sortFrameUrls(batRunModules);
export const GHOST_RUN_URLS = sortFrameUrls(ghostRunModules);
export const BOSS1_RUN_URLS = sortFrameUrls(boss1RunModules);
export const BOSS2_RUN_URLS = sortFrameUrls(boss2RunModules);
export const BOSS2_SLIME_BALL_URLS = sortFrameUrls(boss2SlimeBallModules);
export const SKELETON_RUN_URLS = sortFrameUrls(skeletonRunModules);
export const SLIME_RUN_URLS = sortFrameUrls(slimeRunModules);
export const SLIME_MAN_RUN_URLS = sortFrameUrls(slimeManRunModules);
export const FLYING_EYE_RUN_URLS = sortFrameUrls(flyingEyeRunModules);
