import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
} from 'expo-file-system/legacy';

const PROFILE_PHOTO_FILENAME = 'walky-profile-photo.jpg';

export function getProfilePhotoDestinationUri(): string {
  const base = documentDirectory;
  if (!base) {
    throw new Error('documentDirectory unavailable');
  }
  return `${base}${PROFILE_PHOTO_FILENAME}`;
}

/** 갤러리·카메라 URI를 앱 문서 폴더에 복사해 영구 경로로 반환 */
export async function persistProfilePhoto(sourceUri: string): Promise<string> {
  const dest = getProfilePhotoDestinationUri();
  const info = await getInfoAsync(dest);
  if (info.exists) {
    await deleteAsync(dest, { idempotent: true });
  }
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function profilePhotoFileExists(
  uri: string | null | undefined
): Promise<boolean> {
  if (!uri?.trim()) return false;
  try {
    const info = await getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}
