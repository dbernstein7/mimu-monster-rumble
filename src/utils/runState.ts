export const FRESH_RUN_SELECT_DATA = {
  levelIndex: 0,
  continueRun: false,
} as const;

export function resetRunState(registry: Phaser.Data.DataManager): void {
  registry.remove('runScore');
  registry.remove('runCoins');
  registry.set('levelIndex', 0);
}
