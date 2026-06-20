export type AuthFormMode = 'login' | 'register';

export interface AuthFormValues {
  email: string;
  password: string;
  username: string;
}

export interface AuthFormHandle {
  getValues: () => AuthFormValues;
  setError: (message: string) => void;
  setLoading: (loading: boolean) => void;
  setMode: (mode: AuthFormMode) => void;
  destroy: () => void;
}

const STYLE_ID = 'mimu-auth-form-styles';
const FORM_ID = 'mimu-auth-form';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${FORM_ID} {
      position: fixed;
      left: 50%;
      top: clamp(220px, 36vh, 320px);
      transform: translate(-50%, 0);
      width: min(92vw, 420px);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1rem 1.1rem;
      border-radius: 14px;
      background: rgba(14, 6, 24, 0.94);
      border: 2px solid rgba(255, 200, 87, 0.35);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
      font-family: 'Exo 2', system-ui, sans-serif;
      color: #f5f0ff;
      pointer-events: auto;
    }
    #${FORM_ID} label {
      font-size: 0.78rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #a89bc4;
    }
    #${FORM_ID} input {
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
    #${FORM_ID} input:focus {
      border-color: #ffc857;
      box-shadow: 0 0 0 2px rgba(255, 200, 87, 0.25);
    }
    #${FORM_ID} input:disabled {
      opacity: 0.65;
    }
    #${FORM_ID} .mimu-auth-error {
      min-height: 1.1rem;
      font-size: 0.82rem;
      color: #ff4757;
      text-align: center;
      font-weight: 600;
    }
    #${FORM_ID} .mimu-auth-hint {
      font-size: 0.78rem;
      color: #8a7aa8;
      text-align: center;
      line-height: 1.35;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

/** Remove any leftover auth overlay from the DOM (safe to call anytime). */
export function destroyAuthFormOverlay(): void {
  document.getElementById(FORM_ID)?.remove();
}

export function mountAuthForm(initialMode: AuthFormMode, onEnter?: () => void): AuthFormHandle {
  destroyAuthFormOverlay();
  ensureStyles();

  const root = document.createElement('div');
  root.id = FORM_ID;
  root.setAttribute('role', 'group');
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
  hintEl.textContent = 'Create an account to save scores and bank coins after every run.';

  root.append(usernameWrap, emailWrap, passwordWrap, errorEl, hintEl);
  document.body.appendChild(root);

  let mode: AuthFormMode = initialMode;

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
    hintEl.textContent = isRegister
      ? 'Your coin wallet is saved to this account after each run.'
      : 'Log in to restore your profile and coin wallet on any device.';
  };

  syncMode();

  const handleEnter = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onEnter?.();
  };
  emailInput.addEventListener('keydown', handleEnter);
  passwordInput.addEventListener('keydown', handleEnter);
  usernameInput.addEventListener('keydown', handleEnter);

  return {
    getValues: () => ({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      username: usernameInput.value.trim(),
    }),
    setError: (message: string) => {
      errorEl.textContent = message;
    },
    setLoading: (loading: boolean) => {
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
      destroyAuthFormOverlay();
    },
  };
}
