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

/** walky.co.kr manifest 오류 시 견종 영상 다운로드 백업 */
export const WALKY_ASSET_FALLBACK_ORIGIN = normalizeOrigin(
  process.env.EXPO_PUBLIC_WALKY_ASSET_FALLBACK_ORIGIN ??
    'https://walky-asset.vercel.app'
);

/** 근처 산책자 presence (`POST /api/nearby/presence`) */
export const NEARBY_WALKER_API_URL =
  process.env.EXPO_PUBLIC_NEARBY_WALKER_API_URL ??
  `${WALKY_ORIGIN}/api/nearby/presence`;
