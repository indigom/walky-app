import { Platform } from 'react-native';

import {
  NEARBY_WALKER_API_URL,
  NEARBY_WALKER_RADIUS_M,
} from '../constants/nearbyWalkerApi';
import type { UserProfile } from '../types';
import { getExpoPushTokenOrNull } from './expoPushToken';
import { presentNearbyWalkerBarkNotification } from './nearbyWalkerNotifications';
import { getWalkyUserId } from './walkyUserId';

export type NearbyWalkerHeartbeatInput = {
  latitude: number;
  longitude: number;
  gender: NonNullable<UserProfile['gender']>;
  dogName: string;
  pushToken?: string | null;
};

export type NearbyWalkerHeartbeatResult = {
  ok: boolean;
  nearbyOppositeCount: number;
  notifySelf: boolean;
};

function isNearbyWalkerAlertsEnabled(user: UserProfile | null | undefined): boolean {
  if (!user?.gender) return false;
  return user.nearbyWalkerAlerts !== false;
}

async function postPresence(
  body: Record<string, unknown>
): Promise<NearbyWalkerHeartbeatResult | null> {
  if (!NEARBY_WALKER_API_URL) return null;

  try {
    const res = await fetch(NEARBY_WALKER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Partial<NearbyWalkerHeartbeatResult>;
    return {
      ok: data.ok === true,
      nearbyOppositeCount:
        typeof data.nearbyOppositeCount === 'number' ? data.nearbyOppositeCount : 0,
      notifySelf: data.notifySelf === true,
    };
  } catch {
    return null;
  }
}

/**
 * 산책 중 GPS 갱신 시 호출 — 50m 이내 이성 산책자가 있으면 서버가 푸시·로컬 알림 트리거.
 */
export async function reportNearbyWalkerHeartbeat(
  user: UserProfile | null | undefined,
  input: NearbyWalkerHeartbeatInput
): Promise<NearbyWalkerHeartbeatResult | null> {
  if (Platform.OS === 'web') return null;
  if (!isNearbyWalkerAlertsEnabled(user)) return null;

  const userId = await getWalkyUserId();
  const pushToken = input.pushToken ?? (await getExpoPushTokenOrNull());

  const result = await postPresence({
    action: 'heartbeat',
    userId,
    lat: input.latitude,
    lng: input.longitude,
    gender: input.gender,
    pushToken,
    dogName: input.dogName,
    radiusM: NEARBY_WALKER_RADIUS_M,
  });

  if (result?.notifySelf) {
    await presentNearbyWalkerBarkNotification(input.dogName);
  }

  return result;
}

/** 산책 종료·화면 이탈 시 presence 제거 */
export async function reportNearbyWalkerLeave(): Promise<void> {
  if (Platform.OS === 'web') return;

  const userId = await getWalkyUserId();
  await postPresence({ action: 'leave', userId });
}
