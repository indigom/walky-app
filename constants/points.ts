/** 신규 계정 기본 지급 포인트 */
export const INITIAL_POINTS = 500;

/** 산책 1km당 적립 포인트 */
export const POINTS_PER_WALK_KM = 100;

/** 사료 1회 급여에 소모되는 포인트 */
export const FEED_POINT_COST = 200;

/** 포인트 부족 안내 메시지 */
export const INSUFFICIENT_POINTS_MESSAGE = '포인트가 부족합니다. 산책 좀 하시죠?';

/** 산책 거리에 따라 적립할 포인트 계산 (소수점 버림) */
export function pointsEarnedForWalk(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.floor(distanceKm * POINTS_PER_WALK_KM);
}
