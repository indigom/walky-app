import { Platform } from 'react-native';

/** Android APK: 이중 VideoView·베이스 숨김 시 ExoPlayer surface가 끊김 */
export const ANDROID_SIMPLE_VIDEO = Platform.OS === 'android';

export const VIDEO_SURFACE_TYPE =
  Platform.OS === 'android' ? ('textureView' as const) : undefined;
