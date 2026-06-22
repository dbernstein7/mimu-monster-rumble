import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isMobileTouchDevice } from '../utils/device';

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
  setSuccess: (message: string) => void;
  setLoading: (loading: boolean) => void;
  setMode: (mode: AuthFormMode) => void;
  destroy: () => void;
}

const STYLE_ID = 'mimu-auth-form-styles';
const OVERLAY_CLASS = 'mimu-auth-overlay';
const SHELL_CLASS = 'mimu-auth-shell';
const FORM_CLASS = 'mimu-auth-form';
const LEGACY_FORM_ID = 'mimu-auth-form';

/** Matches AuthScene panel — ~78% of game width so it scales on every screen. */
export const AUTH_PANEL = {
  x: Math.round((GAME_WIDTH - GAME_WIDTH * 0.78) / 2),
  y: 48,
  width: Math.round(GAME_WIDTH * 0.78),
  height: Math.round(GAME_HEIGHT * 0.84),
  contentTop: 188,
} as const;

/** Game-space anchors for auth HTML (1280×720). */
export const AUTH_LAYOUT = {
  /** Top edge of HTML block — below ACCOUNT title (~y130). */
  formTopY: 162,
  backY: AUTH_PANEL.y + AUTH_PANEL.height - 28,
} as const;

export function getAuthContentLayout(hasBorder: boolean) {
  const topInner = AUTH_PANEL.y + (hasBorder ? 72 : 24);
  return {
    titleY: topInner,
    formTopY: topInner + 42,
    backY: AUTH_PANEL.y + AUTH_PANEL.height - (hasBorder ? 52 : 28),
  };
}

function submitLabel(mode: AuthFormMode): string {
  return mode === 'register' ? 'CREATE ACCOUNT' : 'LOG IN';
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${SHELL_CLASS} {
      position: absolute;
      inset: 0;
      z-index: 20;
      pointer-events: none;
      --auth-ui-scale: 1;
    }
    .${OVERLAY_CLASS} {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: calc(0.75rem * var(--auth-ui-scale));
      pointer-events: auto;
      transform: translate(-50%, 0);
      box-sizing: border-box;
    }
    .mimu-auth-subtitle {
      margin: 0;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 13px;
      color: #8a7aa8;
      text-align: center;
      line-height: 1.45;
      max-width: 100%;
      padding: 0 0.25rem;
    }
    .${SHELL_CLASS}:not(.mimu-auth-overlay--mobile) .mimu-auth-subtitle {
      font-size: calc(13px * var(--auth-ui-scale));
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile {
      gap: 0.6rem;
      max-height: min(72vh, 520px);
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      padding: 0.15rem 0;
    }
    .${SHELL_CLASS}:not(.mimu-auth-overlay--mobile) .mimu-auth-tabs button {
      font-size: calc(15px * var(--auth-ui-scale));
    }
    .${SHELL_CLASS}:not(.mimu-auth-overlay--mobile) .${FORM_CLASS} {
      padding: calc(1rem * var(--auth-ui-scale)) calc(1.1rem * var(--auth-ui-scale));
      gap: calc(0.65rem * var(--auth-ui-scale));
    }
    .${SHELL_CLASS}:not(.mimu-auth-overlay--mobile) .${FORM_CLASS} input {
      font-size: calc(16px * var(--auth-ui-scale));
      padding: calc(0.72rem * var(--auth-ui-scale)) calc(0.85rem * var(--auth-ui-scale));
    }
    .${SHELL_CLASS}:not(.mimu-auth-overlay--mobile) .${FORM_CLASS} .mimu-auth-submit {
      font-size: calc(1rem * var(--auth-ui-scale));
      padding: calc(0.9rem * var(--auth-ui-scale)) calc(1rem * var(--auth-ui-scale));
    }
    .${SHELL_CLASS}:not(.mimu-auth-overlay--mobile) .mimu-auth-action.mimu-auth-back {
      font-size: calc(18px * var(--auth-ui-scale));
      padding: calc(0.72rem * var(--auth-ui-scale)) calc(1.5rem * var(--auth-ui-scale));
    }
    .mimu-auth-tabs {
      display: flex;
      gap: 2rem;
      justify-content: center;
      width: 100%;
    }
    .mimu-auth-tabs button {
      border: none;
      background: transparent;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #a89bc4;
      cursor: pointer;
      padding: 0.35rem 0.65rem;
      min-height: 36px;
      -webkit-appearance: none;
      appearance: none;
    }
    .mimu-auth-tabs button:focus {
      outline: none;
    }
    .mimu-auth-tabs button:focus-visible {
      outline: 2px solid rgba(255, 200, 87, 0.55);
      outline-offset: 2px;
      border-radius: 6px;
    }
    .mimu-auth-tabs button.active {
      color: #ffc857;
    }
    .${FORM_CLASS} {
      width: 100%;
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
    .${FORM_CLASS} .mimu-auth-error.mimu-auth-success {
      color: #2ed573;
    }
    .${FORM_CLASS} .mimu-auth-forgot {
      align-self: flex-end;
      margin: -0.15rem 0 0;
      border: none;
      background: transparent;
      color: #a89bc4;
      font-size: 0.8rem;
      font-family: inherit;
      cursor: pointer;
      padding: 0.15rem 0;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .${FORM_CLASS} .mimu-auth-forgot:hover {
      color: #ffc857;
    }
    .${FORM_CLASS} .mimu-auth-forgot:disabled {
      opacity: 0.55;
      cursor: wait;
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
      position: absolute;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(168, 155, 196, 0.45);
      border-radius: 12px;
      padding: 0.72rem 1.5rem;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.92);
      cursor: pointer;
      box-sizing: border-box;
      pointer-events: auto;
      z-index: 21;
    }
    .mimu-auth-action:hover {
      border-color: #ffc857;
    }
    .mimu-auth-action.continue {
      position: relative;
      transform: none;
      width: 100%;
      border-color: rgba(46, 213, 115, 0.55);
      background: rgba(20, 80, 50, 0.85);
      max-width: 360px;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .mimu-auth-tabs button {
      font-size: 14px;
      min-height: 44px;
      padding: 0.5rem 1rem;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} {
      padding: 0.85rem 0.95rem 1rem;
      gap: 0.55rem;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} label {
      font-size: 0.72rem;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} input {
      padding: 0.85rem 0.9rem;
      min-height: 48px;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} .mimu-auth-hint {
      font-size: 0.74rem;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} .mimu-auth-submit,
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .mimu-auth-action.continue {
      min-height: 48px;
      font-size: 1rem;
      max-width: none;
    }
    .${SHELL_CLASS}.mimu-auth-overlay--mobile .mimu-auth-action.mimu-auth-back {
      min-height: 48px;
      font-size: 1rem;
      width: min(360px, 92%);
    }
  `;
  document.head.appendChild(style);
}

function gamePointToContainer(
  gameX: number,
  gameY: number,
  canvasRect: DOMRect,
  containerRect: DOMRect,
): { left: number; top: number } {
  return {
    left: canvasRect.left - containerRect.left + (gameX / GAME_WIDTH) * canvasRect.width,
    top: canvasRect.top - containerRect.top + (gameY / GAME_HEIGHT) * canvasRect.height,
  };
}

function positionAuthUi(
  shell: HTMLElement,
  overlay: HTMLElement,
  backBtn: HTMLElement,
  scene: Phaser.Scene,
  layout: { formTopY: number; backY: number },
): void {
  const container = document.getElementById('game-container');
  const canvas = scene.game.canvas;
  if (!container || !canvas) return;

  const mobile = isMobileTouchDevice();
  shell.classList.toggle('mimu-auth-overlay--mobile', mobile);
  overlay.classList.toggle('mimu-auth-overlay--mobile', mobile);

  const containerRect = container.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const panelWidth = (AUTH_PANEL.width / GAME_WIDTH) * canvasRect.width;
  const canvasScale = canvasRect.width / GAME_WIDTH;
  const centerX = GAME_WIDTH / 2;
  const formTop = gamePointToContainer(centerX, layout.formTopY, canvasRect, containerRect);
  const backCenter = gamePointToContainer(centerX, layout.backY, canvasRect, containerRect);

  const formWidth = panelWidth * (mobile ? 0.9 : 0.84);
  const backWidth = panelWidth * 0.4;
  const uiScale = mobile ? 1 : Math.min(1.4, Math.max(1, canvasScale * 1.05));

  shell.style.setProperty('--auth-ui-scale', String(uiScale));
  overlay.style.left = `${formTop.left}px`;
  overlay.style.top = `${formTop.top}px`;
  overlay.style.width = `${formWidth}px`;

  backBtn.style.left = `${backCenter.left}px`;
  backBtn.style.top = `${backCenter.top}px`;
  backBtn.style.width = `${backWidth}px`;
}

/** Remove auth HTML so it never blocks canvas clicks after leaving the account page. */
export function destroyAuthFormOverlay(): void {
  document
    .querySelectorAll(`.${SHELL_CLASS}, .${OVERLAY_CLASS}, .${FORM_CLASS}, #${LEGACY_FORM_ID}`)
    .forEach((node) => {
      node.remove();
    });
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    (active.closest(`.${SHELL_CLASS}`) ||
      active.closest(`.${OVERLAY_CLASS}`) ||
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
  options?: {
    showContinue?: boolean;
    onContinue?: () => void;
    onForgotPassword?: () => void;
    layout?: { formTopY: number; backY: number };
  },
): AuthFormHandle {
  const layout = options?.layout ?? AUTH_LAYOUT;

  destroyAuthFormOverlay();
  ensureStyles();

  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('game-container not found');
  }

  const shell = document.createElement('div');
  shell.className = SHELL_CLASS;

  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;

  const tabs = document.createElement('div');
  tabs.className = 'mimu-auth-tabs';
  const subtitle = document.createElement('p');
  subtitle.className = 'mimu-auth-subtitle';
  subtitle.textContent =
    'Create an account or log in — your wallet and scores sync in the cloud';
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

  const forgotBtn = document.createElement('button');
  forgotBtn.type = 'button';
  forgotBtn.className = 'mimu-auth-forgot';
  forgotBtn.textContent = 'Forgot password?';

  const errorEl = document.createElement('div');
  errorEl.className = 'mimu-auth-error';

  const hintEl = document.createElement('p');
  hintEl.className = 'mimu-auth-hint';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'mimu-auth-submit';
  submitBtn.textContent = submitLabel(initialMode);

  root.append(usernameWrap, emailWrap, passwordWrap, forgotBtn, errorEl, hintEl, submitBtn);

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'mimu-auth-action continue';
  continueBtn.textContent = 'CONTINUE →';
  continueBtn.hidden = !options?.showContinue;

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'mimu-auth-action mimu-auth-back';
  backBtn.textContent = '← BACK';

  overlay.append(subtitle, tabs, root, continueBtn);
  shell.append(overlay, backBtn);
  container.appendChild(shell);
  positionAuthUi(shell, overlay, backBtn, scene, layout);
  requestAnimationFrame(() => positionAuthUi(shell, overlay, backBtn, scene, layout));

  let mode: AuthFormMode = initialMode;

  const syncTabColors = (): void => {
    registerTab.classList.toggle('active', mode === 'register');
    loginTab.classList.toggle('active', mode === 'login');
  };

  const clearFeedback = (): void => {
    errorEl.textContent = '';
    errorEl.classList.remove('mimu-auth-success');
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
    forgotBtn.hidden = isRegister || !options?.onForgotPassword;
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
    clearFeedback();
    syncMode();
  });
  loginTab.addEventListener('click', () => {
    mode = 'login';
    clearFeedback();
    syncMode();
  });
  forgotBtn.addEventListener('click', () => {
    options?.onForgotPassword?.();
  });
  backBtn.addEventListener('click', () => {
    onBack();
  });
  continueBtn.addEventListener('click', () => {
    options?.onContinue?.();
  });

  const syncPosition = (): void => {
    if (shell.isConnected) {
      positionAuthUi(shell, overlay, backBtn, scene, layout);
    }
  };
  scene.scale.on('resize', syncPosition);
  window.addEventListener('resize', syncPosition);
  window.visualViewport?.addEventListener('resize', syncPosition);
  window.visualViewport?.addEventListener('scroll', syncPosition);

  let destroyed = false;
  const destroyForm = (): void => {
    if (destroyed) return;
    destroyed = true;
    scene.scale.off('resize', syncPosition);
    window.removeEventListener('resize', syncPosition);
    window.visualViewport?.removeEventListener('resize', syncPosition);
    window.visualViewport?.removeEventListener('scroll', syncPosition);
    shell.remove();
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
      errorEl.classList.remove('mimu-auth-success');
    },
    setSuccess: (message: string) => {
      errorEl.textContent = message;
      errorEl.classList.add('mimu-auth-success');
    },
    setLoading: (loading: boolean) => {
      submitBtn.disabled = loading;
      emailInput.disabled = loading;
      passwordInput.disabled = loading;
      usernameInput.disabled = loading;
      forgotBtn.disabled = loading;
    },
    setMode: (nextMode: AuthFormMode) => {
      mode = nextMode;
      clearFeedback();
      syncMode();
    },
    destroy: () => {
      destroyForm();
    },
  };
}
