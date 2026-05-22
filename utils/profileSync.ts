import { Platform } from 'react-native';

import { PROFILE_API_URL } from '../constants/profileApi';
import type { UserProfile } from '../types';
import { getWalkyUserId } from './walkyUserId';

export type ProfileSyncResult = {
  nickname?: string;
  profilePhotoUrl?: string;
  updatedAt?: number;
};

/**
 * 닉네임·로컬 사진을 Railway → 가비아 SFTP로 업로드.
 * 사진 없이 닉네임만 보낼 수 있음.
 */
export async function syncUserProfileToServer(input: {
  nickname?: string;
  localPhotoUri?: string | null;
  skipped?: boolean;
}): Promise<ProfileSyncResult | null> {
  if (Platform.OS === 'web') return null;
  if (!PROFILE_API_URL) return null;

  const userId = await getWalkyUserId();
  const form = new FormData();
  form.append('userId', userId);

  const nick = input.nickname?.trim();
  if (nick) {
    form.append('nickname', nick);
  }

  if (!input.skipped && input.localPhotoUri?.trim()) {
    form.append('photo', {
      uri: input.localPhotoUri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  try {
    const res = await fetch(PROFILE_API_URL, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      console.warn('profile sync failed', res.status);
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (data.ok !== true) return null;

    return {
      nickname:
        typeof data.nickname === 'string' ? data.nickname : undefined,
      profilePhotoUrl:
        typeof data.profilePhotoUrl === 'string'
          ? data.profilePhotoUrl
          : undefined,
      updatedAt:
        typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
    };
  } catch (e) {
    console.warn('profile sync error', e);
    return null;
  }
}

export function mergeProfileSyncIntoUser(
  user: UserProfile | null | undefined,
  synced: ProfileSyncResult | null
): UserProfile {
  const base = { ...(user ?? {}) };
  if (!synced) return base;
  if (synced.nickname !== undefined) {
    base.nickname = synced.nickname;
  }
  if (synced.profilePhotoUrl) {
    base.profilePhotoUrl = synced.profilePhotoUrl;
    base.profilePhotoSkipped = false;
    base.profilePhotoSetupDone = true;
  }
  return base;
}
