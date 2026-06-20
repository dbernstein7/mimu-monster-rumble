import {
  hget,
  hset,
  isKvConfigured,
  zadd,
  zcard,
  zremrangebyrank,
  zrevrangeWithScores,
} from './kv.js';
import { sanitizePlayerId, sanitizePlayerName } from './names.js';

const SCORES_KEY = 'mimu:leaderboard:scores';
const META_KEY = 'mimu:leaderboard:meta';
const MAX_ENTRIES = 500;
const DEFAULT_LIMIT = 50;

function parseLimit(raw, fallback = DEFAULT_LIMIT) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

function parseScore(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const score = Math.floor(n);
  if (score < 0 || score > 999_999_999) return null;
  return score;
}

function sanitizeText(raw, maxLen) {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, maxLen);
}

async function trimLeaderboard() {
  try {
    const count = Number(await zcard(SCORES_KEY));
    if (!Number.isFinite(count) || count <= MAX_ENTRIES) return;
    await zremrangebyrank(SCORES_KEY, 0, count - MAX_ENTRIES - 1);
  } catch {
    // Best-effort trim.
  }
}

export async function handleGet(query) {
  const limit = parseLimit(query?.limit, DEFAULT_LIMIT);

  if (!isKvConfigured()) {
    return {
      status: 200,
      json: { ok: true, configured: false, entries: [], updatedAt: Date.now() },
    };
  }

  try {
    const raw = await zrevrangeWithScores(SCORES_KEY, limit);
    const entries = [];

    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i += 2) {
        const member = String(raw[i] || '');
        const score = parseScore(raw[i + 1]);
        if (!member || score === null) continue;

        let meta = null;
        try {
          const metaRaw = await hget(META_KEY, member);
          meta = metaRaw ? JSON.parse(metaRaw) : null;
        } catch {
          meta = null;
        }

        entries.push({
          userId: meta?.userId || member.split('_')[0] || member,
          username: meta?.username || 'Player',
          score,
          character: meta?.character || '',
          character2: meta?.character2 || undefined,
          level: meta?.level || '',
          timestamp: meta?.timestamp || Date.now(),
        });
      }
    }

    return {
      status: 200,
      json: { ok: true, configured: true, entries, updatedAt: Date.now() },
    };
  } catch (e) {
    return {
      status: 200,
      json: {
        ok: true,
        configured: true,
        entries: [],
        error: e && e.message ? e.message : 'Failed to read leaderboard.',
        updatedAt: Date.now(),
      },
    };
  }
}

export async function handlePost(body) {
  if (!isKvConfigured()) {
    return { status: 200, json: { ok: true, configured: false, skipped: 'not_configured' } };
  }

  const playerId = sanitizePlayerId(typeof body?.playerId === 'string' ? body.playerId : '');
  const username = sanitizePlayerName(typeof body?.username === 'string' ? body.username : '');
  const score = parseScore(body?.score);
  const character = sanitizeText(body?.character, 48);
  const character2 = sanitizeText(body?.character2, 48);
  const level = sanitizeText(body?.level, 32);
  const timestamp = Number(body?.timestamp);

  if (!playerId) {
    return { status: 400, json: { ok: false, error: 'Invalid playerId.' } };
  }
  if (!username) {
    return { status: 400, json: { ok: false, error: 'Invalid username.' } };
  }
  if (score === null) {
    return { status: 400, json: { ok: false, error: 'Invalid score.' } };
  }

  const safeTimestamp = Number.isFinite(timestamp) ? Math.floor(timestamp) : Date.now();
  const member = `${playerId}_${safeTimestamp}`;
  const entry = {
    userId: playerId,
    username,
    score,
    character,
    ...(character2 ? { character2 } : {}),
    level,
    timestamp: safeTimestamp,
  };

  try {
    await zadd(SCORES_KEY, score, member);
    await hset(META_KEY, member, JSON.stringify(entry));
    await trimLeaderboard();
    return { status: 200, json: { ok: true, configured: true, saved: true } };
  } catch (e) {
    return {
      status: 500,
      json: { ok: false, error: e && e.message ? e.message : 'Failed to save score.' },
    };
  }
}
