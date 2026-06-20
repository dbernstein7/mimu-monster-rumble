import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import MainMenuScene from './scenes/MainMenuScene';
import AuthScene from './scenes/AuthScene';
import CharacterSelectScene from './scenes/CharacterSelectScene';
import GameScene from './scenes/GameScene';
import GameOverScene from './scenes/GameOverScene';
import LeaderboardScene from './scenes/LeaderboardScene';
import { loadHeadlineFont } from './assets/uiFonts';
import { bindMobileOrientationUi, bindMobileViewport, getMobileScaleMode, isMobileImmersive } from './utils/device';
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameConstants';

bindMobileOrientationUi();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a0a2e',
  scale: {
    mode: getMobileScaleMode(),
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    fullscreenTarget: 'game-container',
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    mipmapFilter: 'LINEAR',
  },
  input: {
    gamepad: true,
    keyboard: true,
    touch: true,
    activePointers: 4,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    AuthScene,
    CharacterSelectScene,
    GameScene,
    GameOverScene,
    LeaderboardScene,
  ],
};

void loadHeadlineFont().then(() => {
  const game = new Phaser.Game(config);
  const gameContainer = document.getElementById('game-container');

  bindMobileViewport(game);

  function syncLetterboxBackground(): void {
    if (!gameContainer) return;
    const expanded = game.scale.isFullscreen || isMobileImmersive();
    gameContainer.style.backgroundColor = expanded ? '#1a0a2e' : '#000000';
  }

  function onDisplayChange(): void {
    syncLetterboxBackground();
    bindMobileViewport(game);
    game.scale.refresh();
  }

  game.scale.on('enterfullscreen', onDisplayChange);
  game.scale.on('leavefullscreen', onDisplayChange);
  onDisplayChange();
});
