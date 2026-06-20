import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  type Firestore,
} from 'firebase/firestore';
import type { UserProfile, CoinLeaderboardEntry } from '../types/game';
import { getAuthInstance, getDbInstance, getCurrentUser } from './firebase';

const PROFILE_LOCAL_KEY = 'mimu_profile';

export type CoinBankTarget = 'firebase' | 'local';

export interface CoinBankResult {
  banked: number;
  totalCoins: number;
  target: CoinBankTarget;
}

let cachedProfile: UserProfile | null = null;

function loadLocalProfileRecord(): Record<string, UserProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_LOCAL_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveLocalProfileRecord(record: Record<string, UserProfile>): void {
  localStorage.setItem(PROFILE_LOCAL_KEY, JSON.stringify(record));
}

function sanitizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 16);
}

function sanitizeCoins(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function getCachedProfile(): UserProfile | null {
  return cachedProfile;
}

export function getCachedTotalCoins(): number {
  return cachedProfile?.totalCoins ?? 0;
}

function cacheProfile(profile: UserProfile): UserProfile {
  cachedProfile = profile;
  const record = loadLocalProfileRecord();
  record[profile.userId] = profile;
  saveLocalProfileRecord(record);
  void import('./firebase').then(({ syncCoinLeaderboardEntry }) =>
    syncCoinLeaderboardEntry({
      userId: profile.userId,
      username: profile.username,
      totalCoins: profile.totalCoins,
      updatedAt: profile.updatedAt,
    }),
  );
  return profile;
}

function readLocalProfile(userId: string): UserProfile | null {
  return loadLocalProfileRecord()[userId] ?? null;
}

async function readFirestoreProfile(db: Firestore, userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    userId,
    username: sanitizeUsername(String(data.username ?? 'Player')) || 'Player',
    totalCoins: sanitizeCoins(data.totalCoins),
    updatedAt: Number(data.updatedAt) || Date.now(),
  };
}

export async function ensureUserProfile(userId: string, username: string): Promise<UserProfile> {
  const cleanName = sanitizeUsername(username) || 'Player';
  const existing = readLocalProfile(userId);
  if (existing) {
    return cacheProfile({ ...existing, username: cleanName });
  }

  if (getDbInstance() && getAuthInstance()?.currentUser) {
    const db = getDbInstance()!;
    const remote = await readFirestoreProfile(db, userId);
    if (remote) {
      return cacheProfile({ ...remote, username: cleanName });
    }

    const profile: UserProfile = {
      userId,
      username: cleanName,
      totalCoins: 0,
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'users', userId), profile);
    return cacheProfile(profile);
  }

  const profile: UserProfile = {
    userId,
    username: cleanName,
    totalCoins: 0,
    updatedAt: Date.now(),
  };
  return cacheProfile(profile);
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const user = getCurrentUser();
  if (!user) {
    cachedProfile = null;
    return null;
  }

  const local = readLocalProfile(user.userId);
  if (local) {
    cachedProfile = { ...local, username: user.username };
  }

  if (getDbInstance() && getAuthInstance()?.currentUser) {
    try {
      const remote = await readFirestoreProfile(getDbInstance()!, user.userId);
      if (remote) {
        return cacheProfile({ ...remote, username: user.username });
      }
    } catch {
      // Fall back to local cache.
    }
  }

  if (local) return cacheProfile({ ...local, username: user.username });

  return ensureUserProfile(user.userId, user.username);
}

export async function bankRunCoins(coinsEarned: number): Promise<CoinBankResult> {
  const earned = sanitizeCoins(coinsEarned);
  const user = getCurrentUser();
  if (!user) {
    return { banked: 0, totalCoins: 0, target: 'local' };
  }

  if (earned <= 0) {
    const profile = cachedProfile ?? (await loadUserProfile());
    return { banked: 0, totalCoins: profile?.totalCoins ?? 0, target: 'local' };
  }

  if (getDbInstance() && getAuthInstance()?.currentUser) {
    try {
      const db = getDbInstance()!;
      const ref = doc(db, 'users', user.userId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          userId: user.userId,
          username: user.username,
          totalCoins: earned,
          updatedAt: Date.now(),
        });
      } else {
        await updateDoc(ref, {
          totalCoins: increment(earned),
          username: user.username,
          updatedAt: Date.now(),
        });
      }

      const updated = await readFirestoreProfile(db, user.userId);
      const totalCoins = updated?.totalCoins ?? earned;
      cacheProfile({
        userId: user.userId,
        username: user.username,
        totalCoins,
        updatedAt: Date.now(),
      });
      return { banked: earned, totalCoins, target: 'firebase' };
    } catch {
      return { banked: 0, totalCoins: cachedProfile?.totalCoins ?? 0, target: 'firebase' };
    }
  }

  return { banked: 0, totalCoins: 0, target: 'local' };
}

export function isCloudAccountSession(): boolean {
  return !!(getDbInstance() && getAuthInstance()?.currentUser);
}

export function validateRegistrationInput(
  email: string,
  password: string,
  username: string,
): string | null {
  const trimmedEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return 'Enter a valid email address.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  const cleanName = sanitizeUsername(username);
  if (cleanName.length < 2) {
    return 'Username must be at least 2 characters.';
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(cleanName)) {
    return 'Username can only use letters, numbers, spaces, - and _.';
  }
  return null;
}

export function validateLoginInput(email: string, password: string): string | null {
  if (!email.trim()) return 'Enter your email.';
  if (!password) return 'Enter your password.';
  return null;
}

export function clearProfileCache(): void {
  cachedProfile = null;
}

export function getLocalCoinLeaderboardEntries(): CoinLeaderboardEntry[] {
  return Object.values(loadLocalProfileRecord())
    .filter((profile) => profile.totalCoins > 0)
    .sort((a, b) => b.totalCoins - a.totalCoins || b.updatedAt - a.updatedAt)
    .slice(0, 50)
    .map((profile) => ({
      userId: profile.userId,
      username: profile.username,
      totalCoins: profile.totalCoins,
      updatedAt: profile.updatedAt,
    }));
}
