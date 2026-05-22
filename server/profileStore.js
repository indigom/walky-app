/**
 * 프로필 메타 (닉네임·공개 사진 URL). 단일 Node 프로세스 메모리.
 * 프로덕션: DB 권장.
 */

const profiles = new Map();

function normalizeUserId(userId) {
  if (typeof userId !== 'string') return null;
  const id = userId.trim();
  if (!/^w_[a-z0-9_]+$/i.test(id)) return null;
  return id;
}

function normalizeNickname(nickname) {
  if (nickname == null || nickname === '') return undefined;
  if (typeof nickname !== 'string') return null;
  const n = nickname.trim();
  if (n.length < 1 || n.length > 20) return null;
  return n;
}

/** 앱·가비아 업로드 API가 반환한 공개 HTTPS URL */
function normalizeProfilePhotoUrl(url) {
  if (url == null || url === '') return undefined;
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (u.length > 512) return null;
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  const allowedPrefixes = [
    process.env.PROFILE_PUBLIC_BASE_URL,
    process.env.S3_PUBLIC_BASE_URL,
    'https://walky.co.kr/profile',
  ]
    .filter(Boolean)
    .map((b) => b.replace(/\/+$/, ''));

  const href = parsed.href.split('?')[0];
  if (allowedPrefixes.some((base) => href.startsWith(`${base}/`))) {
    return href;
  }
  if (
    parsed.hostname === 'walky.co.kr' &&
    parsed.pathname.startsWith('/profile/')
  ) {
    return href;
  }
  return null;
}

function getProfile(userId) {
  const id = normalizeUserId(userId);
  if (!id) return null;
  return profiles.get(id) ?? null;
}

function upsertProfile(userId, patch) {
  const id = normalizeUserId(userId);
  if (!id) return null;

  const prev = profiles.get(id) ?? {};
  const next = {
    userId: id,
    nickname:
      patch.nickname !== undefined ? patch.nickname : prev.nickname,
    profilePhotoUrl:
      patch.profilePhotoUrl !== undefined
        ? patch.profilePhotoUrl
        : prev.profilePhotoUrl,
    updatedAt: Date.now(),
  };

  profiles.set(id, next);
  return next;
}

function listProfiles({ limit = 200 } = {}) {
  const cap = Math.min(Math.max(1, limit), 500);
  return Array.from(profiles.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, cap);
}

module.exports = {
  normalizeUserId,
  normalizeNickname,
  normalizeProfilePhotoUrl,
  getProfile,
  upsertProfile,
  listProfiles,
};
