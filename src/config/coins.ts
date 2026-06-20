/** Drop weight per coin value — higher value = lower weight (rarer). */
export const COIN_DROP_WEIGHTS: Record<number, number> = {
  1: 55,
  5: 28,
  10: 12,
  25: 5,
};

export const COIN_VALUES = Object.keys(COIN_DROP_WEIGHTS)
  .map(Number)
  .sort((a, b) => a - b);

const COIN_WEIGHT_TOTAL = COIN_VALUES.reduce((sum, v) => sum + COIN_DROP_WEIGHTS[v], 0);

export function rollCoinValue(): number {
  let roll = Math.random() * COIN_WEIGHT_TOTAL;
  for (const value of COIN_VALUES) {
    roll -= COIN_DROP_WEIGHTS[value];
    if (roll <= 0) return value;
  }
  return 1;
}
