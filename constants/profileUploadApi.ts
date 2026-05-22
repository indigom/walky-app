/** 가비아 HTTPS 직접 업로드 (SFTP/Railway 우회). server/deploy/README-PROFILE-STORAGE.md */
export const PROFILE_UPLOAD_URL =
  process.env.EXPO_PUBLIC_PROFILE_UPLOAD_URL?.trim() || '';

export const PROFILE_UPLOAD_KEY =
  process.env.EXPO_PUBLIC_PROFILE_UPLOAD_KEY?.trim() || '';
