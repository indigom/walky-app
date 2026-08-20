import { Platform } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';

let initPromise: Promise<void> | null = null;

export function initAdMob(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }

  if (!initPromise) {
    initPromise = mobileAds()
      .initialize()
      .then(() => undefined)
      .catch((error: unknown) => {
        initPromise = null;
        console.log(
          '[AdMob] initialize failed:',
          error instanceof Error ? error.message : String(error)
        );
      });
  }

  return initPromise;
}
