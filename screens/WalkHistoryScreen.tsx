import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import type { WalkRecord } from '../types';

type DailyWalkTotal = {
  date: string;
  walkCount: number;
  durationSeconds: number;
  distanceKm: number;
  steps: number;
  calories: number;
};

type WalkHistoryScreenProps = {
  walkRecords: WalkRecord[];
  onGoHome: () => void;
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}분`;
}

function formatDate(dateKey: string): string {
  const date = new Date(dateKey);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getLast30DaysTotals(records: WalkRecord[]): DailyWalkTotal[] {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);

  const filtered = records.filter((record) => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= today;
  });

  const grouped = filtered.reduce<Record<string, DailyWalkTotal>>(
    (acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = {
          date: record.date,
          walkCount: 0,
          durationSeconds: 0,
          distanceKm: 0,
          steps: 0,
          calories: 0,
        };
      }

      acc[record.date].walkCount += 1;
      acc[record.date].durationSeconds += record.durationSeconds;
      acc[record.date].distanceKm += record.distanceKm;
      acc[record.date].steps += record.steps;
      acc[record.date].calories += record.calories;

      return acc;
    },
    {}
  );

  return Object.values(grouped).sort((a, b) => {
    return b.date.localeCompare(a.date);
  });
}

export function WalkHistoryScreen({
  walkRecords,
  onGoHome,
}: WalkHistoryScreenProps) {
  const dailyTotals = getLast30DaysTotals(walkRecords);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>산책 기록</Text>
        <Text style={styles.subtitle}>최근 30일 동안의 산책 기록이에요.</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {dailyTotals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.emptyTitle}>아직 산책 기록이 없어요</Text>
            <Text style={styles.emptyText}>
              산책을 완료하면 이곳에 기록이 쌓여요.
            </Text>
          </View>
        ) : (
          dailyTotals.map((item) => (
            <View key={item.date} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                <Text style={styles.countText}>{item.walkCount}회</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>거리</Text>
                  <Text style={styles.statValue}>
                    {item.distanceKm.toFixed(2)} km
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>시간</Text>
                  <Text style={styles.statValue}>
                    {formatDuration(item.durationSeconds)}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>칼로리</Text>
                  <Text style={styles.statValue}>
                    {Math.round(item.calories)} kcal
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomSection}>
        <PrimaryButton label="홈으로 돌아가기" onPress={onGoHome} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#A7A7A7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 14,
  },
  emptyCard: {
    marginTop: 40,
    padding: 28,
    borderRadius: 24,
    backgroundColor: '#151515',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#A7A7A7',
    textAlign: 'center',
  },
  recordCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#242424',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#202020',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8F8F8F',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
  },
});