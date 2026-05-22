import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { PROFILE_API_URL } from '../constants/profileApi';
import type { UserProfile } from '../types';
import { getWalkyUserId } from './walkyUserId';

export type ProfileSyncResult = {
  nickname?: string;
  profilePhotoUrl?: string;
  updatedAt?: number;
};

export type ProfileSyncOutcome =
  | { ok: true; data: ProfileSyncResult }
  | { ok: false; message: string };

function parseProfileResponse(body: string): ProfileSyncResult | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
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
  } catch {
    return null;
  }
}

/** RN FormData용 로컬 파일 URI */
function normalizeUploadUri(uri: string): string {
  const trimmed = uri.trim();
  if (Platform.OS === 'ios' && trimmed.startsWith('file://')) {
    return trimmed;
  }
  if (Platform.OS === 'android' && !trimmed.startsWith('file://')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

async function syncNicknameOnly(
  userId: string,
  nickname?: string
): Promise<ProfileSyncOutcome> {
  const form = new FormData();
  form.append('userId', userId);
  if (nickname) {
    form.append('nickname', nickname);
  }

  const res = await fetch(PROFILE_API_URL, {
    method: 'POST',
    body: form,
  });

  const body = await res.text();
  if (!res.ok) {
    console.warn('profile sync failed', res.status, body);
    return { ok: false, message: body || `HTTP ${res.status}` };
  }

  const data = parseProfileResponse(body);
  if (!data) return { ok: false, message: 'Invalid server response' };
  return { ok: true, data };
}

async function syncWithPhoto(
  userId: string,
  localPhotoUri: string,
  nickname?: string
): Promise<ProfileSyncOutcome> {
  const fileUri = normalizeUploadUri(localPhotoUri);

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    console.warn('profile sync: file missing', fileUri);
    return { ok: false, message: 'Local photo file missing' };
  }

  const parameters: Record<string, string> = { userId };
  if (nickname) {
    parameters.nickname = nickname;
  }

  const result = await FileSystem.uploadAsync(PROFILE_API_URL, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'photo',
    mimeType: 'image/jpeg',
    parameters,
  });

  if (result.status < 200 || result.status >= 300) {
    console.warn('profile sync failed', result.status, result.body);
    return {
      ok: false,
      message: result.body || `HTTP ${result.status}`,
    };
  }

  const data = parseProfileResponse(result.body);
  if (!data) return { ok: false, message: 'Invalid server response' };
  return { ok: true, data };
}

/**
 * 닉네임·로컬 사진을 Railway → 가비아 SFTP로 업로드.
 */
export async function syncUserProfileToServer(input: {
  nickname?: string;
  localPhotoUri?: string | null;
  skipped?: boolean;
}): Promise<ProfileSyncOutcome> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Web not supported' };
  }
  if (!PROFILE_API_URL) {
    console.warn('profile sync: EXPO_PUBLIC_PROFILE_API_URL not set');
    return { ok: false, message: 'PROFILE_API_URL not configured' };
  }

  const userId = await getWalkyUserId();
  const nick = input.nickname?.trim();

  try {
    if (!input.skipped && input.localPhotoUri?.trim()) {
      return await syncWithPhoto(userId, input.localPhotoUri, nick);
    }
    return await syncNicknameOnly(userId, nick);
  } catch (e) {
    console.warn('profile sync error', PROFILE_API_URL, e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Network request failed',
    };
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
