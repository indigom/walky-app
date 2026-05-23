import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { getBreedWalkResultBgSource } from '../constants/breedWalkResultImages';
import type { DogState, WalkSummary } from '../types';

export const INSUFFICIENT_WALK_ENERGY_MESSAGE =
  '오늘은 에너지 소모가 부족해 ㅜㅜ';

type TodayWalkTotal = {
  walkCount: number;
  durationSeconds: number;
  distanceKm: number;
  steps: number;
  calories: number;
};

type WalkResultScreenProps = {
  dogState: DogState;
  summary: WalkSummary;
  todayTotal?: TodayWalkTotal;
  rewardUnlocked?: boolean;
  /** 이번 산책 거리가 목표보다 짧을 때 표시 */
  insufficientEnergyMessage?: string | null;
  onGoHome: () => void;
  onPressReward?: () => void;
};

const DAILY_REWARD_DISTANCE_KM = 5;

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? totalSeconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function formatCalories(value: number | undefined | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0 kcal';
  }

  return `${Math.round(value)} kcal`;
}

function getResultMessage(dogState: DogState): string {
  if (dogState.energy < 30) {
    return `${dogState.name}가 조금 지친 것 같아요. 이제 쉬게 해주세요.`;
  }

  if (dogState.mood >= 85 || dogState.affection >= 75) {
    return `${dogState.name}가 오늘 산책을 정말 좋아했어요.`;
  }

  return `${dogState.name}와 함께 좋은 시간을 보냈어요.`;
}

function getDefaultTodayTotal(summary: WalkSummary): TodayWalkTotal {
  return {
    walkCount: 1,
    durationSeconds: summary.durationSeconds,
    distanceKm: summary.distanceKm,
    steps: summary.steps,
    calories: summary.calories ?? 0,
  };
}

export function WalkResultScreen({
  dogState,
  summary,
  todayTotal,
  rewardUnlocked = false,
  insufficientEnergyMessage = null,
  onGoHome,
  onPressReward,
}: WalkResultScreenProps) {
  const message = getResultMessage(dogState);
  const total = todayTotal ?? getDefaultTodayTotal(summary);
  const breed = dogState.breed;

  const summaryCalories = summary.calories ?? 0;
  const totalCalories = total.calories ?? 0;

  const remainingDistanceKm = Math.max(
    0,
    DAILY_REWARD_DISTANCE_KM - total.distanceKm
  );

  const hasReachedDailyReward = total.distanceKm >= DAILY_REWARD_DISTANCE_KM;

  const content = (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <Text style={styles.emoji}>🐾</Text>
          <Text style={styles.title}>산책 완료</Text>
          {insufficientEnergyMessage ? (
            <View style={styles.insufficientBanner}>
              <Text style={styles.insufficientText}>
                {insufficientEnergyMessage}
              </Text>
            </View>
          ) : null}
          <Text style={styles.message}>{message}</Text>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>이번 산책</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>시간</Text>
              <Text style={styles.statValue}>
                {formatDuration(summary.durationSeconds)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>거리</Text>
              <Text style={styles.statValue}>
                {summary.distanceKm.toFixed(2)} km
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>걸음 수</Text>
              <Text style={styles.statValue}>{summary.steps}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>칼로리</Text>
              <Text style={styles.statValue}>
                {formatCalories(summaryCalories)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>오늘 총 산책</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>산책 횟수</Text>
              <Text style={styles.statValue}>{total.walkCount}회</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>총 시간</Text>
              <Text style={styles.statValue}>
                {formatDuration(total.durationSeconds)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>총 거리</Text>
              <Text style={styles.statValue}>
                {total.distanceKm.toFixed(2)} km
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>총 칼로리</Text>
              <Text style={styles.statValue}>
                {formatCalories(totalCalories)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.rewardCard,
              hasReachedDailyReward && styles.rewardCardActive,
            ]}
          >
            <Text style={styles.rewardTitle}>
              {hasReachedDailyReward
                ? '🎁 오늘 5km 달성!'
                : '🎁 오늘의 리워드'}
            </Text>

            <Text style={styles.rewardText}>
              {hasReachedDailyReward
                ? `${dogState.name}의 특별 에피소드가 열렸어요.`
                : `오늘 ${remainingDistanceKm.toFixed(
                    2
                  )}km만 더 걸으면 특별 에피소드가 열려요.`}
            </Text>

            {hasReachedDailyReward && rewardUnlocked && onPressReward && (
              <View style={styles.rewardButton}>
                <PrimaryButton
                  label="리워드 영상 보기"
                  onPress={onPressReward}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <PrimaryButton label="홈으로 돌아가기" onPress={onGoHome} />
      </View>
    </>
  );

  if (!breed) {
    return <SafeAreaView style={styles.container}>{content}</SafeAreaView>;
  }

  return (
    <ImageBackground
      source={getBreedWalkResultBgSource(breed)}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} />
      <SafeAreaView style={styles.containerTransparent}>{content}</SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  container: { flex: 1, backgroundColor: '#000' },
  containerTransparent: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 18,
  },
  topSection: { alignItems: 'center' },
  emoji: { fontSize: 46, marginBottom: 10 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  insufficientBanner: {
    backgroundColor: 'rgba(255, 107, 107, 0.22)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 120, 120, 0.45)',
    maxWidth: '100%',
  },
  insufficientText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD4D4',
    textAlign: 'center',
    lineHeight: 22,
  },
  message: {
    fontSize: 16,
    lineHeight: 23,
    color: '#CFCFCF',
    textAlign: 'center',
  },
  contentSection: { gap: 14 },
  card: {
    backgroundColor: '#151515',
    borderRadius: 22,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 34,
  },
  statLabel: { fontSize: 15, color: '#A7A7A7' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff' },
  rewardCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  rewardCardActive: {
    backgroundColor: '#231A10',
    borderColor: '#F59E0B',
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#CFCFCF',
  },
  rewardButton: { marginTop: 14 },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});