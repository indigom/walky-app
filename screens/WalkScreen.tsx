// src/screens/WalkScreen.tsx

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { Pedometer } from 'expo-sensors';
import { DogVisual } from '../components/DogVisual';
import { PrimaryButton } from '../components/PrimaryButton';

import type { DogAssetManifest, DogState, WalkSummary } from '../types';
import { resolveWalkPlayback } from '../assets/DogVideoResolver';
import { energyDropForWalkKm } from '../utils/energyStat';
import { NEARBY_WALKER_HEARTBEAT_INTERVAL_MS } from '../constants/nearbyWalkerApi';
import { getExpoPushTokenOrNull } from '../utils/expoPushToken';
import {
  reportNearbyWalkerHeartbeat,
  reportNearbyWalkerLeave,
} from '../utils/nearbyWalkerPresence';
import {
  computeRawWalkDistanceKm,
  estimateStrideMeters,
  GPS_MIN_TRUST_M,
  haversineDistanceMeters,
  resolveWalkOutcome,
} from '../utils/walkMetrics';

type WalkScreenProps = {
  dogState: DogState;
  dogManifest: DogAssetManifest | null;
  setDogState: Dispatch<SetStateAction<DogState>>;
  onFinishWalk: (summary: WalkSummary) => void;
  onDiscardWalk: () => void;
};

const WALK_MESSAGES = [
  '좋아! 천천히 같이 걸어보자.',
  '벌써 5분이나 걸었어. 잘하고 있어!',
  '네 걸음 소리가 참 든든해.',
  '조금만 더 걸으면 기분이 더 좋아질 거야.',
  '오늘도 너랑 걷는 시간이 좋아.',
  '꾸준히 걷는 너, 정말 멋져!',
  '숨 고르면서 편하게 걸어도 괜찮아.',
  '조금씩 건강해지고 있어.',
  '거의 다 왔어. 조금만 더 힘내!',
  '최고야! 오늘 산책도 성공이야.',
];

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function calculateCalories(weight: number, totalSeconds: number): number {
  const walkingMET = 3.5;
  const hours = totalSeconds / 3600;
  return walkingMET * weight * hours;
}

const MIN_SEGMENT_M = 4;
const MAX_SEGMENT_M = 130;
const MAX_HORIZONTAL_ACCURACY_M = 68;

function getWalkMessage(elapsedSeconds: number): string {
  const fiveMinutes = 5 * 60;
  const messageIndex = Math.floor(elapsedSeconds / fiveMinutes);
  return WALK_MESSAGES[messageIndex % WALK_MESSAGES.length];
}

export function WalkScreen({
  dogState,
  setDogState,
  dogManifest,
  onFinishWalk,
  onDiscardWalk,
}: WalkScreenProps) {
  useKeepAwake();

  const isFocused = useIsFocused();

  const [appIsActive, setAppIsActive] = useState(
    () => AppState.currentState === 'active'
  );

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [steps, setSteps] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gpsDistanceKm, setGpsDistanceKm] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const [pedometerActive, setPedometerActive] = useState(false);
  const [useStepSimulation, setUseStepSimulation] = useState(
    Platform.OS === 'web'
  );

  const isPausedRef = useRef(false);
  const stepsBaselineRef = useRef(0);
  const stepsLiveRef = useRef(0);
  const pedometerSessionStartRef = useRef<number | null>(null);
  const gpsMetersRef = useRef(0);
  const lastFixRef = useRef<{ lat: number; lon: number } | null>(null);
  const nearbyLastHeartbeatRef = useRef(0);
  const pushTokenRef = useRef<string | null>(null);

  /** 일시정지가 아닌 동안만 흐르는 시간(백그라운드 포함) — 벽시계 기준 */
  const baseWalkMsRef = useRef(0);
  const walkingSegmentStartedAtRef = useRef<number | null>(null);

  /** 경과 시간·요약값을 같은 기준으로 맞춤 */
  const flushWalkClock = (): number => {
    const ms =
      walkingSegmentStartedAtRef.current !== null && !isPausedRef.current
        ? baseWalkMsRef.current +
          (Date.now() - walkingSegmentStartedAtRef.current)
        : baseWalkMsRef.current;
    const sec = Math.floor(ms / 1000);
    setElapsedSeconds(sec);
    return sec;
  };

  const catchUpSimulatedSteps = (durationSeconds: number) => {
    if (!useStepSimulation) return;
    const target = durationSeconds * 2;
    if (stepsLiveRef.current >= target) return;
    stepsLiveRef.current = target;
    setSteps(target);
  };

  const walkPlayback = useMemo(() => {
    if (!dogManifest) return null;
    return resolveWalkPlayback(dogState, dogManifest);
  }, [dogState, dogManifest]);

  const strideMeters = useMemo(
    () => estimateStrideMeters(dogState.user?.heightCm),
    [dogState.user?.heightCm]
  );

  const distanceKm = useMemo(() => {
    const raw = computeRawWalkDistanceKm({
      durationSeconds: elapsedSeconds,
      gpsDistanceKm,
      gpsActive,
      pedometerActive,
      steps,
      strideMeters,
      allowTimeEstimate: useStepSimulation,
    });
    return resolveWalkOutcome(steps, raw).distanceKm;
  }, [
    elapsedSeconds,
    gpsDistanceKm,
    gpsActive,
    pedometerActive,
    steps,
    strideMeters,
    useStepSimulation,
  ]);

  const calories = useMemo(() => {
    const weight = dogState.user?.weightKg ?? 0;
    return calculateCalories(weight, elapsedSeconds);
  }, [dogState.user, elapsedSeconds]);

  const distanceSourceLabel = useMemo(() => {
    const trustGps =
      gpsActive && gpsDistanceKm * 1000 >= GPS_MIN_TRUST_M;
    if (trustGps) return 'GPS 경로';
    if (pedometerActive || steps > 0)
      return '만보기·걸음(0.3m/보 이상일 때 기록)';
    if (Platform.OS === 'web') return '웹: 시간·속도 추정';
    return 'GPS·걸음 필요(정지 시 기록 안 됨)';
  }, [gpsActive, pedometerActive, gpsDistanceKm, steps]);

  const walkMessage = useMemo(
    () => getWalkMessage(elapsedSeconds),
    [elapsedSeconds]
  );

  useLayoutEffect(() => {
    baseWalkMsRef.current = 0;
    walkingSegmentStartedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const active = state === 'active';
      setAppIsActive(active);
      if (!active) return;
      const sec = flushWalkClock();
      if (!isPausedRef.current && useStepSimulation) {
        catchUpSimulatedSteps(sec);
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [useStepSimulation]);

  useEffect(() => {
    if (isPaused) return;

    flushWalkClock();
    const intervalId = setInterval(flushWalkClock, 1000);

    return () => clearInterval(intervalId);
  }, [isPaused]);

  useEffect(() => {
    if (!useStepSimulation || isPaused) return;

    const intervalId = setInterval(() => {
      if (!appIsActive) return;
      setSteps((prev) => {
        const next = prev + 2;
        stepsLiveRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [useStepSimulation, isPaused, appIsActive]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      const ok = await Pedometer.isAvailableAsync();
      if (cancelled) return;

      if (!ok) {
        setUseStepSimulation(true);
        setPedometerActive(false);
        return;
      }

      const perm = await Pedometer.requestPermissionsAsync();
      if (cancelled) return;

      if (!perm.granted) {
        setUseStepSimulation(true);
        setPedometerActive(false);
        return;
      }

      setPedometerActive(true);
      setUseStepSimulation(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !pedometerActive || isPaused) {
      return;
    }

    pedometerSessionStartRef.current = null;

    const sub = Pedometer.watchStepCount((result) => {
      if (isPausedRef.current) return;
      if (pedometerSessionStartRef.current === null) {
        pedometerSessionStartRef.current = result.steps;
      }
      const sessionSteps =
        result.steps - pedometerSessionStartRef.current;
      const total = stepsBaselineRef.current + Math.max(0, sessionSteps);
      stepsLiveRef.current = total;
      setSteps(total);
    });

    return () => {
      sub.remove();
      pedometerSessionStartRef.current = null;
    };
  }, [pedometerActive, isPaused]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isFocused) {
      lastFixRef.current = null;
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let alive = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;

      if (status !== 'granted') {
        setGpsActive(false);
        lastFixRef.current = null;
        return;
      }

      setGpsActive(true);
      lastFixRef.current = null;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 4000,
        },
        (loc) => {
          if (isPausedRef.current) return;

          const acc = loc.coords.accuracy ?? 999;
          if (acc > MAX_HORIZONTAL_ACCURACY_M) return;

          const { latitude, longitude } = loc.coords;
          const prev = lastFixRef.current;
          lastFixRef.current = { lat: latitude, lon: longitude };
          if (!prev) return;

          const d = haversineDistanceMeters(
            prev.lat,
            prev.lon,
            latitude,
            longitude
          );
          if (d < MIN_SEGMENT_M || d > MAX_SEGMENT_M) return;

          gpsMetersRef.current += d;
          setGpsDistanceKm(gpsMetersRef.current / 1000);
          maybeReportNearbyWalker(latitude, longitude);
        }
      );
    })().catch(() => {
      if (alive) setGpsActive(false);
    });

    return () => {
      alive = false;
      subscription?.remove();
      lastFixRef.current = null;
    };
  }, [isFocused]);

  function handleTogglePause() {
    setIsPaused((prev) => {
      const next = !prev;
      if (!prev && next) {
        if (walkingSegmentStartedAtRef.current !== null) {
          baseWalkMsRef.current +=
            Date.now() - walkingSegmentStartedAtRef.current;
          walkingSegmentStartedAtRef.current = null;
        }
        flushWalkClock();
        stepsBaselineRef.current = stepsLiveRef.current;
      } else if (prev && !next) {
        walkingSegmentStartedAtRef.current = Date.now();
        flushWalkClock();
      }
      isPausedRef.current = next;
      return next;
    });
  }

  const walkVideoActive =
    isFocused && !isPaused && appIsActive;

  useEffect(() => {
    if (Platform.OS === 'web' || !isFocused) return;

    void getExpoPushTokenOrNull().then((token) => {
      pushTokenRef.current = token;
    });

    return () => {
      void reportNearbyWalkerLeave();
    };
  }, [isFocused]);

  function maybeReportNearbyWalker(latitude: number, longitude: number) {
    const gender = dogState.user?.gender;
    if (!gender || dogState.user?.nearbyWalkerAlerts === false) return;
    if (isPausedRef.current) return;

    const now = Date.now();
    if (now - nearbyLastHeartbeatRef.current < NEARBY_WALKER_HEARTBEAT_INTERVAL_MS) {
      return;
    }
    nearbyLastHeartbeatRef.current = now;

    void reportNearbyWalkerHeartbeat(dogState.user, {
      latitude,
      longitude,
      gender,
      dogName: dogState.name?.trim() || '강아지',
      pushToken: pushTokenRef.current,
    });
  }

  function handleFinish() {
    void reportNearbyWalkerLeave();
    const durationSeconds = flushWalkClock();
    catchUpSimulatedSteps(durationSeconds);

    const weight = dogState.user?.weightKg ?? 0;
    const stepsFinal =
      useStepSimulation
        ? Math.max(stepsLiveRef.current, durationSeconds * 2)
        : stepsLiveRef.current;

    const rawDistanceKm = computeRawWalkDistanceKm({
      durationSeconds,
      gpsDistanceKm,
      gpsActive,
      pedometerActive,
      steps: stepsFinal,
      strideMeters,
      allowTimeEstimate: useStepSimulation,
    });

    const outcome = resolveWalkOutcome(stepsFinal, rawDistanceKm);

    if (!outcome.counted) {
      void reportNearbyWalkerLeave();
      Alert.alert(
        '산책 기록 안 됨',
        '걸음이나 이동 거리가 너무 적어 산책으로 기록하지 않았어요.\n(최소 약 30m, 0.3m당 1보 이상)',
        [{ text: '확인', onPress: onDiscardWalk }]
      );
      return;
    }

    const distanceKmFinal = outcome.distanceKm;
    const stepsRecorded = outcome.steps;
    const caloriesFinal = calculateCalories(weight, durationSeconds);

    const endedAt = new Date().toISOString();
    const energyDrop = energyDropForWalkKm(distanceKmFinal);

    setDogState((prev) => {
      const nextEnergy = Math.max(0, prev.energy - energyDrop);
      return {
        ...prev,
        energy: nextEnergy,
        mood: Math.min(100, prev.mood + 12),
        affection: Math.min(100, prev.affection + 10),
        hunger: Math.min(100, prev.hunger + 6),
        lastWalkAt: endedAt,
        energyReachedMaxAt: nextEnergy >= 100 ? prev.energyReachedMaxAt : null,
      };
    });

    onFinishWalk({
      durationSeconds,
      distanceKm: distanceKmFinal,
      steps: stepsRecorded,
      calories: caloriesFinal,
    });
  }

  return (
    <View style={styles.container}>
      {walkPlayback?.path ? (
        <View style={styles.videoLayer} pointerEvents="none">
          <DogVisual
            videoPath={walkPlayback.path}
            videoLoop={walkPlayback.loop}
            isScreenActive={walkVideoActive}
            muted={false}
          />
        </View>
      ) : null}

      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.18)',
          'rgba(0,0,0,0.62)',
        ]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.uiLayer}>
        <View style={styles.topSection}>
          <Text style={styles.elapsedLabel}>걷기 시간</Text>
          <Text style={styles.elapsedText}>
            {formatDuration(elapsedSeconds)}
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>{walkMessage}</Text>
            <Text style={styles.messageSubText}>
              5분마다 새로운 응원 메시지가 나와요
            </Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>걸은 거리</Text>
              <Text style={styles.statValue}>
                {formatNumber(distanceKm)} km
              </Text>
              <Text style={styles.statHint}>{distanceSourceLabel}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>걸음</Text>
              <Text style={styles.statValue}>{steps.toLocaleString()} 보</Text>
              <Text style={styles.statHint}>
                {pedometerActive ? '기기 만보기' : '추정(또는 시뮬)'}
              </Text>
            </View>
          </View>

          <View style={styles.statsCardSecondary}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>소비 칼로리</Text>
              <Text style={styles.statValueWide}>
                {Math.round(calories)} kcal
              </Text>
              <Text style={styles.statHint}>
                MET·시간·체중(거리 출처와 별도)
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <PrimaryButton
                label={isPaused ? '다시 걷기' : '일시정지'}
                onPress={handleTogglePause}
              />
            </View>

            <View style={styles.buttonGap} />

            <View style={styles.buttonWrapper}>
              <PrimaryButton label="산책 종료" onPress={handleFinish} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoLayer: { ...StyleSheet.absoluteFillObject },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '52%',
  },
  uiLayer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 4,
  },
  elapsedLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    marginBottom: 8,
  },
  elapsedText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bottomSection: { alignItems: 'center' },
  messageBubble: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  messageText: { fontSize: 16, textAlign: 'center' },
  messageSubText: { fontSize: 12, textAlign: 'center' },
  statsCard: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statValueWide: { fontSize: 22, fontWeight: '800' },
  statHint: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  statDivider: { width: 1, backgroundColor: '#ccc' },
  statsCardSecondary: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  buttonRow: { flexDirection: 'row' },
  buttonWrapper: { flex: 1 },
  buttonGap: { width: 12 },
});