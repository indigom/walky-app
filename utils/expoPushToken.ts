import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { requestNotificationPermissionAsync } from './localNotifications';

export async function getExpoPushTokenOrNull(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const ok = await requestNotificationPermissionAsync();
  if (!ok) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}
