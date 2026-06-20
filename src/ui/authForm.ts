import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';

export type AuthFormMode = 'login' | 'register';

export interface AuthFormValues {
  email: string;
  password: string;
  username: string;
}

export interface AuthFormHandle {
  getValues: () => AuthFormValues;
  getMode: () => AuthFormMode;
  setError: (message: string) => void;
  setLoading: (loading: boolean) => void;
  setMode: (mode: AuthFormMode) => void;
  destroy: () => void;
}

const STYLE_ID = 'mimu-auth-form-styles';
const OVERLAY_CLASS = 'mimu-auth-overlay';
const FORM_CLASS = 'mimu-auth-form';
const LEGACY_FORM_ID = 'mimu-auth-form';

function submitLabel(mode: AuthFormMode): string {
  return mode === 'register' ? 'CREATE ACCOUNT' : 'LOG IN';
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${OVERLAY_CLASS} {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      z-index: 20;
      pointer-events: auto;
      transform: translate(-50%, -50%);
      max-width: 92vw;
    }
    .mimu-auth-tabs {
      display: flex;
      gap: 2.5rem;
      margin-bottom: 0.15rem;
    }
    .mimu-auth-tabs button {
      border: none;
      background: transparent;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #a89bc4;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }
    .mimu-auth-tabs button.active {
      color: #ffc857;
    }
    .${FORM_CLASS} {
      width: 420px;
      max-width: 42vw;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1rem 1.1rem 1.15rem;
      border-radius: 14px;
      background: rgba(14, 6, 24, 0.94);
      border: 2px solid rgba(255, 200, 87, 0.35);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
      font-family: 'Exo 2', system-ui, sans-serif;
      color: #f5f0ff;
      box-sizing: border-box;
    }
    .${FORM_CLASS} label {
      font-size: 0.78rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #a89bc4;
    }
    .${FORM_CLASS} input {
      width: 100%;
      box-sizing: border-box;
      border-radius: 10px;
      border: 1px solid rgba(168, 155, 196, 0.35);
      background: #1e1030;
      color: #f5f0ff;
      padding: 0.72rem 0.85rem;
      font-size: 16px;
      outline: none;
    }
    .${FORM_CLASS} input:focus {
      border-color: #ffc857;
      box-shadow: 0 0 0 2px rgba(255, 200, 87, 0.25);
    }
    .${FORM_CLASS} input:disabled {
      opacity: 0.65;
    }
    .${FORM_CLASS} .mimu-auth-error {
      min-height: 1.1rem;
      font-size: 0.82rem;
      color: #ff4757;
      text-align: center;
      font-weight: 600;
    }
    .${FORM_CLASS} .mimu-auth-hint {
      font-size: 0.78rem;
      color: #8a7aa8;
      text-align: center;
      line-height: 1.35;
      margin: 0;
    }
    .${FORM_CLASS} .mimu-auth-submit {
      margin-top: 0.25rem;
      border: none;
      border-radius: 999px;
      padding: 0.9rem 1rem;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #140a24;
      background: linear-gradient(180deg, #ffc857, #ff8c32);
      cursor: pointer;
      width: 100%;
    }
    .${FORM_CLASS} .mimu-auth-submit:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .mimu-auth-action {
      border: 2px solid rgba(168, 155, 196, 0.45);
      border-radius: 12px;
      padding: 0.72rem 1.5rem;
      min-width: 220px;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.92);
      cursor: pointer;
    }
    .mimu-auth-action:hover {
      border-color: #ffc857;
    }
    .mimu-auth-action.continue {
      border-color: rgba(46, 213, 115, 0.55);
      background: rgba(20, 80, 50, 0.85);
      min-width: 280px;
    }
  `;
  document.head.appendChild(style);
}

function positionAuthOverlay(root: HTMLElement, scene: Phaser.Scene): void {
  const container = document.getElementById('game-container');
  const canvas = scene.game.canvas;
  if (!container || !canvas) return;

  const containerRect = container.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const gameX = GAME_WIDTH / 2;
  const gameY = 430;
  const left =
    canvasRect.left - containerRect.left + (gameX / GAME_WIDTH) * canvasRect.width;
  const top =
    canvasRect.top - containerRect.top + (gameY / GAME_HEIGHT) * canvasRect.height;

  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
}

/** Remove auth HTML so it never blocks canvas clicks after leaving the account page. */
export function destroyAuthFormOverlay(): void {
  document
    .querySelectorAll(`.${OVERLAY_CLASS}, .${FORM_CLASS}, #${LEGACY_FORM_ID}`)
    .forEach((node) => {
      node.remove();
    });
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    (active.closest(`.${OVERLAY_CLASS}`) ||
      active.closest(`.${FORM_CLASS}`) ||
      active.closest(`#${LEGACY_FORM_ID}`))
  ) {
    active.blur();
  }
}

export function mountAuthForm(
  scene: Phaser.Scene,
  initialMode: AuthFormMode,
  onSubmit: () => void,
  onBack: () => void,
  options?: { showContinue?: boolean; onContinue?: () => void },
): AuthFormHandle {
  destroyAuthFormOverlay();
  ensureStyles();

  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('game-container not found');
  }

  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;

  const tabs = document.createElement('div');
  tabs.className = 'mimu-auth-tabs';
  const registerTab = document.createElement('button');
  registerTab.type = 'button';
  registerTab.textContent = 'REGISTER';
  registerTab.dataset.mode = 'register';
  const loginTab = document.createElement('button');
  loginTab.type = 'button';
  loginTab.textContent = 'LOG IN';
  loginTab.dataset.mode = 'login';
  tabs.append(registerTab, loginTab);

  const root = document.createElement('form');
  root.className = FORM_CLASS;
  root.setAttribute('autocomplete', 'on');
  root.setAttribute('aria-label', 'Account sign in');

  const usernameWrap = document.createElement('div');
  const usernameLabel = document.createElement('label');
  usernameLabel.textContent = 'Username';
  usernameLabel.htmlFor = 'mimu-auth-username';
  const usernameInput = document.createElement('input');
  usernameInput.id = 'mimu-auth-username';
  usernameInput.name = 'username';
  usernameInput.type = 'text';
  usernameInput.maxLength = 16;
  usernameInput.autocomplete = 'username';
  usernameInput.placeholder = 'Your rumble name';
  usernameWrap.append(usernameLabel, usernameInput);

  const emailWrap = document.createElement('div');
  const emailLabel = document.createElement('label');
  emailLabel.textContent = 'Email';
  emailLabel.htmlFor = 'mimu-auth-email';
  const emailInput = document.createElement('input');
  emailInput.id = 'mimu-auth-email';
  emailInput.name = 'email';
  emailInput.type = 'email';
  emailInput.autocomplete = 'email';
  emailInput.inputMode = 'email';
  emailInput.placeholder = 'you@example.com';
  emailWrap.append(emailLabel, emailInput);

  const passwordWrap = document.createElement('div');
  const passwordLabel = document.createElement('label');
  passwordLabel.textContent = 'Password';
  passwordLabel.htmlFor = 'mimu-auth-password';
  const passwordInput = document.createElement('input');
  passwordInput.id = 'mimu-auth-password';
  passwordInput.name = 'password';
  passwordInput.type = 'password';
  passwordInput.autocomplete = initialMode === 'register' ? 'new-password' : 'current-password';
  passwordInput.minLength = 6;
  passwordInput.placeholder = 'At least 6 characters';
  passwordWrap.append(passwordLabel, passwordInput);

  const errorEl = document.createElement('div');
  errorEl.className = 'mimu-auth-error';

  const hintEl = document.createElement('p');
  hintEl.className = 'mimu-auth-hint';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'mimu-auth-submit';
  submitBtn.textContent = submitLabel(initialMode);

  root.append(usernameWrap, emailWrap, passwordWrap, errorEl, hintEl, submitBtn);

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'mimu-auth-action continue';
  continueBtn.textContent = 'CONTINUE →';
  continueBtn.hidden = !options?.showContinue;

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'mimu-auth-action';
  backBtn.textContent = '← BACK';

  overlay.append(tabs, root, continueBtn, backBtn);
  container.appendChild(overlay);
  positionAuthOverlay(overlay, scene);

  let mode: AuthFormMode = initialMode;

  const syncTabColors = (): void => {
    registerTab.classList.toggle('active', mode === 'register');
    loginTab.classList.toggle('active', mode === 'login');
  };

  const syncMode = (): void => {
    const isRegister = mode === 'register';
    usernameWrap.style.display = isRegister ? 'flex' : 'none';
    usernameWrap.style.flexDirection = 'column';
    usernameWrap.style.gap = '0.35rem';
    emailWrap.style.display = 'flex';
    emailWrap.style.flexDirection = 'column';
    emailWrap.style.gap = '0.35rem';
    passwordWrap.style.display = 'flex';
    passwordWrap.style.flexDirection = 'column';
    passwordWrap.style.gap = '0.35rem';
    passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
    submitBtn.textContent = submitLabel(mode);
    hintEl.textContent = isRegister
      ? 'New here? Fill in all fields and tap Create Account.'
      : 'Already have an account? Enter email + password and tap Log In.';
    syncTabColors();
  };

  syncMode();

  const stopGameKeys = (event: Event): void => {
    event.stopPropagation();
  };
  for (const input of [usernameInput, emailInput, passwordInput]) {
    input.addEventListener('keydown', stopGameKeys);
    input.addEventListener('keyup', stopGameKeys);
  }

  root.addEventListener('submit', (event) => {
    event.preventDefault();
    onSubmit();
  });

  registerTab.addEventListener('click', () => {
    mode = 'register';
    errorEl.textContent = '';
    syncMode();
  });
  loginTab.addEventListener('click', () => {
    mode = 'login';
    errorEl.textContent = '';
    syncMode();
  });
  backBtn.addEventListener('click', () => {
    onBack();
  });
  continueBtn.addEventListener('click', () => {
    options?.onContinue?.();
  });

  const syncPosition = (): void => {
    if (overlay.isConnected) {
      positionAuthOverlay(overlay, scene);
    }
  };
  scene.scale.on('resize', syncPosition);
  window.addEventListener('resize', syncPosition);

  let destroyed = false;
  const destroyForm = (): void => {
    if (destroyed) return;
    destroyed = true;
    scene.scale.off('resize', syncPosition);
    window.removeEventListener('resize', syncPosition);
    overlay.remove();
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroyForm);

  return {
    getValues: () => ({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      username: usernameInput.value.trim(),
    }),
    getMode: () => mode,
    setError: (message: string) => {
      errorEl.textContent = message;
    },
    setLoading: (loading: boolean) => {
      submitBtn.disabled = loading;
      emailInput.disabled = loading;
      passwordInput.disabled = loading;
      usernameInput.disabled = loading;
    },
    setMode: (nextMode: AuthFormMode) => {
      mode = nextMode;
      errorEl.textContent = '';
      syncMode();
    },
    destroy: () => {
      destroyForm();
    },
  };
}
