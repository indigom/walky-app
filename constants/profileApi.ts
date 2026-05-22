import { NEARBY_WALKER_API_URL } from './nearbyWalkerApi';

function profileApiFromNearbyUrl(nearbyUrl: string): string {
  if (nearbyUrl.includes('/api/nearby/presence')) {
    return nearbyUrl.replace(/\/api\/nearby\/presence\/?$/, '/api/profile');
  }
  return nearbyUrl.replace(/\/+$/, '') + '/api/profile';
}

/** POST multipart — 닉네임·프로필 사진 (가비아 SFTP) */
export const PROFILE_API_URL =
  process.env.EXPO_PUBLIC_PROFILE_API_URL?.trim() ||
  (NEARBY_WALKER_API_URL
    ? profileApiFromNearbyUrl(NEARBY_WALKER_API_URL)
    : '');
