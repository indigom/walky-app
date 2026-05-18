/** 24시간 무산책 시 에너지 +100 → 5km 산책 시 −100 균형 */
export const ENERGY_GAIN_PER_24H = 100;
export const ENERGY_DROP_AT_5KM = 100;
export const MS_PER_24H = 24 * 60 * 60 * 1000;

export function energyGainForElapsedMs(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (elapsedMs / MS_PER_24H) * ENERGY_GAIN_PER_24H;
}

/** 산책 거리(km)에 비례 — 5km면 100 감소 */
export function energyDropForWalkKm(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return (distanceKm / 5) * ENERGY_DROP_AT_5KM;
}
