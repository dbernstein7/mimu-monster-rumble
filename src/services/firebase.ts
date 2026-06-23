import { initializeApp, type FirebaseApp, FirebaseError } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import type { CoinLeaderboardEntry, LeaderboardEntry } from '../types/game';
import { fetchLeaderboardFromApi, submitScoreToApi } from './leaderboardApi';

export type ScoreSaveTarget = 'firebase' | 'api' | 'none';

export type SubmitScoreFailureReason = 'not_best' | 'cloud_failed' | 'invalid_score';

export interface SubmitScoreResult {
  target: ScoreSaveTarget;
  saved: boolean;
  reason?: SubmitScoreFailureReason;
}

export type LeaderboardSource = 'global' | 'unavailable';

export interface LeaderboardFetchResult {
  entries: LeaderboardEntry[];
  source: LeaderboardSource;
  viewerEntry?: LeaderboardEntry | null;
}

const PLAYER_ID_KEY = 'mimu:playerId';
const LEADERBOARD_LIMIT = 50;
const LEADERBOARD_FETCH_LIMIT = 200;

const CLOUD_AUTH_REQUIRED_MSG =
  'Cloud accounts are not configured on this server. Add VITE_FIREBASE_* env vars on Vercel and redeploy.';

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
let initialAuthRestore: Promise<void> | null = null;
let persistencePromise: Promise<void> | null = null;
let cachedAuthUser: { userId: string; username: string } | null = null;

function mapAuthUser(user: User): { userId: string; username: string } {
  return {
    userId: user.uid,
    username: user.displayName?.trim() || 'Player',
  };
}

function setCachedAuthUser(user: User | null): void {
  cachedAuthUser = user ? mapAuthUser(user) : null;
}

export function isFirebaseEnabled(): boolean {
  return getFirebaseConfig() !== null;
}

export function getCloudAuthRequiredMessage(): string {
  return CLOUD_AUTH_REQUIRED_MSG;
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
  if (!initFirebase()) return false;
  return !!(auth?.currentUser || cachedAuthUser);
}

function initFirebase(): boolean {
  const config = getFirebaseConfig();
  if (!config) return false;
  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  }
  return true;
}

function requireCloudAuth(): Auth {
  if (!initFirebase() || !auth) {
    throw new Error(CLOUD_AUTH_REQUIRED_MSG);
  }
  return auth;
}

export function initAuthListener(): void {
  if (!initFirebase() || !auth) return;
  onAuthStateChanged(auth, (user) => {
    setCachedAuthUser(user);
    if (user) {
      void import('./userProfile').then(({ loadUserProfile }) => loadUserProfile());
    } else {
      void import('./userProfile').then(({ clearProfileCache }) => clearProfileCache());
    }
  });
}

export function waitForAuthReady(): Promise<void> {
  if (!initFirebase() || !auth) return Promise.resolve();

  if (!initialAuthRestore) {
    initialAuthRestore = (persistencePromise ?? Promise.resolve()).then(
      () =>
        new Promise<void>((resolve) => {
          const unsub = onAuthStateChanged(auth!, () => {
            unsub();
            resolve();
          });
        }),
    );
  }

  return initialAuthRestore;
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

function sanitizeLeaderboardUsername(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed.length < 2 || collapsed.length > 16) return 'Player';
  if (!/^[a-zA-Z0-9 _-]+$/.test(collapsed)) return 'Player';
  return collapsed;
}

function normalizeLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry {
  return {
    userId: entry.userId.trim(),
    username: sanitizeLeaderboardUsername(entry.username),
    score: Math.max(0, Math.floor(Number(entry.score) || 0)),
    character: (entry.character || 'Unknown').trim().slice(0, 48),
    character2: entry.character2?.trim().slice(0, 48) || undefined,
    level: (entry.level || '').trim().slice(0, 32),
    timestamp: Number(entry.timestamp) || Date.now(),
  };
}
function dedupeLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const best = new Map<string, LeaderboardEntry>();

  for (const entry of entries) {
    if (!entry?.userId) continue;
    const prev = best.get(entry.userId);
    if (
      !prev ||
      entry.score > prev.score ||
      (entry.score === prev.score && entry.timestamp > prev.timestamp)
    ) {
      best.set(entry.userId, entry);
    }
  }

  return Array.from(best.values()).sort(
    (a, b) => b.score - a.score || b.timestamp - a.timestamp,
  );
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
      case 'auth/operation-not-allowed':
        return 'Email/password sign-in is disabled in Firebase. Enable it in the Firebase console.';
      default:
        break;
    }
  }

  if (err instanceof Error) {
    return err.message.replace(/^Firebase:\s*/i, '').slice(0, 120);
  }

  return 'Something went wrong. Try again.';
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<{ userId: string; username: string }> {
  const authInstance = requireCloudAuth();
  const cred = await createUserWithEmailAndPassword(authInstance, email.trim(), password);
  await updateProfile(cred.user, { displayName: username.trim() });
  const { ensureUserProfile } = await import('./userProfile');
  await ensureUserProfile(cred.user.uid, username);
  setCachedAuthUser(cred.user);
  return { userId: cred.user.uid, username: username.trim() };
}

export async function sendPasswordReset(email: string): Promise<void> {
  const authInstance = requireCloudAuth();
  await sendPasswordResetEmail(authInstance, email.trim());
}

export async function login(
  email: string,
  password: string,
): Promise<{ userId: string; username: string }> {
  const authInstance = requireCloudAuth();
  const cred = await signInWithEmailAndPassword(authInstance, email.trim(), password);
  const username = cred.user.displayName?.trim() || email.split('@')[0] || 'Player';
  const { loadUserProfile } = await import('./userProfile');
  await loadUserProfile();
  setCachedAuthUser(cred.user);
  return { userId: cred.user.uid, username };
}

export async function logout(): Promise<void> {
  if (initFirebase() && auth) {
    await Promise.race([
      signOut(auth),
      new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
    ]);
  }
  initialAuthRestore = null;
  setCachedAuthUser(null);
  const { clearProfileCache } = await import('./userProfile');
  clearProfileCache();
}

export function onAuthChange(callback: (user: User | null) => void): (() => void) | null {
  if (initFirebase() && auth) {
    return onAuthStateChanged(auth, callback);
  }
  return null;
}

export async function submitScore(entry: LeaderboardEntry): Promise<SubmitScoreResult> {
  const normalized = normalizeLeaderboardEntry(entry);
  if (normalized.score <= 0) {
    return { target: 'none', saved: false, reason: 'invalid_score' };
  }

  let apiSaved = false;
  let apiConfigured = false;
  let apiSkippedNotBest = false;

  try {
    const apiResult = await submitScoreToApi(normalized);
    apiConfigured = !!(apiResult.ok && apiResult.configured !== false);
    if (apiResult.ok && apiConfigured && apiResult.saved) {
      apiSaved = true;
    } else if (apiResult.skipped === 'not_personal_best') {
      apiSkippedNotBest = true;
    }
  } catch {
    // Try Firestore next.
  }

  let firebaseSaved = false;
  let firestoreNotBest = false;
  let firestoreAttempted = false;

  await waitForAuthReady();
  const authUser = getAuthInstance()?.currentUser;
  if (authUser && authUser.uid === normalized.userId && db) {
    firestoreAttempted = true;
    try {
      const ref = doc(db, 'leaderboard', normalized.userId);
      const existing = await getDoc(ref);
      const prevScore = existing.exists() ? (existing.data() as LeaderboardEntry).score : -1;
      if (normalized.score > prevScore) {
        const firestorePayload = {
          userId: normalized.userId,
          username: normalized.username,
          score: normalized.score,
          character: normalized.character,
          level: normalized.level,
          timestamp: normalized.timestamp,
          ...(normalized.character2 ? { character2: normalized.character2 } : {}),
        };
        await setDoc(ref, firestorePayload, { merge: true });
        firebaseSaved = true;
      } else if (existing.exists()) {
        firestoreNotBest = true;
      }
    } catch {
      // Report as cloud failure below if nothing saved.
    }
  }

  if (apiSaved) return { target: 'api', saved: true };
  if (firebaseSaved) return { target: 'firebase', saved: true };

  if (apiSkippedNotBest && firestoreNotBest) {
    return { target: apiConfigured ? 'api' : 'firebase', saved: false, reason: 'not_best' };
  }

  if (!firestoreAttempted && !apiConfigured) {
    return { target: 'none', saved: false, reason: 'cloud_failed' };
  }

  return { target: 'none', saved: false, reason: 'cloud_failed' };
}

async function fetchCloudPersonalBest(userId: string): Promise<LeaderboardEntry | null> {
  if (!initFirebase() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'leaderboard', userId));
    if (snap.exists()) {
      return snap.data() as LeaderboardEntry;
    }
  } catch {
    // Fall through.
  }
  return null;
}

export async function fetchLeaderboard(): Promise<LeaderboardFetchResult> {
  const collected: LeaderboardEntry[] = [];
  let globalAvailable = false;

  try {
    const apiEntries = await fetchLeaderboardFromApi();
    if (apiEntries !== null) {
      collected.push(...apiEntries);
      globalAvailable = true;
    }
  } catch {
    // Fall through.
  }

  if (initFirebase() && db) {
    try {
      const q = query(
        collection(db, 'leaderboard'),
        orderBy('score', 'desc'),
        limit(LEADERBOARD_FETCH_LIMIT),
      );
      const snap = await getDocs(q);
      collected.push(...snap.docs.map((d) => d.data() as LeaderboardEntry));
      globalAvailable = true;
    } catch {
      // Fall through.
    }
  }

  let viewerEntry: LeaderboardEntry | null = null;
  const user = getCurrentUser();
  if (user && globalAvailable) {
    viewerEntry = await fetchCloudPersonalBest(user.userId);
    if (viewerEntry) {
      const existing = collected.find((row) => row.userId === user.userId);
      if (!existing || viewerEntry.score > existing.score) {
        collected.push(viewerEntry);
      }
    }
  }

  if (globalAvailable) {
    return {
      entries: dedupeLeaderboardEntries(collected).slice(0, LEADERBOARD_LIMIT),
      source: 'global',
      viewerEntry,
    };
  }

  return {
    entries: [],
    source: 'unavailable',
    viewerEntry: null,
  };
}

export async function syncCoinLeaderboardEntry(profile: CoinLeaderboardEntry): Promise<void> {
  if (!initFirebase() || !db || !auth?.currentUser) return;
  if (auth.currentUser.uid !== profile.userId) return;

  try {
    await setDoc(doc(db, 'coinLeaderboard', profile.userId), {
      userId: profile.userId,
      username: profile.username.slice(0, 16),
      totalCoins: Math.max(0, Math.floor(profile.totalCoins)),
      updatedAt: profile.updatedAt || Date.now(),
    });
  } catch {
    // Best-effort sync for the public coin board.
  }
}

export async function fetchCoinLeaderboard(): Promise<CoinLeaderboardEntry[]> {
  let entries: CoinLeaderboardEntry[] = [];

  if (initFirebase() && db) {
    try {
      const q = query(collection(db, 'coinLeaderboard'), orderBy('totalCoins', 'desc'), limit(50));
      const snap = await getDocs(q);
      entries = snap.docs.map((d) => {
        const data = d.data();
        return {
          userId: String(data.userId ?? d.id),
          username: String(data.username ?? 'Player').slice(0, 16),
          totalCoins: Math.max(0, Math.floor(Number(data.totalCoins) || 0)),
          updatedAt: Number(data.updatedAt) || Date.now(),
        } satisfies CoinLeaderboardEntry;
      });
    } catch {
      entries = [];
    }
  }

  if (entries.length === 0 && !initFirebase()) {
    const { getLocalCoinLeaderboardEntries } = await import('./userProfile');
    return getLocalCoinLeaderboardEntries();
  }

  const { getCachedProfile } = await import('./userProfile');
  const user = getCurrentUser();
  const profile = getCachedProfile();
  if (user && profile && profile.totalCoins > 0) {
    const existing = entries.find((entry) => entry.userId === user.userId);
    const walletRow: CoinLeaderboardEntry = {
      userId: user.userId,
      username: profile.username,
      totalCoins: profile.totalCoins,
      updatedAt: profile.updatedAt,
    };
    if (!existing || walletRow.totalCoins > existing.totalCoins) {
      entries = entries.filter((entry) => entry.userId !== user.userId);
      entries.push(walletRow);
      entries.sort((a, b) => b.totalCoins - a.totalCoins || b.updatedAt - a.updatedAt);
      entries = entries.slice(0, 50);
    }
  }

  return entries;
}

export function getCurrentUser(): { userId: string; username: string } | null {
  if (initFirebase() && auth?.currentUser) {
    return mapAuthUser(auth.currentUser);
  }
  return cachedAuthUser;
}

export async function getCurrentUserAsync(): Promise<{ userId: string; username: string } | null> {
  await waitForAuthReady();
  return getCurrentUser();
}

/** Stable anonymous id for leaderboard entries when not registered. */
export function getGuestPlayerId(): string {
  return getOrCreatePlayerId();
}
