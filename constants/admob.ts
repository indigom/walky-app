import { TestIds } from 'react-native-google-mobile-ads';

const productionPostWalkInterstitial =
  process.env.EXPO_PUBLIC_ADMOB_POST_WALK_INTERSTITIAL_UNIT_ID?.trim() ?? '';

/**
 * 산책 종료 직후 전면(Interstitial) 광고 유닛 ID.
 * 운영: AdMob 콘솔 → 앱 → 광고 단위 → 전면 → ID를 .env에 설정.
 */
export const POST_WALK_INTERSTITIAL_AD_UNIT_ID = (() => {
  if (productionPostWalkInterstitial) {
    return productionPostWalkInterstitial;
  }

  if (__DEV__) {
    return TestIds.INTERSTITIAL;
  }

  console.warn(
    '[AdMob] EXPO_PUBLIC_ADMOB_POST_WALK_INTERSTITIAL_UNIT_ID 가 없어 테스트 광고 ID를 사용합니다.'
  );
  return TestIds.INTERSTITIAL;
})();

/** 광고 로드 대기 후 스킵 버튼 표시 (ms) */
export const POST_WALK_AD_LOAD_TIMEOUT_MS = 12_000;
