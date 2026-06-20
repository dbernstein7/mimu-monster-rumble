import type { LeaderboardEntry } from '../types/game';

const API_URL = '/api/leaderboard';

interface ApiLeaderboardResponse {
  ok: boolean;
  configured?: boolean;
  entries?: LeaderboardEntry[];
  error?: string;
}

interface ApiSubmitResponse {
  ok: boolean;
  configured?: boolean;
  saved?: boolean;
  skipped?: string;
  error?: string;
}

export async function submitScoreToApi(entry: LeaderboardEntry): Promise<ApiSubmitResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: entry.userId,
      username: entry.username,
      score: entry.score,
      character: entry.character,
      level: entry.level,
      timestamp: entry.timestamp,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  return (await res.json()) as ApiSubmitResponse;
}

export async function fetchLeaderboardFromApi(): Promise<LeaderboardEntry[] | null> {
  const res = await fetch(`${API_URL}?limit=50`, { cache: 'no-store' });
  if (!res.ok) return null;

  const json = (await res.json()) as ApiLeaderboardResponse;
  if (!json.ok) return null;
  if (json.configured === false) return null;

  return Array.isArray(json.entries) ? json.entries : [];
}

export async function probeLiveLeaderboard(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}?limit=1`, { cache: 'no-store' });
    if (!res.ok) return false;
    const json = (await res.json()) as ApiLeaderboardResponse;
    return json.ok === true && json.configured === true;
  } catch {
    return false;
  }
}
