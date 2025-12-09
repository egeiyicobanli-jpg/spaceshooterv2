import { Game } from './Game.js';

const init = () => {
  try {
    console.log('Initializing Game...');
    const game = new Game();
    console.log('Game Initialized Successfully');
  } catch (error) {
    console.error('Game Initialization Error:', error);
    alert('Game Init Error: ' + error.message);
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
