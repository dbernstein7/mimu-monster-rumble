import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConstants';
import { isAuthInputFocused, isIOSWebKit, isMobileTouchDevice } from '../utils/device';

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
const SCROLL_CLASS = 'mimu-auth-scroll';
const SHELL_CLASS = 'mimu-auth-shell';
const FORM_CLASS = 'mimu-auth-form';
const LEGACY_FORM_ID = 'mimu-auth-form';

/** Centered panel aligned with the border frame (1280×720). */
export const AUTH_PANEL = {
  x: Math.round((GAME_WIDTH - GAME_WIDTH * 0.78) / 2),
  y: 72,
  width: Math.round(GAME_WIDTH * 0.78),
  height: Math.round(GAME_HEIGHT * 0.72),
} as const;

export interface AuthPanelInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AuthUILayout {
  panelInsets: AuthPanelInsets;
}

export const AUTH_LAYOUT: AuthUILayout = {
  panelInsets: { top: 0.1, right: 0.09, bottom: 0.11, left: 0.09 },
};

export function getAuthContentLayout(hasBorder: boolean): AuthUILayout {
  if (!hasBorder) {
    return {
      panelInsets: { top: 0.06, right: 0.08, bottom: 0.06, left: 0.08 },
    };
  }
  return {
    panelInsets: { top: 0.14, right: 0.1, bottom: 0.13, left: 0.1 },
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
      position: fixed;
      inset: 0;
      z-index: 10000;
      pointer-events: none;
    }
    .${SHELL_CLASS}.mimu-auth-keyboard-open::before {
      content: '';
      position: fixed;
      inset: 0;
      background: #000000;
      z-index: -1;
    }
    .${OVERLAY_CLASS} {
      position: fixed;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.45rem;
      pointer-events: auto;
      box-sizing: border-box;
      overflow: hidden;
      margin: 0;
    }
    .${SCROLL_CLASS} {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
      width: 100%;
      padding-right: 2px;
      scrollbar-width: thin;
      scrollbar-color: rgba(123, 75, 184, 0.55) transparent;
    }
    .${SCROLL_CLASS}::-webkit-scrollbar {
      width: 6px;
    }
    .${SCROLL_CLASS}::-webkit-scrollbar-thumb {
      background: rgba(123, 75, 184, 0.55);
      border-radius: 4px;
    }
    .mimu-auth-title {
      margin: 0;
      font-family: 'Orbitron', 'Exo 2', system-ui, sans-serif;
      font-size: clamp(1.35rem, 2.6vw, 2rem);
      font-weight: 900;
      letter-spacing: 0.06em;
      text-align: center;
      color: #ffc857;
      text-shadow: 0 0 18px rgba(255, 140, 50, 0.45);
      flex-shrink: 0;
    }
    .mimu-auth-subtitle {
      margin: 0;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: clamp(0.68rem, 1.5vw, 0.82rem);
      color: #8a7aa8;
      text-align: center;
      line-height: 1.4;
      max-width: 100%;
      padding: 0 0.2rem;
      flex-shrink: 0;
    }
    .mimu-auth-tabs {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      width: 100%;
      flex-shrink: 0;
    }
    .mimu-auth-tabs button {
      border: none;
      background: transparent;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: clamp(0.82rem, 1.6vw, 0.95rem);
      font-weight: 700;
      color: #a89bc4;
      cursor: pointer;
      padding: 0.3rem 0.55rem;
      min-height: 34px;
      -webkit-appearance: none;
      appearance: none;
    }
    .mimu-auth-tabs button.active {
      color: #ffc857;
    }
    .${FORM_CLASS} {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem 0.85rem 0.85rem;
      border-radius: 12px;
      background: rgba(14, 6, 24, 0.88);
      border: 2px solid rgba(255, 200, 87, 0.35);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      font-family: 'Exo 2', system-ui, sans-serif;
      color: #f5f0ff;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .${FORM_CLASS} label {
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #a89bc4;
    }
    .${FORM_CLASS} input {
      width: 100%;
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid rgba(168, 155, 196, 0.35);
      background: #1e1030;
      color: #f5f0ff;
      padding: 0.55rem 0.7rem;
      font-size: 16px;
      outline: none;
    }
    .${FORM_CLASS} input:focus {
      border-color: #ffc857;
      box-shadow: 0 0 0 2px rgba(255, 200, 87, 0.25);
    }
    .${FORM_CLASS} .mimu-auth-error {
      min-height: 1rem;
      font-size: 0.78rem;
      color: #ff4757;
      text-align: center;
      font-weight: 600;
    }
    .${FORM_CLASS} .mimu-auth-error.mimu-auth-success {
      color: #2ed573;
    }
    .${FORM_CLASS} .mimu-auth-forgot {
      align-self: flex-end;
      margin: -0.1rem 0 0;
      border: none;
      background: transparent;
      color: #a89bc4;
      font-size: 0.75rem;
      font-family: inherit;
      cursor: pointer;
      padding: 0.1rem 0;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .${FORM_CLASS} .mimu-auth-hint {
      font-size: 0.72rem;
      color: #8a7aa8;
      text-align: center;
      line-height: 1.3;
      margin: 0;
    }
    .${FORM_CLASS} .mimu-auth-submit {
      margin-top: 0.15rem;
      border: none;
      border-radius: 999px;
      padding: 0.65rem 0.85rem;
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #140a24;
      background: linear-gradient(180deg, #ffc857, #ff8c32);
      cursor: pointer;
      width: 100%;
      min-height: 42px;
    }
    .mimu-auth-action {
      border: 2px solid rgba(168, 155, 196, 0.45);
      border-radius: 10px;
      padding: 0.55rem 1rem;
      font-family: 'Exo 2', system-ui, sans-serif;
      font-size: clamp(0.9rem, 1.8vw, 1.05rem);
      font-weight: 700;
      color: #ffffff;
      background: rgba(46, 26, 74, 0.92);
      cursor: pointer;
      box-sizing: border-box;
      pointer-events: auto;
      width: 100%;
      flex-shrink: 0;
      min-height: 42px;
    }
    .mimu-auth-action:hover {
      border-color: #ffc857;
    }
    .mimu-auth-action.continue {
      border-color: rgba(46, 213, 115, 0.55);
      background: rgba(20, 80, 50, 0.85);
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} input {
      min-height: 44px;
      padding: 0.7rem 0.75rem;
    }
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .mimu-auth-action,
    .${OVERLAY_CLASS}.mimu-auth-overlay--mobile .${FORM_CLASS} .mimu-auth-submit {
      min-height: 46px;
    }
    .${OVERLAY_CLASS}.mimu-auth-keyboard-open .mimu-auth-title,
    .${OVERLAY_CLASS}.mimu-auth-keyboard-open .mimu-auth-subtitle,
    .${OVERLAY_CLASS}.mimu-auth-keyboard-open .mimu-auth-tabs {
      display: none;
    }
    .${OVERLAY_CLASS}.mimu-auth-keyboard-open .mimu-auth-action.mimu-auth-back {
      display: none;
    }
    .${OVERLAY_CLASS}.mimu-auth-keyboard-open {
      gap: 0.25rem;
    }
  `;
  document.head.appendChild(style);
}

function panelRectInWindow(
  canvasRect: DOMRect,
  insets: AuthPanelInsets,
): { left: number; top: number; width: number; height: number } {
  const baseLeft = canvasRect.left + (AUTH_PANEL.x / GAME_WIDTH) * canvasRect.width;
  const baseTop = canvasRect.top + (AUTH_PANEL.y / GAME_HEIGHT) * canvasRect.height;
  const baseWidth = (AUTH_PANEL.width / GAME_WIDTH) * canvasRect.width;
  const baseHeight = (AUTH_PANEL.height / GAME_HEIGHT) * canvasRect.height;

  return {
    left: baseLeft + baseWidth * insets.left,
    top: baseTop + baseHeight * insets.top,
    width: baseWidth * (1 - insets.left - insets.right),
    height: baseHeight * (1 - insets.top - insets.bottom),
  };
}

function isKeyboardLayoutActive(): boolean {
  if (isAuthInputFocused()) return true;
  if (!isMobileTouchDevice()) return false;
  const vv = window.visualViewport;
  if (!vv) return false;
  const threshold = isIOSWebKit() ? 0.88 : 0.82;
  return vv.height < window.innerHeight * threshold;
}

function scheduleAuthReposition(sync: () => void): void {
  sync();
  requestAnimationFrame(sync);
  for (const delay of [100, 250, 500]) {
    window.setTimeout(sync, delay);
  }
}

function scrollAuthInputIntoView(input: HTMLElement, scroll: HTMLElement): void {
  const inputRect = input.getBoundingClientRect();
  const scrollRect = scroll.getBoundingClientRect();
  const margin = 12;
  const below = inputRect.bottom - scrollRect.bottom + margin;
  if (below > 0) {
    scroll.scrollTop += below;
    return;
  }
  const above = scrollRect.top - inputRect.top + margin;
  if (above > 0) {
    scroll.scrollTop = Math.max(0, scroll.scrollTop - above);
  }
}

function positionAuthUi(
  shell: HTMLElement,
  overlay: HTMLElement,
  scene: Phaser.Scene,
  layout: AuthUILayout,
): void {
  const canvas = scene.game.canvas;
  if (!canvas) return;

  const mobile = isMobileTouchDevice();
  const keyboardOpen = isKeyboardLayoutActive();
  const vv = window.visualViewport;

  shell.classList.toggle('mimu-auth-keyboard-open', keyboardOpen);
  overlay.classList.toggle('mimu-auth-overlay--mobile', mobile);
  overlay.classList.toggle('mimu-auth-keyboard-open', keyboardOpen);
  document.body.classList.toggle('mimu-auth-input-focused', isAuthInputFocused());

  if (keyboardOpen && mobile) {
    const pad = isIOSWebKit() ? 4 : 8;
    const vvShrunk = !!vv && vv.height < window.innerHeight * (isIOSWebKit() ? 0.88 : 0.82);

    if (vvShrunk && vv) {
      overlay.style.left = `${vv.offsetLeft + pad}px`;
      overlay.style.top = `${vv.offsetTop + pad}px`;
      overlay.style.width = `${Math.max(200, vv.width - pad * 2)}px`;
      overlay.style.height = `${Math.max(120, vv.height - pad * 2)}px`;
      return;
    }

    // iOS Safari + interactive-widget=overlays-content: keyboard overlays without shrinking vv.
    const top = (vv?.offsetTop ?? 0) + pad;
    const width = Math.max(200, (vv?.width ?? window.innerWidth) - pad * 2);
    const height = Math.max(120, Math.round(window.innerHeight * 0.44));
    overlay.style.left = `${(vv?.offsetLeft ?? 0) + pad}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    return;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const rect = panelRectInWindow(canvasRect, layout.panelInsets);

  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${Math.max(160, rect.height)}px`;
}

/** Remove auth HTML so it never blocks canvas clicks after leaving the account page. */
export function destroyAuthFormOverlay(): void {
  document.body.classList.remove('mimu-auth-input-focused');
  document
    .querySelectorAll(`.${SHELL_CLASS}, .${OVERLAY_CLASS}, .${SCROLL_CLASS}, .${FORM_CLASS}, #${LEGACY_FORM_ID}`)
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
    layout?: AuthUILayout;
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

  const scroll = document.createElement('div');
  scroll.className = SCROLL_CLASS;

  const title = document.createElement('h1');
  title.className = 'mimu-auth-title';
  title.textContent = 'ACCOUNT';

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

  scroll.append(title, subtitle, tabs, root, continueBtn);

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'mimu-auth-action mimu-auth-back';
  backBtn.textContent = '← BACK';

  overlay.append(scroll, backBtn);
  shell.append(overlay);
  document.body.appendChild(shell);

  const syncPosition = (): void => {
    if (shell.isConnected) {
      positionAuthUi(shell, overlay, scene, layout);
    }
  };

  scheduleAuthReposition(syncPosition);
  scene.scale.on('resize', syncPosition);
  window.addEventListener('resize', syncPosition);
  window.visualViewport?.addEventListener('resize', syncPosition);
  window.visualViewport?.addEventListener('scroll', syncPosition);

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
    usernameWrap.style.gap = '0.3rem';
    emailWrap.style.display = 'flex';
    emailWrap.style.flexDirection = 'column';
    emailWrap.style.gap = '0.3rem';
    passwordWrap.style.display = 'flex';
    passwordWrap.style.flexDirection = 'column';
    passwordWrap.style.gap = '0.3rem';
    forgotBtn.hidden = isRegister || !options?.onForgotPassword;
    passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
    submitBtn.textContent = submitLabel(mode);
    hintEl.textContent = isRegister
      ? 'New here? Fill in all fields and tap Create Account.'
      : 'Already have an account? Enter email + password and tap Log In.';
    syncTabColors();
    requestAnimationFrame(syncPosition);
  };

  syncMode();

  const stopGameKeys = (event: Event): void => {
    event.stopPropagation();
  };
  for (const input of [usernameInput, emailInput, passwordInput]) {
    input.addEventListener('keydown', stopGameKeys);
    input.addEventListener('keyup', stopGameKeys);
    input.addEventListener('focus', () => {
      scheduleAuthReposition(() => {
        syncPosition();
        scrollAuthInputIntoView(input, scroll);
      });
    });
    input.addEventListener('blur', () => {
      window.setTimeout(syncPosition, 120);
    });
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

  let destroyed = false;
  const destroyForm = (): void => {
    if (destroyed) return;
    destroyed = true;
    scene.scale.off('resize', syncPosition);
    window.removeEventListener('resize', syncPosition);
    window.visualViewport?.removeEventListener('resize', syncPosition);
    window.visualViewport?.removeEventListener('scroll', syncPosition);
    document.body.classList.remove('mimu-auth-input-focused');
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
