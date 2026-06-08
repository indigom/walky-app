/**
 * walky.co.kr 서버 (에셋 CDN + REST API).
 * 개발/스테이징: `EXPO_PUBLIC_WALKY_ORIGIN` 으로 덮어쓸 수 있습니다.
 */
function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, '');
}

export const WALKY_ORIGIN = normalizeOrigin(
  process.env.EXPO_PUBLIC_WALKY_ORIGIN ?? 'https://walky.co.kr'
);

/** manifest·영상·이미지 (`/dogs/{breed}/…`) */
export const WALKY_ASSET_ORIGIN = WALKY_ORIGIN;

/**
 * (선택) manifest 1차 실패 시 두 번째 CDN.
 * 미설정 시 walky.co.kr만 사용 — 별도 백업 호스트는 관리하지 않음.
 */
export const WALKY_ASSET_FALLBACK_ORIGIN: string | null = (() => {
  const raw = process.env.EXPO_PUBLIC_WALKY_ASSET_FALLBACK_ORIGIN?.trim();
  if (!raw) return null;
  return normalizeOrigin(raw);
})();

/** 근처 산책자 presence (`POST /api/nearby/presence`) */
export const NEARBY_WALKER_API_URL =
  process.env.EXPO_PUBLIC_NEARBY_WALKER_API_URL ??
  `${WALKY_ORIGIN}/api/nearby/presence`;
