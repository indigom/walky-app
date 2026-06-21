import type { WalkRecord } from '../types';

/** 건강 지수 계산에 쓰는 최근 일수 */
export const HEALTH_INDEX_LOOKBACK_DAYS = 7;

/** 목표 거리 미설정 시 하루 기준 (km) */
export const DEFAULT_DAILY_WALK_TARGET_KM = 3;

export type UserHealthIndex = {
  score: number;
  label: string;
  detail: string;
  lookbackDays: number;
  activeDays: number;
  totalWalkCount: number;
  totalDistanceKm: number;
  targetKmPerDay: number;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function resolveTargetKm(targetWalkDistanceKm?: number | null): number {
  if (
    typeof targetWalkDistanceKm === 'number' &&
    Number.isFinite(targetWalkDistanceKm) &&
    targetWalkDistanceKm > 0
  ) {
    return targetWalkDistanceKm;
  }
  return DEFAULT_DAILY_WALK_TARGET_KM;
}

function labelForScore(score: number): string {
  if (score >= 80) return '매우 좋음';
  if (score >= 60) return '좋음';
  if (score >= 40) return '보통';
  if (score >= 20) return '조금 부족';
  return '산책이 필요해요';
}

type DayAggregate = {
  walkCount: number;
  distanceKm: number;
};

function aggregateByDate(records: WalkRecord[]): Map<string, DayAggregate> {
  const map = new Map<string, DayAggregate>();

  for (const record of records) {
    const hit = map.get(record.date) ?? { walkCount: 0, distanceKm: 0 };
    hit.walkCount += 1;
    hit.distanceKm += record.distanceKm;
    map.set(record.date, hit);
  }

  return map;
}

function lastNDayKeys(days: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

/**
 * 최근 산책 거리·횟수·목표 달성일을 반영한 사용자 건강 지수 (0–100).
 * - 거리: 일별 목표 대비 달성률 평균 (45%)
 * - 빈도: 산책한 날 비율 (35%)
 * - 오늘: 오늘 목표 대비 (20%)
 */
export function computeUserHealthIndex(
  records: WalkRecord[],
  targetWalkDistanceKm?: number | null,
  now = new Date()
): UserHealthIndex {
  const lookbackDays = HEALTH_INDEX_LOOKBACK_DAYS;
  const targetKm = resolveTargetKm(targetWalkDistanceKm);
  const dayKeys = lastNDayKeys(lookbackDays, now);
  const byDate = aggregateByDate(records);

  let distanceRatioSum = 0;
  let activeDays = 0;
  let totalWalkCount = 0;
  let totalDistanceKm = 0;

  for (const key of dayKeys) {
    const day = byDate.get(key) ?? { walkCount: 0, distanceKm: 0 };
    distanceRatioSum += Math.min(1, day.distanceKm / targetKm);
    if (day.walkCount > 0) activeDays += 1;
    totalWalkCount += day.walkCount;
    totalDistanceKm += day.distanceKm;
  }

  const todayKey = dayKeys[dayKeys.length - 1]!;
  const today = byDate.get(todayKey) ?? { walkCount: 0, distanceKm: 0 };

  const distanceScore = (distanceRatioSum / lookbackDays) * 100;
  const frequencyScore = (activeDays / lookbackDays) * 100;
  const todayScore = Math.min(100, (today.distanceKm / targetKm) * 100);

  const score = clampScore(
    distanceScore * 0.45 + frequencyScore * 0.35 + todayScore * 0.2
  );

  const distanceText = totalDistanceKm.toFixed(1);
  const detail = `최근 ${lookbackDays}일 · ${distanceText}km · ${totalWalkCount}회`;

  return {
    score,
    label: labelForScore(score),
    detail,
    lookbackDays,
    activeDays,
    totalWalkCount,
    totalDistanceKm,
    targetKmPerDay: targetKm,
  };
}

export function healthIndexAccentColor(score: number): string {
  if (score >= 80) return '#86EFAC';
  if (score >= 60) return '#FDE047';
  if (score >= 40) return '#FDBA74';
  return '#FCA5A5';
}
