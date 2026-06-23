function getKvRestConfig() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  return null;
}

async function kvCommand(command, args) {
  const cfg = getKvRestConfig();
  if (!cfg) throw new Error('KV not configured.');
  const url = `${cfg.url}/${command}/${args.map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KV ${command} failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json && Object.prototype.hasOwnProperty.call(json, 'result') ? json.result : null;
}

export function isKvConfigured() {
  return !!getKvRestConfig();
}

export async function zrevrangeWithScores(key, limit) {
  const n = Math.max(1, Math.floor(limit));
  return kvCommand('zrevrange', [key, '0', String(n - 1), 'WITHSCORES']);
}

export async function zadd(key, score, member) {
  await kvCommand('zadd', [key, String(score), member]);
}

export async function hset(hashKey, field, value) {
  await kvCommand('hset', [hashKey, field, value]);
}

export async function hget(hashKey, field) {
  return kvCommand('hget', [hashKey, field]);
}

export async function zremrangebyrank(key, start, stop) {
  await kvCommand('zremrangebyrank', [key, String(start), String(stop)]);
}

export async function zcard(key) {
  return kvCommand('zcard', [key]);
}

export async function zscore(key, member) {
  return kvCommand('zscore', [key, member]);
}
