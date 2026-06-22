const STYLE_ID = 'mimu-game-over-overlay-styles';
const SHELL_CLASS = 'mimu-game-over-shell';
const BTN_CLASS = 'mimu-game-over-btn';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${SHELL_CLASS} {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 30;
    }
    .${BTN_CLASS} {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: auto;
      border: 2px solid rgba(168, 155, 196, 0.45);
      border-radius: 12px;
      padding: 0.72rem 1.5rem;
      min-width: 220px;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.94);
      cursor: pointer;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      text-align: center;
    }
    .${BTN_CLASS}:hover {
      border-color: #ffc857;
      color: #ffc857;
    }
    .${BTN_CLASS}.primary {
      border-color: rgba(46, 213, 115, 0.55);
      background: rgba(20, 80, 50, 0.88);
    }
    .${BTN_CLASS}.primary:hover {
      border-color: #ffc857;
      color: #ffc857;
    }
    .${SHELL_CLASS}.mimu-game-over--mobile .${BTN_CLASS} {
      font-size: 16px;
      min-width: 200px;
      padding: 0.85rem 1.25rem;
    }
  `;
  document.head.appendChild(style);
}

export function destroyGameOverOverlay(): void {
  document.querySelectorAll(`.${SHELL_CLASS}`).forEach((node) => {
    node.remove();
  });
}

export function mountGameOverNav(options: {
  won: boolean;
  onMainMenu: () => void;
  onLeaderboard: () => void;
}): void {
  destroyGameOverOverlay();
  ensureStyles();

  const container = document.getElementById('game-container');
  if (!container) return;

  const shell = document.createElement('div');
  shell.className = SHELL_CLASS;
  if (window.matchMedia('(pointer: coarse)').matches) {
    shell.classList.add('mimu-game-over--mobile');
  }

  const makeBtn = (label: string, topPercent: number, primary: boolean, onClick: () => void): void => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = primary ? `${BTN_CLASS} primary` : BTN_CLASS;
    btn.textContent = label;
    btn.style.top = `${topPercent}%`;

    const handle = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    };

    btn.addEventListener('click', handle);
    btn.addEventListener('touchend', handle, { passive: false });
    shell.append(btn);
  };

  if (options.won) {
    makeBtn('LEADERBOARD', 66, false, options.onLeaderboard);
    makeBtn('MAIN MENU', 76, true, options.onMainMenu);
  } else {
    makeBtn('MAIN MENU', 66, true, options.onMainMenu);
    makeBtn('LEADERBOARD', 76, false, options.onLeaderboard);
  }

  container.appendChild(shell);
}
