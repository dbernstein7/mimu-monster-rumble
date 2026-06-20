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
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameConstants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a0a2e',
  scale: {
    mode: Phaser.Scale.FIT,
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

  function syncLetterboxBackground(): void {
    if (!gameContainer) return;
    gameContainer.style.backgroundColor = game.scale.isFullscreen ? '#1a0a2e' : '#000000';
  }

  game.scale.on('enterfullscreen', syncLetterboxBackground);
  game.scale.on('leavefullscreen', syncLetterboxBackground);
  syncLetterboxBackground();
});
