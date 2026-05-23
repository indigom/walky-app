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
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { Pedometer } from 'expo-sensors';
import { DogVisual } from '../components/DogVisual';
import { PrimaryButton } from '../components/PrimaryButton';
import { NearbyWalkerChatModal } from '../components/NearbyWalkerChatModal';
import { NearbyWalkerIncomingKnockModal } from '../components/NearbyWalkerIncomingKnockModal';
import { NearbyWalkersListModal } from '../components/NearbyWalkersListModal';
import { WalkNearbyAlertsToggle } from '../components/WalkNearbyAlertsToggle';

import type { DogAssetManifest, DogState, WalkSummary } from '../types';
import { resolveWalkPlayback } from '../assets/DogVideoResolver';
import { energyDropForWalkKm } from '../utils/energyStat';
import {
  NEARBY_SOCIAL_POLL_INTERVAL_MS,
  NEARBY_WALKER_HEARTBEAT_INTERVAL_MS,
} from '../constants/nearbyWalkerApi';
import { getExpoPushTokenOrNull } from '../utils/expoPushToken';
import type { NearbyWalkerEntry } from '../types/nearbyWalker';
import type {
  NearbyChatSession,
  NearbyKnock,
} from '../types/nearbyWalkerSocial';
import {
  reportNearbyWalkerLeave,
  reportNearbyWalkerPresence,
} from '../utils/nearbyWalkerPresence';
import {
  knockNearbyWalker,
  leaveNearbySocial,
  mergeSessionMessages,
  pollNearbySocial,
  respondNearbyKnock,
  sendNearbyChatMessage,
} from '../utils/nearbyWalkerSocial';
import { getWalkyUserId } from '../utils/walkyUserId';
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

const CHEER_INTERVAL_SEC = 5 * 60;
const CHEER_VISIBLE_MS = 60 * 1000;

function getCheerMessageIndex(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / CHEER_INTERVAL_SEC);
}

function getCheerMessage(elapsedSeconds: number): string {
  const index = getCheerMessageIndex(elapsedSeconds);
  return WALK_MESSAGES[index % WALK_MESSAGES.length];
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
  const [cheerBubbleVisible, setCheerBubbleVisible] = useState(false);
  const [nearbyWalkers, setNearbyWalkers] = useState<NearbyWalkerEntry[]>([]);
  const [nearbyListVisible, setNearbyListVisible] = useState(false);
  const [myUserId, setMyUserId] = useState('');
  const [incomingKnocks, setIncomingKnocks] = useState<NearbyKnock[]>([]);
  const [outgoingKnock, setOutgoingKnock] = useState<NearbyKnock | null>(null);
  const [chatSessions, setChatSessions] = useState<
    Record<string, NearbyChatSession>
  >({});
  const [activeChatPeerId, setActiveChatPeerId] = useState<string | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [incomingKnockVisible, setIncomingKnockVisible] = useState(false);
  const [incomingKnockBusy, setIncomingKnockBusy] = useState(false);
  const [knockingUserId, setKnockingUserId] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const lastDeclinedKnockIdRef = useRef<string | null>(null);

  const isPausedRef = useRef(false);
  const stepsBaselineRef = useRef(0);
  const stepsLiveRef = useRef(0);
  const pedometerSessionStartRef = useRef<number | null>(null);
  const gpsMetersRef = useRef(0);
  const lastFixRef = useRef<{ lat: number; lon: number } | null>(null);
  const nearbyLastHeartbeatRef = useRef(0);
  const pushTokenRef = useRef<string | null>(null);
  const lastCheerIndexRef = useRef(-1);
  const cheerHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cheerMessage = useMemo(
    () => getCheerMessage(elapsedSeconds),
    [elapsedSeconds]
  );

  const nearbyWalkerAlertsOn = dogState.user?.nearbyWalkerAlerts !== false;
  const canUseNearbyWalkerAlerts = !!dogState.user?.gender;

  const activeChatSession = activeChatPeerId
    ? chatSessions[activeChatPeerId] ?? null
    : null;
  const chattingPeerIds = Object.keys(chatSessions);
  const pendingIncomingKnock = incomingKnocks[0] ?? null;

  function applySocialPoll(result: NonNullable<
    Awaited<ReturnType<typeof pollNearbySocial>>
  >) {
    setIncomingKnocks(result.incomingKnocks);

    if (result.outgoingKnock?.status === 'declined') {
      const id = result.outgoingKnock.knockId;
      if (lastDeclinedKnockIdRef.current !== id) {
        lastDeclinedKnockIdRef.current = id;
        Alert.alert(
          '노크 거절',
          '상대방이 대화 요청을 거절했어요.'
        );
      }
      setOutgoingKnock(result.outgoingKnock);
    } else if (result.outgoingKnock) {
      setOutgoingKnock(result.outgoingKnock);
    } else {
      setOutgoingKnock(null);
    }

    setChatSessions((prev) => {
      const next = { ...prev };
      for (const session of result.sessions) {
        next[session.peerUserId] = mergeSessionMessages(
          prev[session.peerUserId] ?? null,
          session
        );
      }
      return next;
    });

    if (result.outgoingKnock?.status === 'accepted') {
      const peerId = result.outgoingKnock.toUserId;
      const session = result.sessions.find((s) => s.peerUserId === peerId);
      if (session) {
        setActiveChatPeerId(peerId);
        setChatVisible(true);
        setIncomingKnockVisible(false);
      }
    }

    if (
      result.incomingKnocks.length > 0 &&
      !chatVisible
    ) {
      setIncomingKnockVisible(true);
    }
  }

  function setNearbyWalkerAlerts(enabled: boolean) {
    setDogState((prev) => ({
      ...prev,
      user: {
        ...(prev.user ?? {}),
        nearbyWalkerAlerts: enabled,
      },
    }));
  }

  useEffect(() => {
    if (isPaused) return;

    const index = getCheerMessageIndex(elapsedSeconds);
    if (index === lastCheerIndexRef.current) return;

    lastCheerIndexRef.current = index;
    setCheerBubbleVisible(true);

    if (cheerHideTimerRef.current) {
      clearTimeout(cheerHideTimerRef.current);
    }

    cheerHideTimerRef.current = setTimeout(() => {
      setCheerBubbleVisible(false);
      cheerHideTimerRef.current = null;
    }, CHEER_VISIBLE_MS);
  }, [elapsedSeconds, isPaused]);

  useEffect(() => {
    return () => {
      if (cheerHideTimerRef.current) {
        clearTimeout(cheerHideTimerRef.current);
      }
    };
  }, []);

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

    void getWalkyUserId().then((id) => setMyUserId(id));

    return () => {
      setNearbyWalkers([]);
      setIncomingKnocks([]);
      setOutgoingKnock(null);
      setChatSessions({});
      setActiveChatPeerId(null);
      setChatVisible(false);
      setIncomingKnockVisible(false);
      void reportNearbyWalkerLeave();
      void leaveNearbySocial();
    };
  }, [isFocused]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isFocused || !canUseNearbyWalkerAlerts) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      const result = await pollNearbySocial(0);
      if (cancelled || !result) return;
      applySocialPoll(result);
    };

    void tick();
    const intervalId = setInterval(() => void tick(), NEARBY_SOCIAL_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isFocused, canUseNearbyWalkerAlerts, chatVisible]);

  function maybeReportNearbyWalker(latitude: number, longitude: number) {
    const gender = dogState.user?.gender;
    if (!gender || isPausedRef.current) return;

    const now = Date.now();
    if (now - nearbyLastHeartbeatRef.current < NEARBY_WALKER_HEARTBEAT_INTERVAL_MS) {
      return;
    }
    nearbyLastHeartbeatRef.current = now;

    void reportNearbyWalkerPresence(dogState.user, {
      latitude,
      longitude,
      gender,
      dogName: dogState.name?.trim() || '강아지',
      nickname: dogState.user?.nickname,
      pushToken: pushTokenRef.current,
    }).then((result) => {
      if (result?.nearbyWalkers) {
        setNearbyWalkers(result.nearbyWalkers);
      }
    });
  }

  async function handleKnockWalker(walker: NearbyWalkerEntry) {
    if (knockingUserId) return;

    setKnockingUserId(walker.userId);
    const dogName = dogState.name?.trim() || '강아지';
    const { knock, error } = await knockNearbyWalker(
      dogState.user,
      walker.userId,
      dogName
    );
    setKnockingUserId(null);

    if (error === 'not_nearby') {
      Alert.alert(
        '노크 실패',
        '상대방이 근처에 없거나 산책이 끝났어요.'
      );
      return;
    }

    if (!knock) {
      Alert.alert(
        '노크 실패',
        '지금은 노크를 보낼 수 없어요. API 서버 연결을 확인해 주세요.'
      );
      return;
    }

    setOutgoingKnock(knock);
    Alert.alert(
      '노크 보냄',
      `${walker.nickname ? `${walker.nickname} · ` : ''}${walker.dogName} 님에게 대화 요청을 보냈어요. 수락하면 대화할 수 있어요.`
    );
  }

  async function handleAcceptIncomingKnock() {
    const knock = pendingIncomingKnock;
    if (!knock || incomingKnockBusy) return;

    setIncomingKnockBusy(true);
    const { session } = await respondNearbyKnock(knock.knockId, true);
    setIncomingKnockBusy(false);
    setIncomingKnockVisible(false);
    setIncomingKnocks((prev) =>
      prev.filter((k) => k.knockId !== knock.knockId)
    );

    if (session) {
      setChatSessions((prev) => ({
        ...prev,
        [session.peerUserId]: session,
      }));
      setActiveChatPeerId(session.peerUserId);
      setChatVisible(true);
    }
  }

  async function handleDeclineIncomingKnock() {
    const knock = pendingIncomingKnock;
    if (!knock || incomingKnockBusy) return;

    setIncomingKnockBusy(true);
    await respondNearbyKnock(knock.knockId, false);
    setIncomingKnockBusy(false);
    setIncomingKnockVisible(false);
    setIncomingKnocks((prev) =>
      prev.filter((k) => k.knockId !== knock.knockId)
    );
  }

  async function handleSendChatMessage(text: string): Promise<boolean> {
    const session = activeChatSession;
    if (!session || chatSending) return false;

    setChatSending(true);
    const message = await sendNearbyChatMessage(session.sessionId, text);
    setChatSending(false);

    if (!message) {
      Alert.alert(
        '전송 실패',
        '메시지를 보내지 못했어요. 상대방이 근처에 있는지 확인해 주세요.'
      );
      return false;
    }

    setChatSessions((prev) => {
      const current = prev[session.peerUserId];
      if (!current) return prev;
      return {
        ...prev,
        [session.peerUserId]: {
          ...current,
          messages: [...current.messages, message],
          updatedAt: message.createdAt,
        },
      };
    });

    return true;
  }

  function openChatForPeer(peerUserId: string) {
    if (!chatSessions[peerUserId]) return;
    setActiveChatPeerId(peerUserId);
    setChatVisible(true);
    setNearbyListVisible(false);
  }

  function handleFinish() {
    void reportNearbyWalkerLeave();
    void leaveNearbySocial();
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
          <View style={styles.topBar}>
            <Pressable
              style={[
                styles.nearbyListButton,
                !canUseNearbyWalkerAlerts && styles.nearbyListButtonDisabled,
              ]}
              onPress={() => setNearbyListVisible(true)}
              disabled={!canUseNearbyWalkerAlerts}
            >
              <Text style={styles.nearbyListButtonText}>근처</Text>
              {nearbyWalkers.length > 0 ? (
                <View style={styles.nearbyListBadge}>
                  <Text style={styles.nearbyListBadgeText}>
                    {nearbyWalkers.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <WalkNearbyAlertsToggle
              value={nearbyWalkerAlertsOn}
              onValueChange={setNearbyWalkerAlerts}
              disabled={!canUseNearbyWalkerAlerts}
            />
          </View>

          <View style={styles.walkTimeBlock}>
            <Text style={styles.elapsedLabel}>걷기 시간</Text>
            <Text style={styles.elapsedText} numberOfLines={1}>
              {formatDuration(elapsedSeconds)}
            </Text>
          </View>

          {cheerBubbleVisible ? (
            <View style={styles.cheerBubble}>
              <Text style={styles.cheerBubbleText}>{cheerMessage}</Text>
              <View style={styles.cheerBubbleTail} />
            </View>
          ) : null}
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.statsLine}>
            {formatNumber(distanceKm)} km · {steps.toLocaleString()}보 ·{' '}
            {Math.round(calories)} kcal
          </Text>

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

      <NearbyWalkersListModal
        visible={nearbyListVisible}
        walkers={nearbyWalkers}
        onClose={() => setNearbyListVisible(false)}
        onKnock={(walker) => void handleKnockWalker(walker)}
        knockingUserId={knockingUserId}
        waitingKnockUserId={
          outgoingKnock?.status === 'pending' ? outgoingKnock.toUserId : null
        }
        chattingPeerIds={chattingPeerIds}
        onOpenChat={openChatForPeer}
        myProfile={dogState.user}
      />

      <NearbyWalkerIncomingKnockModal
        visible={incomingKnockVisible && !!pendingIncomingKnock}
        knock={pendingIncomingKnock}
        onAccept={() => void handleAcceptIncomingKnock()}
        onDecline={() => void handleDeclineIncomingKnock()}
        busy={incomingKnockBusy}
      />

      <NearbyWalkerChatModal
        visible={chatVisible}
        session={activeChatSession}
        myUserId={myUserId}
        onClose={() => setChatVisible(false)}
        onSend={handleSendChatMessage}
        sending={chatSending}
      />
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
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nearbyListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  nearbyListButtonDisabled: {
    opacity: 0.5,
  },
  nearbyListButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  nearbyListBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyListBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#111',
  },
  walkTimeBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  elapsedLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  elapsedText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 62,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  cheerBubble: {
    marginTop: 14,
    maxWidth: '88%',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cheerBubbleText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#2B211C',
    textAlign: 'center',
  },
  cheerBubbleTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    transform: [{ rotate: '45deg' }],
  },
  bottomSection: { alignItems: 'center', width: '100%' },
  statsLine: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 340,
  },
  buttonWrapper: { flex: 1 },
  buttonGap: { width: 12 },
});