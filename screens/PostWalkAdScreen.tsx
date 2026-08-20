import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

import { PrimaryButton } from '../components/PrimaryButton';
import {
  POST_WALK_AD_LOAD_TIMEOUT_MS,
  POST_WALK_INTERSTITIAL_AD_UNIT_ID,
} from '../constants/admob';

type Props = {
  onContinue: () => void;
};

/**
 * 산책 종료 직후 AdMob 전면 광고.
 * 로드·표시 실패·타임아웃 시에도 결과 화면으로 넘어갈 수 있습니다.
 */
export function PostWalkAdScreen({ onContinue }: Props) {
  const adUnitId =
    Platform.OS === 'web' ? null : POST_WALK_INTERSTITIAL_AD_UNIT_ID;
  const interstitial = useInterstitialAd(adUnitId);
  const continuedRef = useRef(false);
  const [showSkip, setShowSkip] = useState(false);

  const safeContinue = useCallback(() => {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onContinue();
  }, [onContinue]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      safeContinue();
      return;
    }

    interstitial.load();
  }, [interstitial.load, safeContinue]);

  useEffect(() => {
    if (!interstitial.isLoaded || interstitial.isShowing) return;
    interstitial.show();
  }, [interstitial.isLoaded, interstitial.isShowing, interstitial.show]);

  useEffect(() => {
    if (interstitial.isClosed) {
      safeContinue();
    }
  }, [interstitial.isClosed, safeContinue]);

  useEffect(() => {
    if (interstitial.error) {
      setShowSkip(true);
    }
  }, [interstitial.error]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const id = setTimeout(() => setShowSkip(true), POST_WALK_AD_LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.hint}>
          {interstitial.isShowing
            ? '광고를 보고 있어요…'
            : '잠시만 기다려 주세요…'}
        </Text>

        {showSkip ? (
          <>
            <Text style={styles.skipHint}>
              {interstitial.error
                ? '광고를 불러오지 못했어요.'
                : '광고 준비가 오래 걸리고 있어요.'}
            </Text>
            <PrimaryButton label="산책 결과 보기" onPress={safeContinue} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'center',
    gap: 16,
  },
  hint: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  skipHint: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
