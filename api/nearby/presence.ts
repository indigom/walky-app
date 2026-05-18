/**
 * Vercel Serverless — 근처(기본 50m) 이성 산책자 감지 + Expo Push.
 * 배포: 프로젝트 루트에 `vercel.json` 포함 후 `vercel deploy`
 * 프로덕션에서는 KV/Redis 등 공유 저장소로 교체 권장 (현재는 warm 인스턴스 메모리).
 */

type Gender = 'male' | 'female';

type Presence = {
  userId: string;
  lat: number;
  lng: number;
  gender: Gender;
  pushToken?: string;
  dogName?: string;
  updatedAt: number;
};

type GlobalNearbyState = {
  presences: Map<string, Presence>;
  pairCooldown: Map<string, number>;
};

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_RADIUS_M = 50;
const PAIR_COOLDOWN_MS = 10 * 60 * 1000;

function getState(): GlobalNearbyState {
  const g = globalThis as typeof globalThis & {
    __walkyNearbyState?: GlobalNearbyState;
  };
  if (!g.__walkyNearbyState) {
    g.__walkyNearbyState = {
      presences: new Map(),
      pairCooldown: new Map(),
    };
  }
  return g.__walkyNearbyState;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
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

function oppositeGender(g: Gender): Gender {
  return g === 'male' ? 'female' : 'male';
}

function cleanupStale(state: GlobalNearbyState, now: number) {
  for (const [id, p] of state.presences) {
    if (now - p.updatedAt > PRESENCE_TTL_MS) {
      state.presences.delete(id);
    }
  }
}

async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string
): Promise<void> {
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

type VercelReq = { method?: string; body?: Record<string, unknown> };
type VercelRes = {
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
  json: (body: unknown) => void;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const action = body.action;

  const state = getState();
  const now = Date.now();
  cleanupStale(state, now);

  if (action === 'leave') {
    const userId = body.userId;
    if (typeof userId === 'string') {
      state.presences.delete(userId);
    }
    return res.json({ ok: true });
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
    updatedAt: now,
  });

  let nearbyOppositeCount = 0;
  let notifySelf = false;
  const wantGender = oppositeGender(gender);

  for (const [otherId, other] of state.presences) {
    if (otherId === userId) continue;
    if (other.gender !== wantGender) continue;

    const dist = haversineMeters(lat, lng, other.lat, other.lng);
    if (dist > radiusM) continue;

    const pairKey = [userId, otherId].sort().join(':');
    const last = state.pairCooldown.get(pairKey) ?? 0;
    if (now - last < PAIR_COOLDOWN_MS) continue;

    state.pairCooldown.set(pairKey, now);
    nearbyOppositeCount += 1;
    notifySelf = true;

    const title = other.dogName?.trim() || 'Walky';
    const bodyText = `${dogName} 근처에서 다른 산책자가 지나갔어요!`;

    if (other.pushToken) {
      try {
        await sendExpoPush(other.pushToken, title, bodyText);
      } catch {
        // noop
      }
    }
  }

  return res.json({
    ok: true,
    nearbyOppositeCount,
    notifySelf,
  });
}
