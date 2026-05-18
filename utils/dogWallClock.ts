import type { DogState } from '../types';

import { energyGainForElapsedMs } from './energyStat';
import {
  ENABLE_DOG_CONDITIONAL_LOCAL_NOTIFICATIONS,
  presentDogLocalNotification,
} from './localNotifications';

/** 홈 화면 interval 과 동일 (30초 틱: 배고픔 +1, 무드 −0.5 / 에너지는 경과 시간 비례) */
export const DOG_STAT_TICK_INTERVAL_MS = 30000;

/** 과거 날짜 수정 등으로 비정상적으로 긴 공백 방지 (30일) */
const MAX_CATCH_UP_MS = 30 * 24 * 60 * 60 * 1000;

const MS_8H = 8 * 60 * 60 * 1000;
const MS_24H = 24 * 60 * 60 * 1000;

function clampStat(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function petName(state: DogState): string {
  return state.name?.trim() ?? '';
}

/**
 * 마지막으로 시뮬레이션 시각(`lastStatsTickAt`)から `toIso` 까지 실제 경과에 맞춰 스탯을 반영.
 */
export function advanceDogStateForElapsedWallTime(
  prev: DogState,
  fromIso: string,
  toIso: string
): DogState {
  const toMs = new Date(toIso).getTime();
  const fromMs = new Date(fromIso).getTime();
  const elapsed = Math.min(
    MAX_CATCH_UP_MS,
    Math.max(0, toMs - fromMs)
  );
  const ticks = Math.floor(elapsed / DOG_STAT_TICK_INTERVAL_MS);

  let hunger = prev.hunger;
  let energy = prev.energy;
  let mood = prev.mood;
  let hungerReachedMaxAt = prev.hungerReachedMaxAt;
  let energyReachedMaxAt = prev.energyReachedMaxAt;

  const baseMs = fromMs;
  const energyBefore = energy;

  for (let i = 0; i < ticks; i++) {
    const stepEndMs = baseMs + (i + 1) * DOG_STAT_TICK_INTERVAL_MS;

    hunger = clampStat(hunger + 1);
    mood = clampStat(mood - 0.5);

    if (hunger >= 100) {
      if (!hungerReachedMaxAt) {
        hungerReachedMaxAt = new Date(stepEndMs).toISOString();
      }
    } else {
      hungerReachedMaxAt = null;
    }
  }

  energy = clampStat(energy + energyGainForElapsedMs(elapsed));
  if (energyBefore < 100 && energy >= 100 && !energyReachedMaxAt) {
    energyReachedMaxAt = toIso;
  } else if (energy < 100) {
    energyReachedMaxAt = null;
  }

  return {
    ...prev,
    hunger,
    energy,
    mood,
    hungerReachedMaxAt,
    energyReachedMaxAt,
    lastStatsTickAt: toIso,
  };
}

/**
 * 이전 스냅샷 대비 임계값을 넘었을 때 로컬 알림. 8h/24h는 동일 조건에서 앱 재실행 시 한 번만 재알림되도록 상태에 래치.
 */
export function reconcileDogStatLocalNotifications(
  before: DogState,
  after: DogState,
  nowMs: number
): DogState {
  if (!ENABLE_DOG_CONDITIONAL_LOCAL_NOTIFICATIONS) return after;

  const name = petName(after);
  let next = after;

  if (before.hunger < 80 && next.hunger >= 80) {
    void presentDogLocalNotification({
      dogDisplayName: name,
      body: '배가 고파요',
      kind: 'hunger_reached_80',
    });
  }

  if (before.hunger < 100 && next.hunger >= 100) {
    void presentDogLocalNotification({
      dogDisplayName: name,
      body: '진짜 배고파요. 밥 좀 주세요 ㅜㅜ',
      kind: 'hunger_reached_100',
    });
  }

  if (before.energy < 100 && next.energy >= 100) {
    void presentDogLocalNotification({
      dogDisplayName: name,
      body: '나 응가 쉬마려워요',
      kind: 'energy_reached_100',
    });
  }

  const fedAt = next.lastFedAt ?? null;
  if (
    fedAt &&
    (next.notifFed8hForLastFedAt ?? null) !== fedAt &&
    nowMs - new Date(fedAt).getTime() >= MS_8H
  ) {
    next = { ...next, notifFed8hForLastFedAt: fedAt };
    void presentDogLocalNotification({
      dogDisplayName: name,
      body: '인간아 밥 좀 줘라 ㅜㅜ',
      kind: 'fed_over_8h',
    });
  }

  const walkEndedAt = next.lastWalkAt ?? null;
  if (
    walkEndedAt &&
    (next.notifWalk24hForLastWalkAt ?? null) !== walkEndedAt &&
    nowMs - new Date(walkEndedAt).getTime() >= MS_24H
  ) {
    next = { ...next, notifWalk24hForLastWalkAt: walkEndedAt };
    void presentDogLocalNotification({
      dogDisplayName: name,
      body: '나 소파에다 똥산다!!',
      kind: 'walk_over_24h',
    });
  }

  return next;
}

/** 앱 시작·포그라운드·주기 틱 공통: 경과 시뮬 후 알림 정리 */
export function applyDogWallClockAndNotify(prev: DogState, nowIso: string): DogState {
  const fromIso = prev.lastStatsTickAt ?? nowIso;
  const advanced = advanceDogStateForElapsedWallTime(prev, fromIso, nowIso);
  return reconcileDogStatLocalNotifications(prev, advanced, Date.now());
}
