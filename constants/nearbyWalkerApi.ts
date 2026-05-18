import { WALKY_ASSET_ORIGIN } from './assetServer';

/** 근처 산책자 감지 반경 (m) */
export const NEARBY_WALKER_RADIUS_M = 50;

/** 서버에 위치를 올리는 주기 (ms) */
export const NEARBY_WALKER_HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * 근처 산책자 presence API (Vercel 등에 `api/nearby/presence` 배포).
 * `EXPO_PUBLIC_NEARBY_WALKER_API_URL` 로 덮어쓸 수 있습니다.
 */
export const NEARBY_WALKER_API_URL =
  process.env.EXPO_PUBLIC_NEARBY_WALKER_API_URL ??
  `${WALKY_ASSET_ORIGIN}/api/nearby/presence`;

export const NEARBY_WALKER_PUSH_BODY =
  '근처에 산책하는 분이 있어요! 강아지가 짖고 있어요.';
