/** Keep each user's single highest score (ties favor newer timestamp). */
export function dedupeBestScorePerUser(entries) {
  const best = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry.userId !== 'string' || !entry.userId) continue;

    const score = Number(entry.score);
    if (!Number.isFinite(score)) continue;

    const timestamp = Number(entry.timestamp) || 0;
    const prev = best.get(entry.userId);

    if (
      !prev ||
      score > prev.score ||
      (score === prev.score && timestamp > (Number(prev.timestamp) || 0))
    ) {
      best.set(entry.userId, { ...entry, score, timestamp });
    }
  }

  return Array.from(best.values()).sort(
    (a, b) => b.score - a.score || (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0),
  );
}
