import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'walky-default';

/** `expo-notifications` plugin `sounds`에 등록한 파일명과 동일해야 함 */
export const NOTIFICATION_BARK_SOUND = 'dog_bark.wav';

/** 푸시 서버 붙이기 전, 로컬 알림만 시험할 때 사용 */
let handlerConfigured = false;

/**
 * 포그라운드에서도 알림 배너가 보이도록 (테스트용)
 */
export function configureLocalNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureAndroidDefaultChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Walky',
    importance: Notifications.AndroidImportance.HIGH,
    sound: NOTIFICATION_BARK_SOUND,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function requestNotificationPermissionAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** N초 뒤 한 번 뜨는 테스트 알림 (스토어 빌드에서는 끄기) */
export async function scheduleTestLocalNotification(
  delaySeconds: number
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  await ensureAndroidDefaultChannel();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Walky',
      body: '로컬 알림 테스트입니다. 나중에 배고픔·산책도 같은 방식으로 예약할 수 있어요.',
      sound: NOTIFICATION_BARK_SOUND,
      data: { kind: 'test_local' },
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.floor(delaySeconds)),
      repeats: false,
    },
  });

  return id;
}

/**
 * `true`: 홈 등에서 조건 만족 시 로컬 알림 (개발·기기 확인용). 출시 전 `false` 권장.
 */
export const ENABLE_DOG_CONDITIONAL_LOCAL_NOTIFICATIONS = __DEV__;

/**
 * `true`: 앱 준비 후 아래 초 뒤 테스트 알림 1회 예약  
 * 출시 빌드 전 `false` 로 바꾸세요.
 */
export const ENABLE_TEST_LOCAL_NOTIFICATION_ON_LAUNCH = __DEV__;

export const TEST_LOCAL_NOTIFICATION_DELAY_SEC = 12;

/**
 * 스플래시 끝난 뒤 1회 호출 권장.
 */
export async function setupLocalNotificationsForTestingLaunch() {
  if (Platform.OS === 'web') return;

  configureLocalNotificationHandler();

  if (!ENABLE_TEST_LOCAL_NOTIFICATION_ON_LAUNCH) return;

  const ok = await requestNotificationPermissionAsync();
  if (!ok) return;

  await scheduleTestLocalNotification(TEST_LOCAL_NOTIFICATION_DELAY_SEC);
}

export function getDogDisplayName(dogDisplayName: string): string {
  return typeof dogDisplayName === 'string' && dogDisplayName.trim().length > 0
    ? dogDisplayName.trim()
    : '강아지';
}

/**
 * 짖는 소리 포함 즉시 로컬 알림 (개발 플래그 무관 — 근처 산책자 등).
 */
export async function presentImmediateBarkNotification(options: {
  dogDisplayName: string;
  body: string;
  kind: string;
}): Promise<void> {
  if (Platform.OS === 'web') return;

  configureLocalNotificationHandler();
  await ensureAndroidDefaultChannel();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const title = getDogDisplayName(options.dogDisplayName);

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: options.body,
      sound: NOTIFICATION_BARK_SOUND,
      data: { kind: options.kind },
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
    trigger: null,
  });
}

/**
 * 제목은 강아지 이름, 본문·사운드(짖음) 포함한 즉시 로컬 알림.
 */
export async function presentDogLocalNotification(options: {
  dogDisplayName: string;
  body: string;
  kind: string;
}): Promise<void> {
  if (!ENABLE_DOG_CONDITIONAL_LOCAL_NOTIFICATIONS) return;
  await presentImmediateBarkNotification(options);
}
