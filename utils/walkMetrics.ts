/** 위도·경도 두 점 사이 거리(m), WGS84 근사 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 키(cm)가 있으면 보폭 추정, 없으면 보수적 기본값(m) */
export function estimateStrideMeters(heightCm?: number): number {
  if (typeof heightCm === 'number' && heightCm > 80 && heightCm < 250) {
    return heightCm * 0.414 * 0.01;
  }
  return 0.72;
}

export function estimateDistanceKmFromSteps(
  steps: number,
  strideMeters: number
): number {
  if (steps <= 0 || strideMeters <= 0) return 0;
  return (steps * strideMeters) / 1000;
}

/** GPS 누적 거리를 신뢰하는 최소값(m) — WalkScreen과 동일 */
export const GPS_MIN_TRUST_M = 18;

/** 산책 인정 시 걸음 1보당 최소 이동 거리(m) — 이보다 적으면 기록하지 않음 */
export const WALK_METERS_PER_STEP_EVIDENCE = 0.3;

/** 인정 산책 최소 이동 거리(m) */
export const MIN_COUNTED_WALK_DISTANCE_M = 30;

export function evidenceDistanceKmFromSteps(steps: number): number {
  if (steps <= 0) return 0;
  return (steps * WALK_METERS_PER_STEP_EVIDENCE) / 1000;
}

export type RawWalkDistanceInput = {
  durationSeconds: number;
  gpsDistanceKm: number;
  gpsActive: boolean;
  pedometerActive: boolean;
  steps: number;
  strideMeters: number;
  /** 웹·시뮬레이션만 시간 기반 거리 허용 */
  allowTimeEstimate: boolean;
};

/** GPS → 걸음(보폭) 순. 시간 추정은 시뮬레이션에서만. */
export function computeRawWalkDistanceKm(input: RawWalkDistanceInput): number {
  const stepKm = estimateDistanceKmFromSteps(input.steps, input.strideMeters);

  const trustGps =
    input.gpsActive && input.gpsDistanceKm * 1000 >= GPS_MIN_TRUST_M;

  if (trustGps) return input.gpsDistanceKm;

  if (input.steps > 0) return stepKm;

  if (input.allowTimeEstimate && input.durationSeconds > 0) {
    const averageWalkingSpeedKmh = 4.5;
    return (input.durationSeconds / 3600) * averageWalkingSpeedKmh;
  }

  return 0;
}

export type ResolvedWalkOutcome = {
  counted: boolean;
  distanceKm: number;
  steps: number;
};

/**
 * 걸음 수가 거리(최대 0.3m/보)를 뒷받침할 때만 산책으로 인정.
 * 인정 거리 = min(측정 거리, 걸음×0.3m).
 */
export function resolveWalkOutcome(
  steps: number,
  rawDistanceKm: number
): ResolvedWalkOutcome {
  const roundedSteps = Math.max(0, Math.round(steps));
  const claimedM = Math.max(0, rawDistanceKm) * 1000;

  if (roundedSteps <= 0 || claimedM < MIN_COUNTED_WALK_DISTANCE_M) {
    return { counted: false, distanceKm: 0, steps: roundedSteps };
  }

  const minSteps = Math.ceil(claimedM / WALK_METERS_PER_STEP_EVIDENCE);
  if (roundedSteps < minSteps) {
    return { counted: false, distanceKm: 0, steps: roundedSteps };
  }

  const capKm = evidenceDistanceKmFromSteps(roundedSteps);
  const distanceKm = Math.min(rawDistanceKm, capKm);

  if (distanceKm * 1000 < MIN_COUNTED_WALK_DISTANCE_M) {
    return { counted: false, distanceKm: 0, steps: roundedSteps };
  }

  return { counted: true, distanceKm, steps: roundedSteps };
}
