import type { Breed, DogAction, DogAssetManifest, DogState, DogVideoState } from '../types';
import { getLocalVideoPath } from './BreedAssetManager';
import { pickRandomVideo } from './assetManifest';

const DAY_MS = 24 * 60 * 60 * 1000;
const THREE_DAY_MS = 3 * DAY_MS;

const IDLE_POOL = ['idle01.mp4', 'idle02.mp4', 'idle03.mp4'] as const;
const HAPPY_POOL = ['happy01.mp4', 'happy02.mp4', 'happy03.mp4'] as const;

/** 품종별 앱 세션당 idle 1회 고정 랜덤 */
const sessionIdleFileByBreed = new Map<Breed, string>();

const FALLBACK_CLIP: Record<
  Exclude<DogVideoState, 'idle' | 'happy' | 'sleep'>,
  string
> = {
  eat: 'eat01.mp4',
  empty: 'empty01.mp4',
  look: 'look01.mp4',
  walk: 'walk01-v2.mp4',
  walkWantMedium: 'walkwantmedium01.mp4',
  walkWantStrong: 'walkwantstrong01.mp4',
  walkWantCritical: 'walkwantcritical01.mp4',
  walkIgnored3Days: 'walkignored01.mp4',
  hungryMedium: 'hungrymedium01.mp4',
  hungryStrong: 'hungrystrong01.mp4',
  hungryCritical: 'hungrycritical01.mp4',
  hungryIgnored3Days: 'hungryignored01.mp4',
  neglected3Days: 'neglected01.mp4',
};

const SLEEP_CLIP = 'sleep01.mp4';

function ambientLoopStates(state: DogVideoState): boolean {
  switch (state) {
    case 'idle':
    case 'empty':
    case 'walkWantMedium':
    case 'hungryMedium':
    case 'sleep':
      return true;
    default:
      return false;
  }
}

export type ResolvedPlayback = {
  path: string | null;
  loop: boolean;
};

type ResolveExtras = {
  isWalking?: boolean;
  action?: Exclude<DogAction, null>;
  /** pet일 때 선택된 happy 파일 한 번 고정 */
  petHappyFile?: string | null;
};

function msSince(iso: string | null | undefined): number | null {
  if (!iso) return null;

  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;

  return Date.now() - t;
}

/** 세션 고정 idle 파일 (manifest.idle 있으면 그 목록에서, 없으면 idle01–03 중 랜덤) */
export function peekSessionIdleFile(manifest: DogAssetManifest): string {
  const breed = manifest.breed;
  let hit = sessionIdleFileByBreed.get(breed);
  if (hit) return hit;

  const fromManifest = manifest.videos.idle ?? [];
  const pool =
    fromManifest.length >= 1 ? [...fromManifest] : [...IDLE_POOL];

  hit = pool[Math.floor(Math.random() * pool.length)] ?? IDLE_POOL[0];
  sessionIdleFileByBreed.set(breed, hit);
  return hit;
}

export function pickHappyFile(manifest: DogAssetManifest): string {
  const fromManifest = manifest.videos.happy ?? [];
  const pool =
    fromManifest.length >= 1 ? [...fromManifest] : [...HAPPY_POOL];

  return pool[Math.floor(Math.random() * pool.length)] ?? HAPPY_POOL[0];
}

function clipFileForState(
  state: DogVideoState,
  manifest: DogAssetManifest
): string | null {
  if (state === 'idle') {
    return peekSessionIdleFile(manifest);
  }

  if (state === 'sleep') {
    return pickRandomVideo(manifest, 'sleep') ?? SLEEP_CLIP;
  }

  return (
    pickRandomVideo(manifest, state) ??
    FALLBACK_CLIP[state as keyof typeof FALLBACK_CLIP] ??
    null
  );
}

/**
 * 피드/쓰다듬 외 안정 배경.
 * 우선순위: 산책욕구 트랙 → 배고픔 트랙 → 심심(방치)·휴식·idle
 */
export function resolveAmbientDogVideoState(dogState: DogState): DogVideoState {
  const sincePet = msSince(dogState.lastInteractionAt);
  const sinceWalk = msSince(dogState.lastWalkAt);
  const sinceFed = msSince(dogState.lastFedAt);

  // --- 산책욕구 (시간 패널티 → 스탯) ---
  if (sinceWalk !== null && sinceWalk >= THREE_DAY_MS) {
    return 'walkIgnored3Days';
  }

  if (sinceWalk !== null && sinceWalk >= DAY_MS) {
    return 'walkWantCritical';
  }

  if (dogState.energy >= 100) return 'walkWantStrong';
  if (dogState.energy >= 80) return 'walkWantMedium';

  // --- 배고픔 ---
  if (sinceFed !== null && sinceFed >= THREE_DAY_MS) {
    return 'hungryIgnored3Days';
  }

  if (sinceFed !== null && sinceFed >= DAY_MS) {
    return 'hungryCritical';
  }

  if (dogState.hunger >= 100) return 'hungryStrong';
  if (dogState.hunger >= 80) return 'hungryMedium';

  // --- 심심함(방치) · 그 외 ---
  if (sincePet !== null && sincePet >= THREE_DAY_MS) {
    return 'neglected3Days';
  }

  if (dogState.energy <= 20) return 'sleep';

  return 'idle';
}

/** 액션/산책까지 포함해 논리상 DogVideoState (경로 선택용) */
export function resolveDogVideoState(
  dogState: DogState,
  extras?: ResolveExtras
): DogVideoState {
  if (extras?.action === 'eat') return 'eat';
  if (extras?.action === 'pet') return 'happy';
  if (extras?.action === 'nameCall' || extras?.action === 'idleLook') {
    return 'look';
  }

  if (extras?.isWalking) return 'walk';

  return resolveAmbientDogVideoState(dogState);
}

function toPath(
  breed: Breed,
  manifest: DogAssetManifest,
  state: DogVideoState,
  extras?: ResolveExtras
): ResolvedPlayback | null {
  let fileName: string | null = null;

  if (state === 'happy') {
    fileName =
      extras?.petHappyFile &&
      extras.petHappyFile.length > 0
        ? extras.petHappyFile
        : pickHappyFile(manifest);
  } else {
    fileName = clipFileForState(state, manifest);
  }

  if (!fileName) return null;

  const loop =
    state === 'eat' || state === 'happy' || state === 'look'
      ? false
      : state === 'walk'
        ? true
        : ambientLoopStates(state);

  return {
    path: getLocalVideoPath(breed, fileName),
    loop,
  };
}

/** 홈 기본 레이어 (idle / 상태 클립) */
export function resolveAmbientPlayback(
  dogState: DogState,
  manifest: DogAssetManifest
): ResolvedPlayback | null {
  if (!dogState.breed) return null;

  const state = resolveAmbientDogVideoState(dogState);
  const fileName = clipFileForState(state, manifest);

  if (!fileName) return null;

  return {
    path: getLocalVideoPath(dogState.breed, fileName),
    loop: ambientLoopStates(state),
  };
}

/** 홈 강제 idle(중간 완충용) */
export function resolveAmbientIdlePlayback(
  dogState: DogState,
  manifest: DogAssetManifest
): ResolvedPlayback | null {
  if (!dogState.breed) return null;

  const fileName = clipFileForState('idle', manifest);
  if (!fileName) return null;

  return {
    path: getLocalVideoPath(dogState.breed, fileName),
    loop: true,
  };
}

/** 빈 방(정지)에서 이름 호출 시 재생 → 이후 베이스 idle로 디졸브 */
export function resolveEmptyWakePlayback(
  dogState: DogState,
  manifest: DogAssetManifest
): ResolvedPlayback | null {
  if (!dogState.breed) return null;

  const fileName = pickRandomVideo(manifest, 'empty') ?? 'empty01.mp4';

  return {
    path: getLocalVideoPath(dogState.breed, fileName),
    loop: false,
  };
}

/** 산책 화면 */
export function resolveWalkPlayback(
  dogState: DogState,
  manifest: DogAssetManifest
): ResolvedPlayback | null {
  if (!dogState.breed) return null;

  const state = resolveDogVideoState(dogState, { isWalking: true });
  return toPath(dogState.breed, manifest, state, { isWalking: true });
}

/**
 * 레거시 단일 문자열 경로 (기존 호출부 호환)
 */
export function resolveDogVideoPath(
  dogState: DogState,
  manifest: DogAssetManifest,
  extras?: ResolveExtras
): string | null {
  if (!dogState.breed) return null;

  const state = resolveDogVideoState(dogState, extras);
  const r = toPath(dogState.breed, manifest, state, extras);
  return r?.path ?? null;
}

export function resolveDogVideoPlayback(
  dogState: DogState,
  manifest: DogAssetManifest,
  extras?: ResolveExtras
): ResolvedPlayback | null {
  if (!dogState.breed) return null;

  const state = resolveDogVideoState(dogState, extras);
  return toPath(dogState.breed, manifest, state, extras);
}
