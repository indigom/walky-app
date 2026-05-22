import { Platform } from 'react-native';

import {
  NEARBY_WALKER_API_URL,
  NEARBY_WALKER_RADIUS_M,
} from '../constants/nearbyWalkerApi';
import type { UserProfile } from '../types';
import type {
  NearbyWalkerEntry,
  NearbyWalkerPresenceResult,
} from '../types/nearbyWalker';
import { getExpoPushTokenOrNull } from './expoPushToken';
import { presentNearbyWalkerBarkNotification } from './nearbyWalkerNotifications';
import { getWalkyUserId } from './walkyUserId';

export type NearbyWalkerHeartbeatInput = {
  latitude: number;
  longitude: number;
  gender: NonNullable<UserProfile['gender']>;
  dogName: string;
  nickname?: string;
  pushToken?: string | null;
};

function parseNearbyWalkers(raw: unknown): NearbyWalkerEntry[] {
  if (!Array.isArray(raw)) return [];

  const list: NearbyWalkerEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const userId = row.userId;
    const gender = row.gender;
    const distanceM = row.distanceM;

    if (typeof userId !== 'string') continue;
    if (gender !== 'male' && gender !== 'female') continue;
    if (typeof distanceM !== 'number' || !Number.isFinite(distanceM)) continue;

    list.push({
      userId,
      dogName:
        typeof row.dogName === 'string' && row.dogName.trim()
          ? row.dogName.trim()
          : '강아지',
      nickname:
        typeof row.nickname === 'string' && row.nickname.trim()
          ? row.nickname.trim()
          : undefined,
      profilePhotoUrl:
        typeof row.profilePhotoUrl === 'string' && row.profilePhotoUrl.trim()
          ? row.profilePhotoUrl.trim()
          : undefined,
      gender,
      distanceM: Math.round(distanceM),
    });
  }

  return list.sort((a, b) => a.distanceM - b.distanceM);
}

async function postPresence(
  body: Record<string, unknown>
): Promise<NearbyWalkerPresenceResult | null> {
  if (!NEARBY_WALKER_API_URL) return null;

  try {
    const res = await fetch(NEARBY_WALKER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const nearbyWalkers = parseNearbyWalkers(data.nearbyWalkers);

    return {
      ok: data.ok === true,
      nearbyWalkers,
      nearbyOppositeCount:
        typeof data.nearbyOppositeCount === 'number'
          ? data.nearbyOppositeCount
          : nearbyWalkers.length,
      notifySelf: data.notifySelf === true,
    };
  } catch {
    return null;
  }
}

/**
 * 산책 중 위치 갱신 — 근처 이성 산책자 목록 반환. 알림은 alertsEnabled 일 때만.
 */
export async function reportNearbyWalkerPresence(
  user: UserProfile | null | undefined,
  input: NearbyWalkerHeartbeatInput
): Promise<NearbyWalkerPresenceResult | null> {
  if (Platform.OS === 'web') return null;
  if (!user?.gender) return null;

  const userId = await getWalkyUserId();
  const pushToken = input.pushToken ?? (await getExpoPushTokenOrNull());
  const alertsEnabled = user.nearbyWalkerAlerts !== false;

  const result = await postPresence({
    action: 'heartbeat',
    userId,
    lat: input.latitude,
    lng: input.longitude,
    gender: input.gender,
    pushToken,
    dogName: input.dogName,
    nickname: input.nickname ?? user.nickname,
    profilePhotoUrl: user.profilePhotoUrl,
    alertsEnabled,
    radiusM: NEARBY_WALKER_RADIUS_M,
  });

  if (result?.notifySelf && alertsEnabled) {
    await presentNearbyWalkerBarkNotification(input.dogName);
  }

  return result;
}

/** @deprecated reportNearbyWalkerPresence 사용 */
export const reportNearbyWalkerHeartbeat = reportNearbyWalkerPresence;

export async function reportNearbyWalkerLeave(): Promise<void> {
  if (Platform.OS === 'web') return;

  const userId = await getWalkyUserId();
  await postPresence({ action: 'leave', userId });
}
