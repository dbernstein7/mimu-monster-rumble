const STYLE_ID = 'mimu-char-select-overlay-styles';
const SHELL_CLASS = 'mimu-char-select-shell';
const BTN_CLASS = 'mimu-char-select-back';

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
      bottom: 2.5%;
      transform: translateX(-50%);
      pointer-events: auto;
      border: 2px solid rgba(168, 155, 196, 0.45);
      border-radius: 12px;
      padding: 0.72rem 1.75rem;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.94);
      cursor: pointer;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    .${BTN_CLASS}:hover {
      border-color: #ffc857;
      color: #ffc857;
    }
  `;
  document.head.appendChild(style);
}

/** Remove HTML back control so it never blocks other scenes. */
export function destroyCharacterSelectOverlay(): void {
  document.querySelectorAll(`.${SHELL_CLASS}`).forEach((node) => {
    node.remove();
  });
}

/** HTML back button — reliable on Vercel/mobile where canvas hits can fail. */
export function mountCharacterSelectBackButton(onBack: () => void): void {
  destroyCharacterSelectOverlay();
  ensureStyles();

  const container = document.getElementById('game-container');
  if (!container) return;

  const shell = document.createElement('div');
  shell.className = SHELL_CLASS;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = BTN_CLASS;
  btn.textContent = '← BACK';

  const handleBack = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    onBack();
  };

  btn.addEventListener('click', handleBack);
  btn.addEventListener('touchend', handleBack, { passive: false });

  shell.append(btn);
  container.appendChild(shell);
}
