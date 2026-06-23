import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  configureLocalNotificationHandler,
  ensureAndroidDefaultChannel,
  getDogDisplayName,
  NOTIFICATION_BARK_SOUND,
  requestNotificationPermissionAsync,
} from './localNotifications';

const ANDROID_CHANNEL_ID = 'walky-default';

export const WALK_BG_REMINDER_ID = 'walk-session-bg-reminder';
export const WALK_IDLE_REMINDER_ID = 'walk-session-idle-reminder';

/** B: 백그라운드 진입 후 리마인더 (초) */
export const WALK_BG_REMINDER_DELAY_SEC = 4 * 60;

/** D: 움직임 없음 리마인더 (초) */
export const WALK_IDLE_REMINDER_DELAY_SEC = 30 * 60;

/** C: 복귀 확인 모달 최소 산책 경과 (초) */
export const WALK_RESUME_PROMPT_MIN_ELAPSED_SEC = 10 * 60;

const BG_REMINDER_BODY =
  "산책이 아직 진행 중이에요. 끝났다면 앱에서 '산책 종료'를 눌러 주세요.";

const IDLE_REMINDER_BODY =
  '한동안 움직임이 없어요. 산책을 마쳤다면 앱에서 종료해 주세요.';

async function cancelScheduled(id: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // noop
  }
}

export async function cancelWalkBackgroundReminder(): Promise<void> {
  await cancelScheduled(WALK_BG_REMINDER_ID);
}

export async function cancelWalkIdleReminder(): Promise<void> {
  await cancelScheduled(WALK_IDLE_REMINDER_ID);
}

export async function cancelWalkSessionNotifications(): Promise<void> {
  await Promise.all([
    cancelWalkBackgroundReminder(),
    cancelWalkIdleReminder(),
  ]);
}

async function ensureWalkNotificationReady(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  configureLocalNotificationHandler();
  await ensureAndroidDefaultChannel();
  return requestNotificationPermissionAsync();
}

export async function scheduleWalkBackgroundReminder(
  dogDisplayName: string
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelWalkBackgroundReminder();

  const ok = await ensureWalkNotificationReady();
  if (!ok) return;

  const title = getDogDisplayName(dogDisplayName);

  await Notifications.scheduleNotificationAsync({
    identifier: WALK_BG_REMINDER_ID,
    content: {
      title,
      body: BG_REMINDER_BODY,
      sound: NOTIFICATION_BARK_SOUND,
      data: { kind: 'walk_session_bg_reminder' },
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: WALK_BG_REMINDER_DELAY_SEC,
      repeats: false,
    },
  });
}

/** 마지막 움직임 시각부터 D 지연 후 1회 알림 예약 */
export async function scheduleWalkIdleReminder(
  dogDisplayName: string
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelWalkIdleReminder();

  const ok = await ensureWalkNotificationReady();
  if (!ok) return;

  const title = getDogDisplayName(dogDisplayName);

  await Notifications.scheduleNotificationAsync({
    identifier: WALK_IDLE_REMINDER_ID,
    content: {
      title,
      body: IDLE_REMINDER_BODY,
      sound: NOTIFICATION_BARK_SOUND,
      data: { kind: 'walk_session_idle_reminder' },
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: WALK_IDLE_REMINDER_DELAY_SEC,
      repeats: false,
    },
  });
}
