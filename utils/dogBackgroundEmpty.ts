import type { DogState } from '../types';

/** 이 시간 이상 백그라운드(또는 비활성)였다가 돌아오면 홈 빈 방(empty)으로 전환 */
export const BACKGROUND_EMPTY_THRESHOLD_MS = 30 * 60 * 1000;

export function msInBackgroundSince(
  lastBackgroundAt: string | null | undefined,
  nowIso: string
): number | null {
  if (!lastBackgroundAt) return null;
  const bgMs = new Date(lastBackgroundAt).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (Number.isNaN(bgMs) || Number.isNaN(nowMs)) return null;
  return Math.max(0, nowMs - bgMs);
}

export function shouldForceEmptyRoomAfterBackground(
  lastBackgroundAt: string | null | undefined,
  nowIso: string
): boolean {
  const ms = msInBackgroundSince(lastBackgroundAt, nowIso);
  if (ms === null) return false;
  return ms >= BACKGROUND_EMPTY_THRESHOLD_MS;
}

export function markAppEnteredBackground(
  prev: DogState,
  nowIso: string
): DogState {
  return { ...prev, lastBackgroundAt: nowIso };
}

export function applyForegroundAfterBackground(
  prev: DogState,
  nowIso: string
): DogState {
  const forceEmpty = shouldForceEmptyRoomAfterBackground(
    prev.lastBackgroundAt,
    nowIso
  );

  return {
    ...prev,
    lastBackgroundAt: null,
    ...(forceEmpty ? { homeForceEmptyRoom: true } : {}),
  };
}

/** 저장된 상태 로드 직후(앱이 백그라운드에서 종료된 경우) */
export function applyStoredBackgroundEmptyOnLaunch(
  prev: DogState,
  nowIso: string
): DogState {
  if (!prev.lastBackgroundAt) return prev;

  const forceEmpty = shouldForceEmptyRoomAfterBackground(
    prev.lastBackgroundAt,
    nowIso
  );

  return {
    ...prev,
    lastBackgroundAt: null,
    ...(forceEmpty ? { homeForceEmptyRoom: true } : {}),
  };
}
