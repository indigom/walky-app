import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { UserProfile } from '../types';
import { hasWalkHabitProfile } from './walkHabitProfile';
import {
  configureLocalNotificationHandler,
  ensureAndroidDefaultChannel,
  getDogDisplayName,
  NOTIFICATION_BARK_SOUND,
  requestNotificationPermissionAsync,
} from './localNotifications';

const ANDROID_CHANNEL_ID = 'walky-default';
export const DAILY_WALK_REMINDER_ID = 'daily-walk-reminder';

const REMINDER_BODY = '오늘 산책 안 나가?';

export async function cancelDailyWalkReminder(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_WALK_REMINDER_ID);
  } catch {
    // noop
  }
}

/**
 * 매일 설정한 시각에 산책 알림 (로컬).
 * 프로필·시간 변경 시 기존 예약을 취소한 뒤 다시 호출하세요.
 */
export async function syncDailyWalkReminderFromProfile(
  dogDisplayName: string,
  user: UserProfile | null | undefined
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelDailyWalkReminder();

  if (!hasWalkHabitProfile(user)) return;

  const ok = await requestNotificationPermissionAsync();
  if (!ok) return;

  configureLocalNotificationHandler();
  await ensureAndroidDefaultChannel();

  const hour = user!.usualWalkHour!;
  const minute = user!.usualWalkMinute!;
  const title = getDogDisplayName(dogDisplayName);

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_WALK_REMINDER_ID,
    content: {
      title,
      body: REMINDER_BODY,
      sound: NOTIFICATION_BARK_SOUND,
      data: { kind: 'daily_walk_reminder' },
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
