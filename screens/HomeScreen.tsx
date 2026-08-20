// src/screens/HomeScreen.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  Alert,
  Animated,
  AppState,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AppStateStatus,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { DogVisual } from '../components/DogVisual';
import { HealthIndexModal } from '../components/HealthIndexModal';

import {
  EMPTY_ROOM_DIALOGUE_INTERVAL_MS,
  getDogDialogue,
  getEmptyRoomDialogue,
  getIdleBridgeDialogue,
  getIdleLookDialogue,
  getNameCallDialogue,
} from '../utils/dogDialogue';
import { useDogDialoguesRevision } from '../utils/dogDialoguesPack';
import { applyDogWallClockAndNotify } from '../utils/dogWallClock';
import {
  configureLocalNotificationHandler,
  requestNotificationPermissionAsync,
} from '../utils/localNotifications';
import {
  pickHappyFile,
  resolveAmbientDogVideoState,
  resolveAmbientIdlePlayback,
  resolveAmbientPlayback,
  resolveDogVideoPlayback,
  resolveEmptyWakePlayback,
  type ResolvedPlayback,
} from '../assets/DogVideoResolver';

import type { DogState, DogAssetManifest, DogAction, WalkRecord } from '../types';
import { getBreedEmptyRoomImageSource } from '../constants/breedEmptyRoomImages';
import {
  FEED_POINT_COST,
  INSUFFICIENT_POINTS_MESSAGE,
} from '../constants/points';
import { ANDROID_SIMPLE_VIDEO } from '../utils/dogVisualPlatform';
import { useDogNameSpeechRecognition } from '../utils/useDogNameSpeechRecognition';
import {
  computeUserHealthIndex,
  healthIndexAccentColor,
} from '../utils/userHealthIndex';
import { getCombinedDogHappiness } from '../utils/dogHappiness';

type TodayWalkTotal = {
  walkCount: number;
  durationSeconds: number;
  distanceKm: number;
  steps: number;
  calories: number;
};

type Props = {
  dogState: DogState;
  setDogState: Dispatch<SetStateAction<DogState>>;
  onStartWalk: () => void;
  onOpenWalkHistory: () => void;
  onOpenSettings: () => void;
  todayTotal?: TodayWalkTotal;
  walkRecords?: WalkRecord[];
  dogManifest: DogAssetManifest | null;
};

type Heart = {
  id: string;
  x: number;
  y: number;
  delay: number;
  size: number;
};

function clampStat(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** 포그라운드 홈에서 무상호작용 시 look 재생까지 대기 */
const LOOK_AFTER_IDLE_MS = 30_000;

function getDefaultTodayTotal(): TodayWalkTotal {
  return {
    walkCount: 0,
    durationSeconds: 0,
    distanceKm: 0,
    steps: 0,
    calories: 0,
  };
}

function FloatingHeart({
  heart,
  onComplete,
}: {
  heart: Heart;
  onComplete: (id: string) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }).start(() => {
        onComplete(heart.id);
      });
    }, heart.delay);

    return () => clearTimeout(timer);
  }, [heart, onComplete, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -90],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.65, 1.12, 1],
  });

  return (
    <Animated.Text
      style={[
        styles.heart,
        {
          left: heart.x - heart.size / 2,
          top: heart.y - heart.size / 2,
          fontSize: heart.size,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      ❤️
    </Animated.Text>
  );
}

function StatusStatBadge({
  value,
  accentColor,
}: {
  value: number;
  accentColor?: string;
}) {
  return (
    <View style={styles.statusBadge}>
      <Text
        style={[
          styles.statusBadgeText,
          accentColor ? { color: accentColor } : null,
        ]}
      >
        {Math.round(value)}
      </Text>
    </View>
  );
}

export function HomeScreen({
  dogState,
  setDogState,
  onStartWalk,
  onOpenWalkHistory,
  onOpenSettings,
  todayTotal,
  walkRecords = [],
  dogManifest,
}: Props) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const dialogueRevision = useDogDialoguesRevision();

  const [appIsActive, setAppIsActive] = useState(
    () => AppState.currentState === 'active'
  );
  const [petTouchEpoch, setPetTouchEpoch] = useState(0);

  const [action, setAction] = useState<DogAction>(null);
  const [actionMeta, setActionMeta] = useState<ResolvedPlayback | null>(null);
  const [actionReplayKey, setActionReplayKey] = useState(0);
  const [videoReplayKey, setVideoReplayKey] = useState(0);
  const [ambientIdleBridge, setAmbientIdleBridge] = useState(false);
  /** emptyroom에서 깨운 뒤 배경을 idle 클립으로 고정 */
  const [preferIdleBaseAfterEmpty, setPreferIdleBaseAfterEmpty] = useState(false);
  const [emptyRoomDialogue, setEmptyRoomDialogue] = useState(() =>
    getEmptyRoomDialogue()
  );
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [healthModalVisible, setHealthModalVisible] = useState(false);
  const lastHeartTimeRef = useRef(0);
  const ambientReplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRef = useRef<DogAction>(null);
  const isFocusedRef = useRef(isFocused);
  const lookIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lookIdleEpoch, setLookIdleEpoch] = useState(0);
  const showEmptyRoomStillRef = useRef(false);

  const total = todayTotal ?? getDefaultTodayTotal();

  const userHealthIndex = useMemo(
    () =>
      computeUserHealthIndex(
        walkRecords,
        dogState.user?.targetWalkDistanceKm
      ),
    [walkRecords, dogState.user?.targetWalkDistanceKm]
  );

  const healthAccent = healthIndexAccentColor(userHealthIndex.score);

  const dogHappiness = useMemo(
    () => getCombinedDogHappiness(dogState.mood, dogState.affection),
    [dogState.mood, dogState.affection]
  );

  const walkPreviewText =
    total.walkCount === 0 ? '오늘은 아직 산책 기록이 없어요.' : null;

  const ambientState = useMemo(() => {
    if (!dogManifest || !dogState.breed) return null;
    return resolveAmbientDogVideoState(dogState);
  }, [dogState, dogManifest]);

  const ambientPlayback = useMemo(() => {
    if (!dogManifest || !dogState.breed) return null;
    return resolveAmbientPlayback(dogState, dogManifest);
  }, [dogState, dogManifest]);

  const idleBridgePlayback = useMemo(() => {
    if (!dogManifest || !dogState.breed) return null;
    return resolveAmbientIdlePlayback(dogState, dogManifest);
  }, [dogState, dogManifest]);

  const shouldCycleAmbient =
    ambientState === 'walkWantMedium' ||
    ambientState === 'walkWantStrong' ||
    ambientState === 'walkWantCritical' ||
    ambientState === 'walkIgnored3Days' ||
    ambientState === 'hungryMedium' ||
    ambientState === 'hungryStrong' ||
    ambientState === 'hungryCritical' ||
    ambientState === 'hungryIgnored3Days';

  const manifestHasEmptyClips = useMemo(() => {
    if (!dogManifest) return false;
    return (dogManifest.videos.empty?.length ?? 0) > 0;
  }, [dogManifest]);

  const manifestHasLookClips = useMemo(() => {
    if (!dogManifest) return false;
    return (dogManifest.videos.look?.length ?? 0) > 0;
  }, [dogManifest]);

  const canShowEmptyRoomAfterBackground = useMemo(() => {
    // 30분+ 복귀 시 wall clock으로 hunger/energy가 올라가 idle이 아닐 수 있음 — emptyroom은 그대로 표시
    return manifestHasEmptyClips && !!dogManifest && !!dogState.breed;
  }, [manifestHasEmptyClips, dogManifest, dogState.breed]);

  const homeForceEmptyRoom = dogState.homeForceEmptyRoom === true;

  /** 포그라운드 대기 중 자동 전환 없음 — 30분+ 백그라운드 복귀 시에만 */
  const showEmptyRoomStill =
    isFocused &&
    action === null &&
    homeForceEmptyRoom &&
    canShowEmptyRoomAfterBackground;

  const homeVideoActive = isFocused && appIsActive && !showEmptyRoomStill;

  useEffect(() => {
    showEmptyRoomStillRef.current = showEmptyRoomStill;
  }, [showEmptyRoomStill]);

  useEffect(() => {
    if (!showEmptyRoomStill || action !== null) return;

    setEmptyRoomDialogue(getEmptyRoomDialogue());
    const intervalId = setInterval(() => {
      setEmptyRoomDialogue(getEmptyRoomDialogue());
    }, EMPTY_ROOM_DIALOGUE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showEmptyRoomStill, action]);

  const voiceRecognitionEnabled =
    Platform.OS !== 'web' &&
    isFocused &&
    action === null &&
    !!dogManifest &&
    !!dogState.breed &&
    dogState.name.trim().length > 0;

  const handleVoiceNameMatched = useCallback(() => {
    if (actionRef.current !== null) return;
    bumpLookIdleTimer();
    if (showEmptyRoomStillRef.current) {
      startAction('emptyWake');
      return;
    }
    startAction('nameCall');
  }, []);

  useDogNameSpeechRecognition({
    enabled: voiceRecognitionEnabled,
    dogName: dogState.name,
    onNameMatched: handleVoiceNameMatched,
  });

  const canScheduleIdleLook = useMemo(() => {
    return (
      ambientState === 'idle' &&
      manifestHasLookClips &&
      !!dogManifest &&
      !!dogState.breed &&
      !showEmptyRoomStill
    );
  }, [
    ambientState,
    manifestHasLookClips,
    dogManifest,
    dogState.breed,
    showEmptyRoomStill,
  ]);

  function clearLongBackgroundEmpty() {
    setDogState((prev) =>
      prev.homeForceEmptyRoom ? { ...prev, homeForceEmptyRoom: false } : prev
    );
  }

  function clearLookIdleTimer() {
    if (lookIdleTimerRef.current) {
      clearTimeout(lookIdleTimerRef.current);
      lookIdleTimerRef.current = null;
    }
  }

  function bumpLookIdleTimer() {
    setLookIdleEpoch((epoch) => epoch + 1);
  }

  /** 백그라운드에서 영상·터치가 끊긴 뒤 홈을 다시 쓸 수 있게 복구 */
  function resumeHomeAfterForeground() {
    if (actionRef.current !== null) {
      setAction(null);
      setActionMeta(null);
    }

    setAmbientIdleBridge(false);
    setVideoReplayKey((prev) => prev + 1);
    setPetTouchEpoch((prev) => prev + 1);
    bumpLookIdleTimer();
  }

  const dialogue = useMemo(() => {
    if (action === 'pet') {
      return getDogDialogue(dogState, 'pet');
    }

    if (action === 'eat') {
      return getDogDialogue(dogState, 'eat');
    }

    if (action === 'nameCall' || action === 'emptyWake') {
      return getNameCallDialogue();
    }

    if (action === 'idleLook') {
      return getIdleLookDialogue();
    }

    if (showEmptyRoomStill) {
      return emptyRoomDialogue;
    }

    if (ambientIdleBridge && shouldCycleAmbient) {
      return getIdleBridgeDialogue();
    }

    return getDogDialogue(dogState, 'home');
  }, [
    dogState,
    action,
    ambientIdleBridge,
    shouldCycleAmbient,
    showEmptyRoomStill,
    emptyRoomDialogue,
    dialogueRevision,
  ]);

  const activeBasePlayback =
    preferIdleBaseAfterEmpty && idleBridgePlayback
      ? idleBridgePlayback
      : ambientIdleBridge && shouldCycleAmbient && idleBridgePlayback
        ? idleBridgePlayback
        : ambientPlayback;

  const videoPath = activeBasePlayback?.path ?? null;
  const baseLoop = activeBasePlayback?.loop ?? true;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    configureLocalNotificationHandler();
    void requestNotificationPermissionAsync();
  }, []);

  /** 산책 등 다른 화면에 있다가 홈으로 올 때, interval 대기 없이 즉시 경과 반영 */
  useEffect(() => {
    if (!isFocused) return;
    const nowIso = new Date().toISOString();
    setDogState((prev) => applyDogWallClockAndNotify(prev, nowIso));
    resumeHomeAfterForeground();
  }, [isFocused, setDogState]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      const active = nextState === 'active';
      setAppIsActive(active);

      if (!active || !isFocusedRef.current) return;

      resumeHomeAfterForeground();
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const nowIso = new Date().toISOString();
      setDogState((prev) => applyDogWallClockAndNotify(prev, nowIso));
    }, 30000);

    return () => clearInterval(intervalId);
  }, [setDogState]);

  useEffect(() => {
    if (!shouldCycleAmbient) {
      setAmbientIdleBridge(false);
      if (ambientReplayTimerRef.current) {
        clearTimeout(ambientReplayTimerRef.current);
        ambientReplayTimerRef.current = null;
      }
    }
  }, [shouldCycleAmbient]);

  useEffect(
    () => () => {
      if (ambientReplayTimerRef.current) {
        clearTimeout(ambientReplayTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(
    () => () => {
      clearLookIdleTimer();
    },
    []
  );

  function removeHeart(id: string) {
    setHearts((prev) => prev.filter((heart) => heart.id !== id));
  }

  function spawnHeartsAt(x: number, y: number) {
    const created: Heart[] = Array.from({ length: 4 }).map((_, index) => ({
      id: `${Date.now()}-${Math.random()}-${index}`,
      x: x + (Math.random() * 42 - 21),
      y: y + (Math.random() * 28 - 14),
      delay: index * 45,
      size: 18 + Math.random() * 9,
    }));

    setHearts((prev) => [...prev, ...created]);
  }

  function startAction(nextAction: DogAction) {
    if (!dogManifest || !nextAction || !dogState.breed) return;

    if (ambientReplayTimerRef.current) {
      clearTimeout(ambientReplayTimerRef.current);
      ambientReplayTimerRef.current = null;
    }
    setAmbientIdleBridge(false);

    if (nextAction !== 'emptyWake') {
      setPreferIdleBaseAfterEmpty(false);
    }

    clearLongBackgroundEmpty();

    if (nextAction === 'emptyWake') {
      const playback = resolveEmptyWakePlayback(dogState, dogManifest);
      if (!playback?.path) return;

      setPreferIdleBaseAfterEmpty(true);
      setAction('emptyWake');
      setActionMeta(playback);
      setActionReplayKey((prev) => prev + 1);
      setDogState((prev) => ({
        ...prev,
        homeForceEmptyRoom: false,
        lastInteractionAt: new Date().toISOString(),
        mood: clampStat(prev.mood + 3),
        affection: clampStat(prev.affection + 2),
      }));
      return;
    }

    const extras =
      nextAction === 'pet'
        ? {
            action: 'pet' as const,
            petHappyFile: pickHappyFile(dogManifest),
          }
        : nextAction === 'eat'
          ? { action: 'eat' as const }
          : nextAction === 'idleLook'
            ? { action: 'idleLook' as const }
            : { action: 'nameCall' as const };

    const playback = resolveDogVideoPlayback(dogState, dogManifest, extras);

    if (!playback?.path) {
      if (__DEV__ && nextAction === 'nameCall') {
        console.log(
          '[HomeScreen] nameCall: look clip missing — sync breed assets or add look02 to server manifest'
        );
      }
      return;
    }

    setAction(nextAction);
    setActionMeta(playback);

    setActionReplayKey((prev) => prev + 1);

    if (nextAction === 'pet') {
      setDogState((prev) => ({
        ...prev,
        lastInteractionAt: new Date().toISOString(),
      }));
    }

    if (nextAction === 'nameCall') {
      setDogState((prev) => ({
        ...prev,
        lastInteractionAt: new Date().toISOString(),
        mood: clampStat(prev.mood + 3),
        affection: clampStat(prev.affection + 2),
      }));
    }
  }

  useEffect(() => {
    clearLookIdleTimer();

    if (!isFocused || action !== null || !canScheduleIdleLook) {
      return;
    }

    lookIdleTimerRef.current = setTimeout(() => {
      lookIdleTimerRef.current = null;
      if (!isFocusedRef.current || actionRef.current !== null) return;
      startAction('idleLook');
    }, LOOK_AFTER_IDLE_MS);

    return () => clearLookIdleTimer();
  }, [isFocused, action, canScheduleIdleLook, lookIdleEpoch]);

  function triggerPetAction() {
    if (
      action === 'eat' ||
      action === 'nameCall' ||
      action === 'emptyWake' ||
      action === 'idleLook'
    ) {
      return;
    }

    bumpLookIdleTimer();
    clearLongBackgroundEmpty();

    if (action === 'pet') {
      setDogState((prev) => ({
        ...prev,
        mood: clampStat(prev.mood + 1),
        affection: clampStat(prev.affection + 1),
      }));

      return;
    }

    startAction('pet');

    setDogState((prev) => ({
      ...prev,
      mood: clampStat(prev.mood + 4),
      affection: clampStat(prev.affection + 3),
    }));
  }

  function handlePetStart(x: number, y: number) {
    if (
      action === 'eat' ||
      action === 'nameCall' ||
      action === 'emptyWake' ||
      action === 'idleLook'
    ) {
      return;
    }

    bumpLookIdleTimer();
    spawnHeartsAt(x, y);
    triggerPetAction();
    lastHeartTimeRef.current = Date.now();
  }

  function handlePetMove(x: number, y: number) {
    if (
      action === 'eat' ||
      action === 'nameCall' ||
      action === 'emptyWake' ||
      action === 'idleLook'
    ) {
      return;
    }

    const now = Date.now();

    if (now - lastHeartTimeRef.current < 120) {
      return;
    }

    spawnHeartsAt(x, y);
    triggerPetAction();
    lastHeartTimeRef.current = now;
  }

  function handleFeed() {
    if (action !== null) return;

    if ((dogState.points ?? 0) < FEED_POINT_COST) {
      Alert.alert('포인트 부족', INSUFFICIENT_POINTS_MESSAGE);
      return;
    }

    bumpLookIdleTimer();
    clearLongBackgroundEmpty();
    startAction('eat');

    setDogState((prev) => ({
      ...prev,
      hunger: clampStat(prev.hunger - 30),
      mood: clampStat(prev.mood + 5),
      affection: clampStat(prev.affection + 3),
      hungerReachedMaxAt: null,
      lastFedAt: new Date().toISOString(),
      points: Math.max(0, (prev.points ?? 0) - FEED_POINT_COST),
    }));
  }

  function handleActionEnd() {
    const endedAction = actionRef.current;

    setAction(null);
    setActionMeta(null);
    setAmbientIdleBridge(false);

    if (endedAction === 'emptyWake') {
      setPreferIdleBaseAfterEmpty(true);
      setDogState((prev) =>
        prev.homeForceEmptyRoom
          ? { ...prev, homeForceEmptyRoom: false }
          : prev
      );
    }

    setVideoReplayKey((prev) => prev + 1);
    bumpLookIdleTimer();
  }

  function handleAmbientVideoEnd() {
    if (!shouldCycleAmbient) return;
    if (ambientIdleBridge) return;
    if (action !== null) return;

    setAmbientIdleBridge(true);
    if (!ANDROID_SIMPLE_VIDEO) {
      setVideoReplayKey((prev) => prev + 1);
    }

    if (ambientReplayTimerRef.current) {
      clearTimeout(ambientReplayTimerRef.current);
    }

    ambientReplayTimerRef.current = setTimeout(() => {
      setAmbientIdleBridge(false);
      setVideoReplayKey((prev) => prev + 1);
      ambientReplayTimerRef.current = null;
    }, 5000);
  }

  function handleEmptyRoomTap() {
    if (actionRef.current !== null) return;
    if (!showEmptyRoomStill) return;
    bumpLookIdleTimer();
    startAction('emptyWake');
  }

  return (
    <View style={styles.container}>
      {dogManifest ? (
        <View style={StyleSheet.absoluteFillObject}>
          <DogVisual
            videoPath={videoPath}
            videoLoop={baseLoop}
            videoReplayKey={videoReplayKey}
            actionPath={actionMeta?.path ?? null}
            actionLoop={actionMeta?.loop ?? false}
            actionReplayKey={actionReplayKey}
            isScreenActive={homeVideoActive}
            muted={false}
            onActionEnd={handleActionEnd}
            onVideoEnd={handleAmbientVideoEnd}
          />
          {showEmptyRoomStill && dogState.breed && (
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={handleEmptyRoomTap}
              >
                <Image
                  source={getBreedEmptyRoomImageSource(dogState.breed)}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              </Pressable>
            )}
        </View>
      ) : (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>강아지 불러오는 중...</Text>
        </View>
      )}

      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.18)',
          'rgba(0,0,0,0.72)',
        ]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <View
        key={`pet-touch-${petTouchEpoch}`}
        style={styles.petTouchArea}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          handlePetStart(locationX, locationY);
        }}
        onResponderMove={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          handlePetMove(locationX, locationY);
        }}
      >
        {hearts.map((heart) => (
          <FloatingHeart key={heart.id} heart={heart} onComplete={removeHeart} />
        ))}
      </View>

      <Pressable
        style={[styles.settingsButton, { top: insets.top + 4 }]}
        onPress={onOpenSettings}
        hitSlop={12}
        accessibilityLabel="설정"
        accessibilityRole="button"
      >
        <Feather name="settings" size={22} color="#ffffff" />
      </Pressable>

      <View style={styles.feedColumn} pointerEvents="box-none">
        <View style={styles.pointsBadge} pointerEvents="none">
          <Text style={styles.pointsBadgeLabel}>P</Text>
          <Text style={styles.pointsBadgeValue}>
            {Math.max(0, Math.floor(dogState.points ?? 0))}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.feedButton,
            (action !== null ||
              (dogState.points ?? 0) < FEED_POINT_COST) &&
              styles.feedButtonDisabled,
          ]}
          activeOpacity={0.82}
          onPress={handleFeed}
          disabled={action !== null}
        >
          <Image
            source={require('../assets/images/feed-button.png')}
            style={styles.feedIcon}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.statusIconColumn} pointerEvents="box-none">
        <View style={styles.dogStatusGroup} pointerEvents="none">
          <View style={styles.statusIconItem}>
            <Image
              source={require('../assets/ui/status-mood.png')}
              style={styles.statusIcon}
              accessibilityLabel="강아지 행복"
            />
            <StatusStatBadge value={dogHappiness} />
          </View>

          <View style={styles.statusIconItem}>
            <Image
              source={require('../assets/ui/status-energy.png')}
              style={styles.statusIcon}
            />
            <StatusStatBadge value={dogState.energy} />
          </View>

          <View style={styles.statusIconItem}>
            <Image
              source={require('../assets/ui/status-hunger.png')}
              style={styles.statusIcon}
            />
            <StatusStatBadge value={dogState.hunger} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.healthIndexSection}
          activeOpacity={0.82}
          onPress={() => setHealthModalVisible(true)}
          accessibilityLabel="현재 건강지수"
          accessibilityRole="button"
        >
          <Text style={styles.healthIndexLabel}>현재 건강지수</Text>
          <View style={styles.statusIconItem}>
            <Image
              source={require('../assets/ui/status-affection.png')}
              style={styles.statusIcon}
            />
            <StatusStatBadge
              value={userHealthIndex.score}
              accentColor={healthAccent}
            />
          </View>
        </TouchableOpacity>
      </View>

      <HealthIndexModal
        visible={healthModalVisible}
        score={userHealthIndex.score}
        onClose={() => setHealthModalVisible(false)}
      />

      <View
        style={[
          styles.uiLayer,
          {
            paddingBottom:
              28 + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.topSection} pointerEvents="none">
          <Text style={styles.name}>{dogState.name}</Text>

          <View style={styles.dialogueBubble}>
            <Text style={styles.dialogueText}>{dialogue}</Text>
            <View style={styles.dialogueTail} />
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.walkSummaryCard}>
            <View style={styles.walkSummaryHeader}>
              <View style={styles.walkSummaryHeaderLeft}>
                <Text style={styles.walkSummaryTitle}>오늘의 산책</Text>
                {walkPreviewText ? (
                  <Text style={styles.walkSummaryPreview}>{walkPreviewText}</Text>
                ) : (
                  <Text style={styles.walkSummaryPreview}>
                    {total.walkCount}회 · {total.distanceKm.toFixed(1)}km ·{' '}
                    {Math.floor(total.durationSeconds / 60)}분
                  </Text>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={onOpenWalkHistory}
                style={styles.historyButton}
              >
                <Text style={styles.historyButtonText}>기록 자세히 보기</Text>
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton
            label="산책 가기"
            onPress={onStartWalk}
            style={styles.walkStartButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
  },
  petTouchArea: {
    position: 'absolute',
    left: '13%',
    right: '13%',
    top: '22%',
    bottom: '38%',
    zIndex: 30,
    elevation: 30,
  },
  heart: {
    position: 'absolute',
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
    elevation: 50,
  },
  feedColumn: {
    position: 'absolute',
    top: '50%',
    right: 22,
    marginTop: -64,
    alignItems: 'center',
    zIndex: 50,
    elevation: 50,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    minWidth: 54,
    justifyContent: 'center',
  },
  pointsBadgeLabel: {
    color: '#FFD86B',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 4,
    letterSpacing: 0.5,
  },
  pointsBadgeValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  feedButton: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedButtonDisabled: {
    opacity: 0.55,
  },
  feedIcon: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  uiLayer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    zIndex: 10,
  },
  topSection: {
    alignItems: 'center',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomSection: {
    width: '100%',
  },
  walkSummaryCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  walkSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walkSummaryHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  walkSummaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  walkSummaryPreview: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
  },
  historyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  walkStartButton: {
    backgroundColor: '#d5ec3b',
  },
  statusBox: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  status: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 5,
  },
  dialogueBubble: {
    position: 'relative',
    maxWidth: '88%',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  dialogueText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#2B211C',
    textAlign: 'center',
  },
  dialogueTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    transform: [{ rotate: '45deg' }],
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
  statusIconColumn: {
    position: 'absolute',
    top: 162,
    left: 22,
    width: 72,
    zIndex: 50,
    elevation: 50,
  },
  dogStatusGroup: {
    gap: 10,
  },
  healthIndexSection: {
    marginTop: 18,
    alignItems: 'center',
  },
  healthIndexLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 5,
    textAlign: 'center',
    lineHeight: 13,
  },
  statusIconItem: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 13,
  },
});