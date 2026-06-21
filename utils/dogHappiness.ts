/** 홈 상태 아이콘용 — mood(행복)와 affection(애정)을 0–100 하나로 표시 */
export function getCombinedDogHappiness(
  mood: number,
  affection: number
): number {
  return Math.max(0, Math.min(100, Math.round((mood + affection) / 2)));
}
