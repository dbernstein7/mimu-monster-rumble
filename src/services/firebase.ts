import { initializeApp, type FirebaseApp } from 'firebase/app';
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

const LOCAL_KEY = 'mimu_leaderboard';
const USER_KEY = 'mimu_user';

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

export function isFirebaseEnabled(): boolean {
  return getFirebaseConfig() !== null;
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

export function clearLocalUser(): void {
  localStorage.removeItem(USER_KEY);
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<{ userId: string; username: string }> {
  if (initFirebase() && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    return { userId: cred.user.uid, username };
  }
  const userId = `local_${Date.now()}`;
  saveLocalUser(username, userId);
  return { userId, username };
}

export async function login(
  email: string,
  password: string,
): Promise<{ userId: string; username: string }> {
  if (initFirebase() && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const username = cred.user.displayName ?? email.split('@')[0];
    return { userId: cred.user.uid, username };
  }
  const existing = getLocalUser();
  if (existing) return existing;
  const userId = `local_${Date.now()}`;
  const username = email.split('@')[0] || 'Player';
  saveLocalUser(username, userId);
  return { userId, username };
}

export async function logout(): Promise<void> {
  if (initFirebase() && auth) {
    await signOut(auth);
  }
  clearLocalUser();
}

export function onAuthChange(callback: (user: User | null) => void): (() => void) | null {
  if (initFirebase() && auth) {
    return onAuthStateChanged(auth, callback);
  }
  return null;
}

export async function submitScore(entry: LeaderboardEntry): Promise<void> {
  if (initFirebase() && db) {
    await setDoc(doc(db, 'leaderboard', `${entry.userId}_${entry.timestamp}`), entry);
    return;
  }
  const board = getLocalLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  saveLocalLeaderboard(board);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (initFirebase() && db) {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as LeaderboardEntry);
  }
  return getLocalLeaderboard();
}

export function getCurrentUser(): { userId: string; username: string } | null {
  if (initFirebase() && auth?.currentUser) {
    return {
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName ?? 'Player',
    };
  }
  return getLocalUser();
}

export function guestLogin(username: string): { userId: string; username: string } {
  const userId = `guest_${Date.now()}`;
  saveLocalUser(username, userId);
  return { userId, username };
}
