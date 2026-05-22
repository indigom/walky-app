import type { UserProfile } from '../types';
import { profilePhotoFileExists } from './profilePhotoStorage';

/** 온보딩에서 프로필 사진 단계를 완료했는지 (등록 또는 건너뛰기) */
export function hasProfilePhotoSetup(
  user: UserProfile | null | undefined
): boolean {
  if (!user) return false;
  return user.profilePhotoSetupDone === true;
}

export async function resolveProfilePhotoUri(
  user: UserProfile | null | undefined
): Promise<string | null> {
  if (user?.profilePhotoSkipped) return null;

  const remote = user?.profilePhotoUrl?.trim();
  if (remote && /^https:\/\//i.test(remote)) {
    return remote;
  }

  const uri = user?.profilePhotoUri?.trim();
  if (!uri) return null;
  return (await profilePhotoFileExists(uri)) ? uri : null;
}
