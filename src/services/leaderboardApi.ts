import type { LeaderboardEntry } from '../types/game';

const API_URL = '/api/leaderboard';

function sanitizeLeaderboardUsername(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed.length < 2 || collapsed.length > 16) return 'Player';
  if (!/^[a-zA-Z0-9 _-]+$/.test(collapsed)) return 'Player';
  return collapsed;
}

function sanitizeLeaderboardText(raw: string, maxLen: number): string {
  return raw.trim().slice(0, maxLen);
}

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
      playerId: entry.userId.trim(),
      username: sanitizeLeaderboardUsername(entry.username),
      score: Math.max(0, Math.floor(Number(entry.score) || 0)),
      character: sanitizeLeaderboardText(entry.character || 'Unknown', 48),
      character2: entry.character2 ? sanitizeLeaderboardText(entry.character2, 48) : undefined,
      level: sanitizeLeaderboardText(entry.level || '', 32),
      timestamp: entry.timestamp || Date.now(),
    }),
  });

  let json: ApiSubmitResponse = { ok: false, error: `HTTP ${res.status}` };
  try {
    json = (await res.json()) as ApiSubmitResponse;
  } catch {
    // Keep HTTP fallback message.
  }

  if (!res.ok) {
    return { ok: false, error: json.error || `HTTP ${res.status}` };
  }

  return json;
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
