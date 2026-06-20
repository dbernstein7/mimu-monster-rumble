import { initializeApp, type FirebaseApp, FirebaseError } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import type { LeaderboardEntry } from '../types/game';
import { fetchLeaderboardFromApi, submitScoreToApi } from './leaderboardApi';

export type ScoreSaveTarget = 'firebase' | 'api' | 'local';

const LOCAL_KEY = 'mimu_leaderboard';
const USER_KEY = 'mimu_user';
const LOCAL_ACCOUNTS_KEY = 'mimu_local_accounts';
const PLAYER_ID_KEY = 'mimu:playerId';

interface LocalAccountRecord {
  userId: string;
  email: string;
  password: string;
  username: string;
}

function getFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authReadyPromise: Promise<void> | null = null;

export function isFirebaseEnabled(): boolean {
  return getFirebaseConfig() !== null;
}

export function getDbInstance(): Firestore | null {
  initFirebase();
  return db;
}

export function getAuthInstance(): Auth | null {
  initFirebase();
  return auth;
}

export function isSignedInAccount(): boolean {
  return !!(initFirebase() && auth?.currentUser);
}

function initFirebase(): boolean {
  const config = getFirebaseConfig();
  if (!config) return false;
  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return true;
}

export function initAuthListener(): void {
  if (!initFirebase() || !auth) return;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      saveLocalUser(user.displayName ?? getLocalUser()?.username ?? 'Player', user.uid);
      void import('./userProfile').then(({ loadUserProfile }) => loadUserProfile());
    } else {
      void import('./userProfile').then(({ clearProfileCache }) => clearProfileCache());
    }
  });
}

export function waitForAuthReady(): Promise<void> {
  if (!initFirebase() || !auth) return Promise.resolve();
  if (auth.currentUser) return Promise.resolve();

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const unsub = onAuthStateChanged(auth!, () => {
        unsub();
        finish();
      });
      window.setTimeout(finish, 2500);
    });
  }

  return authReadyPromise;
}

function getOrCreatePlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id || id.length < 8) {
      id = `p${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return `p${Date.now().toString(36)}`;
  }
}

function getLocalLeaderboard(): LeaderboardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveLocalLeaderboard(entries: LeaderboardEntry[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 50)));
}

export function getLocalUser(): { username: string; userId: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalUser(username: string, userId: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify({ username, userId }));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function loadLocalAccounts(): LocalAccountRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccountRecord[]): void {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function findLocalAccount(email: string): LocalAccountRecord | undefined {
  const normalized = normalizeEmail(email);
  return loadLocalAccounts().find((account) => account.email === normalized);
}

export function formatAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'That email is already registered. Try logging in.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a moment and try again.';
      default:
        break;
    }
  }

  if (err instanceof Error) {
    return err.message.replace(/^Firebase:\s*/i, '').slice(0, 90);
  }

  return 'Something went wrong. Try again.';
}

export function clearLocalUser(): void {
  localStorage.removeItem(USER_KEY);
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<{ userId: string; username: string }> {
  if (initFirebase() && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: username });
    saveLocalUser(username, cred.user.uid);
    const { ensureUserProfile } = await import('./userProfile');
    await ensureUserProfile(cred.user.uid, username);
    return { userId: cred.user.uid, username };
  }

  const normalizedEmail = normalizeEmail(email);
  if (findLocalAccount(normalizedEmail)) {
    throw new Error('That email is already registered. Try logging in.');
  }

  const userId = getOrCreatePlayerId();
  saveLocalAccounts([
    ...loadLocalAccounts(),
    { userId, email: normalizedEmail, password, username },
  ]);
  saveLocalUser(username, userId);
  const { ensureUserProfile } = await import('./userProfile');
  await ensureUserProfile(userId, username);
  return { userId, username };
}

export async function login(
  email: string,
  password: string,
): Promise<{ userId: string; username: string }> {
  if (initFirebase() && auth) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const username = cred.user.displayName ?? email.split('@')[0];
    saveLocalUser(username, cred.user.uid);
    const { loadUserProfile } = await import('./userProfile');
    await loadUserProfile();
    return { userId: cred.user.uid, username };
  }

  const account = findLocalAccount(email);
  if (!account || account.password !== password) {
    throw new Error('Invalid email or password.');
  }

  saveLocalUser(account.username, account.userId);
  const { loadUserProfile } = await import('./userProfile');
  await loadUserProfile();
  return { userId: account.userId, username: account.username };
}

export async function logout(): Promise<void> {
  if (initFirebase() && auth) {
    await signOut(auth);
  }
  clearLocalUser();
  const { clearProfileCache } = await import('./userProfile');
  clearProfileCache();
}

export function onAuthChange(callback: (user: User | null) => void): (() => void) | null {
  if (initFirebase() && auth) {
    return onAuthStateChanged(auth, callback);
  }
  return null;
}

export async function submitScore(entry: LeaderboardEntry): Promise<ScoreSaveTarget> {
  if (initFirebase() && auth?.currentUser && db) {
    try {
      await setDoc(doc(db, 'leaderboard', `${entry.userId}_${entry.timestamp}`), entry);
      return 'firebase';
    } catch {
      // Fall through to shared API / local storage.
    }
  }

  try {
    const apiResult = await submitScoreToApi(entry);
    if (apiResult.ok && apiResult.configured !== false) {
      return 'api';
    }
  } catch {
    // Fall through to local storage.
  }

  const board = getLocalLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  saveLocalLeaderboard(board);
  return 'local';
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const apiEntries = await fetchLeaderboardFromApi();
    if (apiEntries !== null) {
      return apiEntries;
    }
  } catch {
    // Fall through.
  }

  if (initFirebase() && db) {
    try {
      const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as LeaderboardEntry);
    } catch {
      // Fall through.
    }
  }

  return getLocalLeaderboard();
}

export function getCurrentUser(): { userId: string; username: string } | null {
  if (initFirebase() && auth?.currentUser) {
    return {
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName ?? getLocalUser()?.username ?? 'Player',
    };
  }
  return getLocalUser();
}

export async function getCurrentUserAsync(): Promise<{ userId: string; username: string } | null> {
  await waitForAuthReady();
  return getCurrentUser();
}

export function guestLogin(username: string): { userId: string; username: string } {
  const userId = getOrCreatePlayerId();
  saveLocalUser(username, userId);
  void import('./userProfile').then(({ ensureUserProfile }) => ensureUserProfile(userId, username));
  return { userId, username };
}
