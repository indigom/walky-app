import { NEARBY_WALKER_API_URL, WALKY_ORIGIN } from './walkyServer';

/** 근처 산책자 감지 반경 (m) */
export const NEARBY_WALKER_RADIUS_M = 50;

/** 서버에 위치를 올리는 주기 (ms) */
export const NEARBY_WALKER_HEARTBEAT_INTERVAL_MS = 20_000;

/** `walky.co.kr/api/nearby/presence` — `EXPO_PUBLIC_NEARBY_WALKER_API_URL` 로 변경 가능 */
export { NEARBY_WALKER_API_URL };

/** 노크·대화 (`POST /api/nearby/social`) */
export const NEARBY_SOCIAL_API_URL =
  process.env.EXPO_PUBLIC_NEARBY_SOCIAL_API_URL ??
  `${WALKY_ORIGIN.replace(/\/+$/, '')}/api/nearby/social`;

/** 노크·메시지 폴링 주기 (ms) */
export const NEARBY_SOCIAL_POLL_INTERVAL_MS = 3_000;

export const NEARBY_WALKER_PUSH_BODY =
  '근처에 산책하는 분이 있어요! 강아지가 짖고 있어요.';
