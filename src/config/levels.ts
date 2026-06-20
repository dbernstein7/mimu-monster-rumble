import type { LevelConfig, WaveConfig } from '../types/game';



/** Level 1 — fewer enemies, slower ramp, more time per wave. */

function buildEasyWaves(pool: LevelConfig['enemyPool']): WaveConfig[] {

  const waves: WaveConfig[] = [];

  for (let i = 0; i < 6; i++) {

    const count = 2 + i;

    const types = pool.slice(0, Math.min(pool.length, 1 + Math.floor(i / 2)));

    const perType = Math.max(1, Math.floor(count / types.length));

    waves.push({

      durationSec: 55,

      enemies: types.map((type) => ({ type, count: perType })),

    });

  }

  return waves;

}



/** Level 2 — tougher than carnival, but gentler than the old hard spike. */

function buildMediumWaves(pool: LevelConfig['enemyPool']): WaveConfig[] {
  const waves: WaveConfig[] = [];

  for (let i = 0; i < 7; i++) {
    const count = 3 + i;
    const types = pool.slice(0, Math.min(pool.length, 1 + Math.floor(i / 2)));
    const perType = Math.max(1, Math.floor(count / types.length));

    waves.push({
      durationSec: 50,
      enemies: types.map((type) => ({ type, count: perType })),
    });
  }

  return waves;
}



export const LEVELS: LevelConfig[] = [

  {

    id: 'hauntedCarnival',

    name: 'Haunted Carnival',

    floorColor: 0x4a235a,

    accentColor: 0xff8c00,

    enemyPool: ['pumpkinFiend', 'bat', 'ghost'],

    waves: buildEasyWaves(['pumpkinFiend', 'bat', 'ghost']),

    enemyScale: 1.1,

  },

  {

    id: 'mutatedArena',

    name: 'Mutated Arena',

    floorColor: 0x1b4332,

    accentColor: 0x52b788,

    enemyPool: ['skeleton', 'slime', 'zombie', 'witch'],

    waves: buildMediumWaves(['skeleton', 'slime', 'zombie', 'witch']),

  },

];



export function getLevel(index: number): LevelConfig {

  return LEVELS[Math.min(index, LEVELS.length - 1)];

}

