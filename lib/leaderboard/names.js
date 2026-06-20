const BLOCKED = [
  'asshole',
  'bastard',
  'bitch',
  'bollocks',
  'bullshit',
  'cock',
  'crap',
  'cunt',
  'damn',
  'dick',
  'fag',
  'faggot',
  'fuck',
  'hell',
  'nigga',
  'nigger',
  'piss',
  'pussy',
  'retard',
  'shit',
  'slut',
  'twat',
  'whore',
];

function normalizeForFilter(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function hasProfanity(raw) {
  const n = normalizeForFilter(raw);
  if (!n) return false;
  return BLOCKED.some((word) => n.includes(word));
}

export function sanitizePlayerName(raw) {
  if (typeof raw !== 'string') return null;
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed.length < 2 || collapsed.length > 16) return null;
  if (!/^[a-zA-Z0-9 _-]+$/.test(collapsed)) return null;
  if (hasProfanity(collapsed)) return null;
  return collapsed;
}

export function sanitizePlayerId(raw) {
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  if (id.length < 8 || id.length > 48) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}
