export type Breed = 'corgi' | 'shiba' | 'retriever';

/** 서버 `manifest.json`의 `videos` 키와 동일하게 유지 */
export type DogVideoState =
  | 'idle'
  | 'empty'
  | 'happy'
  | 'eat'
  | 'look'
  | 'walk'
  | 'sleep'
  | 'walkWantMedium'
  | 'walkWantStrong'
  | 'walkWantCritical'
  | 'walkIgnored3Days'
  | 'hungryMedium'
  | 'hungryStrong'
  | 'hungryCritical'
  | 'hungryIgnored3Days'
  | 'neglected3Days';

export type DogAction =
  | 'eat'
  | 'pet'
  | 'nameCall'
  | 'emptyWake'
  | 'idleLook'
  | null;

export type DogReaction = 'idle' | 'hungry' | 'wants_walk';

export type UserProfile = {
  nickname?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  gender?: 'male' | 'female';
  /** 보통 산책하는 시각 (로컬, 0–23 / 0–59) */
  usualWalkHour?: number;
  usualWalkMinute?: number;
  /** 목표 산책 거리 (km) */
  targetWalkDistanceKm?: number;
  /** 산책 중 근처 이성 walky 유저 알림 (기본 true) */
  nearbyWalkerAlerts?: boolean;
};

export type DogState = {
  breed: Breed | null;
  name: string;
  user: UserProfile | null;

  mood: number;
  hunger: number;
  affection: number;
  /** 높을수록 산책·활동 욕구(24h +100, 5km 산책 −100). 낮을수록 차분·휴식 */
  energy: number;

  lastFedAt?: string | null;
  lastWalkAt: string | null;
  lastInteractionAt?: string | null;

  hungerReachedMaxAt: string | null;
  /** energy가 100에 도달한 시각(알림·대사용) */
  energyReachedMaxAt: string | null;

  lastOpenedAt?: string | null;
  /** 앱이 background/inactive 로 들어간 시각(ISO) */
  lastBackgroundAt?: string | null;
  /** 30분+ 백그라운드 후 복귀 시 홈 빈 방(empty) 고정 — 상호작용 시 해제 */
  homeForceEmptyRoom?: boolean;
  /** 배고픔·산책욕 틱을 마지막으로 적용한 시각(ISO). 앱 종료 중 경과 시간은 이 값 기준으로 일괄 반영 */
  lastStatsTickAt?: string | null;
  /** 8시간 미급식 알림을 보낸 `lastFedAt` 값 — 재실행 시 같은 구간 반복 알림 방지 */
  notifFed8hForLastFedAt?: string | null;
  /** 24시간 미산책 알림을 보낸 `lastWalkAt` 값 */
  notifWalk24hForLastWalkAt?: string | null;
};

export type DogAssetManifest = {
  breed: Breed;
  version: number;
  videos: Partial<Record<DogVideoState, string[]>>;
};

export type WalkSummary = {
  durationSeconds: number;
  distanceKm: number;
  steps: number;
  calories: number;
};

export type WalkRecord = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceKm: number;
  steps: number;
  calories: number;
};

export type RewardProgress = Record<string, number>;
