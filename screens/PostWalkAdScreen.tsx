import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';

type Props = {
  onContinue: () => void;
};

const AD_LOAD_SIM_MS = 900;

/**
 * 산책 종료 직후 전면 구간. 실제 전면 광고 SDK는 여기에 연결하면 됩니다.
 * 로드 실패·타임아웃 시에도 결과 화면으로 넘어갈 수 있게 버튼을 둡니다.
 */
export function PostWalkAdScreen({ onContinue }: Props) {
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    const id = setTimeout(() => setPhase('ready'), AD_LOAD_SIM_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        {phase === 'loading' ? (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.hint}>광고를 불러오는 중이에요…</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>잠깐만요</Text>
            <View style={styles.adPlaceholder}>
              <Text style={styles.adLabel}>광고 영역</Text>
              <Text style={styles.adSub}>
                전면 광고 SDK(예: AdMob)를 이 화면에 붙이면 됩니다.
              </Text>
            </View>
            <PrimaryButton label="산책 결과 보기" onPress={onContinue} />
          </>
        )}
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
    gap: 20,
  },
  hint: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  adPlaceholder: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  adLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
  },
  adSub: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 19,
  },
});
