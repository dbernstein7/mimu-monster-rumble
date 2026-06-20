export const FRESH_RUN_SELECT_DATA = {
  levelIndex: 0,
  continueRun: false,
} as const;

export const RUN_MIMU1_KEY = 'runMimu1';

export function resetRunState(registry: Phaser.Data.DataManager): void {
  registry.remove('runScore');
  registry.remove('runCoins');
  registry.remove(RUN_MIMU1_KEY);
  registry.set('levelIndex', 0);
}
