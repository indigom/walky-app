/**
 * 근처(기본 50m) 이성 산책자 감지 + Expo Push + 목록 반환.
 * 프로덕션: Redis 등 공유 저장소 권장 (현재는 단일 Node 프로세스 메모리).
 */

const { getProfile } = require('./profileStore');

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_RADIUS_M = 50;
const PAIR_COOLDOWN_MS = 10 * 60 * 1000;

const state = {
  presences: new Map(),
  pairCooldown: new Map(),
};

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function oppositeGender(g) {
  return g === 'male' ? 'female' : 'male';
}

function cleanupStale(now) {
  for (const [id, p] of state.presences) {
    if (now - p.updatedAt > PRESENCE_TTL_MS) {
      state.presences.delete(id);
    }
  }
}

function findNearbyOppositeWalkers(userId, lat, lng, gender, radiusM) {
  const wantGender = oppositeGender(gender);
  const list = [];

  for (const [otherId, other] of state.presences) {
    if (otherId === userId) continue;
    if (other.gender !== wantGender) continue;

    const distanceM = haversineMeters(lat, lng, other.lat, other.lng);
    if (distanceM > radiusM) continue;

    list.push({
      userId: otherId,
      dogName: other.dogName?.trim() || '강아지',
      nickname:
        typeof other.nickname === 'string' && other.nickname.trim()
          ? other.nickname.trim()
          : undefined,
      profilePhotoUrl:
        typeof other.profilePhotoUrl === 'string' && other.profilePhotoUrl.trim()
          ? other.profilePhotoUrl.trim()
          : undefined,
      gender: other.gender,
      distanceM: Math.round(distanceM),
    });
  }

  list.sort((a, b) => a.distanceM - b.distanceM);
  return list;
}

async function sendExpoPush(pushToken, title, body) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      to: pushToken,
      title,
      body,
      sound: 'dog_bark.wav',
      priority: 'high',
    }),
  });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleNearbyPresence(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const action = body.action;
  const now = Date.now();
  cleanupStale(now);

  if (action === 'leave') {
    const userId = body.userId;
    if (typeof userId === 'string') {
      state.presences.delete(userId);
    }
    return res.json({ ok: true, nearbyWalkers: [] });
  }

  if (action !== 'heartbeat') {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const userId = body.userId;
  const lat = body.lat;
  const lng = body.lng;
  const gender = body.gender;
  const pushToken =
    typeof body.pushToken === 'string' ? body.pushToken : undefined;
  const dogName = typeof body.dogName === 'string' ? body.dogName : '강아지';
  const nickname =
    typeof body.nickname === 'string' ? body.nickname : undefined;
  const profilePhotoUrl =
    typeof body.profilePhotoUrl === 'string' ? body.profilePhotoUrl : undefined;
  const storedProfile = getProfile(userId);
  const alertsEnabled = body.alertsEnabled !== false;
  const radiusM =
    typeof body.radiusM === 'number' && body.radiusM > 0
      ? body.radiusM
      : DEFAULT_RADIUS_M;

  if (
    typeof userId !== 'string' ||
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    (gender !== 'male' && gender !== 'female')
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  state.presences.set(userId, {
    userId,
    lat,
    lng,
    gender,
    pushToken,
    dogName,
    nickname: nickname ?? storedProfile?.nickname,
    profilePhotoUrl:
      profilePhotoUrl ?? storedProfile?.profilePhotoUrl,
    updatedAt: now,
  });

  const nearbyWalkers = findNearbyOppositeWalkers(
    userId,
    lat,
    lng,
    gender,
    radiusM
  );

  let notifySelf = false;

  if (alertsEnabled) {
    for (const other of nearbyWalkers) {
      const otherPresence = state.presences.get(other.userId);
      if (!otherPresence) continue;

      const pairKey = [userId, other.userId].sort().join(':');
      const last = state.pairCooldown.get(pairKey) ?? 0;
      if (now - last < PAIR_COOLDOWN_MS) continue;

      state.pairCooldown.set(pairKey, now);
      notifySelf = true;

      const title = otherPresence.dogName?.trim() || 'Walky';
      const bodyText = `${dogName} 근처에서 다른 산책자가 지나갔어요!`;

      if (otherPresence.pushToken) {
        try {
          await sendExpoPush(otherPresence.pushToken, title, bodyText);
        } catch {
          // noop
        }
      }
    }
  }

  return res.json({
    ok: true,
    nearbyWalkers,
    nearbyOppositeCount: nearbyWalkers.length,
    notifySelf: alertsEnabled ? notifySelf : false,
  });
}

function getPresence(userId) {
  return state.presences.get(userId) ?? null;
}

function isOppositeGenderNearby(userId, otherUserId, radiusM = DEFAULT_RADIUS_M) {
  const self = state.presences.get(userId);
  const other = state.presences.get(otherUserId);
  if (!self || !other) return false;
  if (self.gender === other.gender) return false;
  const distanceM = haversineMeters(self.lat, self.lng, other.lat, other.lng);
  return distanceM <= radiusM;
}

module.exports = {
  handleNearbyPresence,
  getPresence,
  isOppositeGenderNearby,
  cleanupStalePresences: cleanupStale,
};
