import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import { BreedSelectScreen } from './screens/BreedSelectScreen';
import { NameInputScreen } from './screens/NameInputScreen';
import { UserInfoScreen } from './screens/UserInfoScreen';
import { WalkHabitScreen } from './screens/WalkHabitScreen';
import { HomeScreen } from './screens/HomeScreen';
import { WalkScreen } from './screens/WalkScreen';
import {
  INSUFFICIENT_WALK_ENERGY_MESSAGE,
  WalkResultScreen,
} from './screens/WalkResultScreen';
import { PostWalkAdScreen } from './screens/PostWalkAdScreen';
import { RewardVideoScreen } from './screens/RewardVideoScreen';
import { SplashScreen } from './screens/SplashScreen';
import { WalkHistoryScreen } from './screens/WalkHistoryScreen';

import {
  loadLocalManifest,
  syncRemoteBreedAssets,
} from './assets/BreedAssetManager';
import { WALKY_ASSET_ORIGIN } from './constants/assetServer';
import { applyDogWallClockAndNotify } from './utils/dogWallClock';
import {
  applyForegroundAfterBackground,
  applyStoredBackgroundEmptyOnLaunch,
  markAppEnteredBackground,
} from './utils/dogBackgroundEmpty';
import { hasWalkHabitProfile } from './utils/walkHabitProfile';
import { syncDailyWalkReminderFromProfile } from './utils/walkReminderNotifications';

import type {
  Breed,
  DogState,
  UserProfile,
  WalkSummary,
  WalkRecord,
  RewardProgress,
  DogAssetManifest,
} from './types';

type RootStackParamList = {
  BreedSelect: undefined;
  NameInput: undefined;
  UserInfo: undefined;
  WalkHabit: undefined;
  Home: undefined;
  Walk: undefined;
  PostWalkAd: undefined;
  WalkResult: undefined;
  RewardVideo: undefined;
  WalkHistory: undefined;
};

type WalkResultScreenNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'WalkResult'
>;

type PostWalkAdScreenNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'PostWalkAd'
>;

function PostWalkAdRoute({
  navigation,
  walkSummary,
}: {
  navigation: PostWalkAdScreenNavigation;
  walkSummary: WalkSummary | null;
}) {
  useEffect(() => {
    if (walkSummary === null) {
      navigation.replace('Home');
    }
  }, [walkSummary, navigation]);

  if (!walkSummary) {
    return null;
  }

  return (
    <PostWalkAdScreen
      onContinue={() => navigation.replace('WalkResult')}
    />
  );
}

type TodayWalkTotal = {
  walkCount: number;
  durationSeconds: number;
  distanceKm: number;
  steps: number;
  calories: number;
};

type CurrentReward = {
  videoUrl: string;
  title: string;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const STORAGE_KEY = 'walky_dog_state';
const WALK_RECORDS_STORAGE_KEY = 'walky_walk_records';
const REWARD_PROGRESS_STORAGE_KEY = 'walky_reward_progress';
const DAILY_REWARD_UNLOCKS_STORAGE_KEY = 'walky_daily_reward_unlocks';

const DEV_ALWAYS_ONBOARDING = true;
const DAILY_REWARD_DISTANCE_KM = 5;

const INITIAL_DOG_STATE: DogState = {
  breed: null,
  name: '',
  user: null,

  mood: 80,
  energy: 40,
  hunger: 20,
  affection: 50,

  lastWalkAt: null,
  lastOpenedAt: null,
  lastBackgroundAt: null,
  homeForceEmptyRoom: false,
  hungerReachedMaxAt: null,
  energyReachedMaxAt: null,

  lastStatsTickAt: null,
  notifFed8hForLastFedAt: null,
  notifWalk24hForLastWalkAt: null,
};

function getDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** 예전 저장값(walkDesire) → energy 단일 스탯 */
function normalizeDogStateFromStorage(
  raw: Record<string, unknown>
): DogState {
  const legacy = raw as {
    walkDesire?: number;
    walkDesireReachedMaxAt?: string | null;
    energy?: number;
    energyReachedMaxAt?: string | null;
  };

  const merged: DogState = {
    ...INITIAL_DOG_STATE,
    ...(raw as DogState),
  };

  const legacyWalk = legacy.walkDesire;
  if (typeof legacyWalk === 'number' && Number.isFinite(legacyWalk)) {
    merged.energy = Math.max(merged.energy, legacyWalk);
  }

  merged.energyReachedMaxAt =
    legacy.energyReachedMaxAt ?? legacy.walkDesireReachedMaxAt ?? null;

  return merged;
}

function createWalkRecord(summary: WalkSummary): WalkRecord {
  const now = new Date();
  const endedAt = now.toISOString();

  const startedAt = new Date(
    now.getTime() - summary.durationSeconds * 1000
  ).toISOString();

  return {
    id: `${endedAt}_${Math.random().toString(36).slice(2, 8)}`,
    date: getDateKey(now),
    startedAt,
    endedAt,
    durationSeconds: summary.durationSeconds,
    distanceKm: summary.distanceKm,
    steps: summary.steps,
    calories: summary.calories,
  };
}

function getTodayTotal(records: WalkRecord[]): TodayWalkTotal {
  const today = getDateKey();
  const todayRecords = records.filter((record) => record.date === today);

  return todayRecords.reduce<TodayWalkTotal>(
    (total, record) => ({
      walkCount: total.walkCount + 1,
      durationSeconds: total.durationSeconds + record.durationSeconds,
      distanceKm: total.distanceKm + record.distanceKm,
      steps: total.steps + record.steps,
      calories: total.calories + record.calories,
    }),
    {
      walkCount: 0,
      durationSeconds: 0,
      distanceKm: 0,
      steps: 0,
      calories: 0,
    }
  );
}

function getNextRewardIndex(
  breed: string,
  rewardProgress: RewardProgress
): number {
  return (rewardProgress[breed] ?? 0) + 1;
}

function formatRewardIndex(index: number): string {
  return index.toString().padStart(3, '0');
}

function getRewardVideoUrl(breed: string, index: number): string {
  const rewardNumber = formatRewardIndex(index);
  return `${WALKY_ASSET_ORIGIN}/rewards/${breed}/${breed}_${rewardNumber}.mp4`;
}

function getRewardTitle(breed: string, index: number): string {
  if (breed === 'shiba') return `시바의 ${index}번째 에피소드`;
  if (breed === 'corgi') return `코기의 ${index}번째 에피소드`;
  if (breed === 'retriever') return `리트리버의 ${index}번째 에피소드`;

  return `Walky의 ${index}번째 에피소드`;
}

async function syncRemoteBreedManifestWithFallback(
  breed: Breed
): Promise<DogAssetManifest | null> {
  try {
    return await syncRemoteBreedAssets(breed);
  } catch {
    return await loadLocalManifest(breed);
  }
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const [initialRouteName, setInitialRouteName] =
    useState<keyof RootStackParamList>('BreedSelect');

  const [dogState, setDogState] = useState<DogState>(INITIAL_DOG_STATE);
  const [dogManifest, setDogManifest] =
    useState<DogAssetManifest | null>(null);

  const [walkSummary, setWalkSummary] = useState<WalkSummary | null>(null);
  const [walkRecords, setWalkRecords] = useState<WalkRecord[]>([]);
  const [rewardProgress, setRewardProgress] = useState<RewardProgress>({});
  const [dailyRewardUnlocks, setDailyRewardUnlocks] = useState<string[]>([]);
  const [currentReward, setCurrentReward] = useState<CurrentReward | null>(null);

  const dogBreedRef = useRef<Breed | null>(null);

  useEffect(() => {
    dogBreedRef.current = dogState.breed;
  }, [dogState.breed]);

  useEffect(() => {
    async function loadState() {
      try {
        if (DEV_ALWAYS_ONBOARDING) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          await AsyncStorage.removeItem(WALK_RECORDS_STORAGE_KEY);
          await AsyncStorage.removeItem(REWARD_PROGRESS_STORAGE_KEY);
          await AsyncStorage.removeItem(DAILY_REWARD_UNLOCKS_STORAGE_KEY);

          const ts = new Date().toISOString();
          setDogState({
            ...INITIAL_DOG_STATE,
            lastOpenedAt: ts,
            lastStatsTickAt: ts,
          });
          setDogManifest(null);
          setWalkRecords([]);
          setRewardProgress({});
          setDailyRewardUnlocks([]);
          setCurrentReward(null);
          setInitialRouteName('BreedSelect');
          return;
        }

        const storedDogState = await AsyncStorage.getItem(STORAGE_KEY);
        const storedWalkRecords = await AsyncStorage.getItem(
          WALK_RECORDS_STORAGE_KEY
        );
        const storedRewardProgress = await AsyncStorage.getItem(
          REWARD_PROGRESS_STORAGE_KEY
        );
        const storedDailyRewardUnlocks = await AsyncStorage.getItem(
          DAILY_REWARD_UNLOCKS_STORAGE_KEY
        );

        if (storedWalkRecords) setWalkRecords(JSON.parse(storedWalkRecords));
        if (storedRewardProgress) setRewardProgress(JSON.parse(storedRewardProgress));
        if (storedDailyRewardUnlocks) {
          setDailyRewardUnlocks(JSON.parse(storedDailyRewardUnlocks));
        }

        if (!storedDogState) {
          const ts = new Date().toISOString();
          setDogState({
            ...INITIAL_DOG_STATE,
            lastOpenedAt: ts,
            lastStatsTickAt: ts,
          });
          setInitialRouteName('BreedSelect');
          return;
        }

        const merged = normalizeDogStateFromStorage(
          JSON.parse(storedDogState) as Record<string, unknown>
        );
        const nowIso = new Date().toISOString();
        const parsedDogState: DogState = applyStoredBackgroundEmptyOnLaunch(
          {
            ...applyDogWallClockAndNotify(merged, nowIso),
            lastOpenedAt: nowIso,
          },
          nowIso
        );

        setDogState(parsedDogState);

        if (!parsedDogState.breed) {
          setInitialRouteName('BreedSelect');
          return;
        }

        const localManifest = await syncRemoteBreedManifestWithFallback(
          parsedDogState.breed
        );

        if (!localManifest) {
          setDogManifest(null);
          setInitialRouteName('BreedSelect');
          return;
        }

        setDogManifest(localManifest);

        if (!parsedDogState.name || parsedDogState.name.trim() === '') {
          setInitialRouteName('NameInput');
          return;
        }

        if (!parsedDogState.user) {
          setInitialRouteName('UserInfo');
          return;
        }

        if (!hasWalkHabitProfile(parsedDogState.user)) {
          setInitialRouteName('WalkHabit');
          return;
        }

        setInitialRouteName('Home');
      } catch {
        const ts = new Date().toISOString();
        setDogState({
          ...INITIAL_DOG_STATE,
          lastOpenedAt: ts,
          lastStatsTickAt: ts,
        });
        setDogManifest(null);
        setWalkRecords([]);
        setRewardProgress({});
        setDailyRewardUnlocks([]);
        setCurrentReward(null);
        setInitialRouteName('BreedSelect');
      } finally {
        setIsReady(true);
      }
    }

    loadState();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      const nowIso = new Date().toISOString();

      if (nextState === 'background' || nextState === 'inactive') {
        setDogState((prev) => markAppEnteredBackground(prev, nowIso));
        return;
      }

      if (nextState !== 'active') return;

      setDogState((prev) =>
        applyForegroundAfterBackground(
          applyDogWallClockAndNotify(prev, nowIso),
          nowIso
        )
      );

      const breed = dogBreedRef.current;
      if (!breed) return;

      void syncRemoteBreedManifestWithFallback(breed).then((manifest) => {
        if (manifest) {
          setDogManifest(manifest);
        }
      });
    });

    return () => sub.remove();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dogState)).catch(() => {});
  }, [dogState, isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (!hasWalkHabitProfile(dogState.user)) return;

    void syncDailyWalkReminderFromProfile(dogState.name, dogState.user);
  }, [
    isReady,
    dogState.name,
    dogState.user?.usualWalkHour,
    dogState.user?.usualWalkMinute,
    dogState.user?.targetWalkDistanceKm,
  ]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(
      WALK_RECORDS_STORAGE_KEY,
      JSON.stringify(walkRecords)
    ).catch(() => {});
  }, [walkRecords, isReady]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(
      REWARD_PROGRESS_STORAGE_KEY,
      JSON.stringify(rewardProgress)
    ).catch(() => {});
  }, [rewardProgress, isReady]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(
      DAILY_REWARD_UNLOCKS_STORAGE_KEY,
      JSON.stringify(dailyRewardUnlocks)
    ).catch(() => {});
  }, [dailyRewardUnlocks, isReady]);

  function hasTodayRewardUnlocked(): boolean {
    return dailyRewardUnlocks.includes(getDateKey());
  }

  function handleOpenRewardVideo(navigation: WalkResultScreenNavigation) {
    if (!dogState.breed) return;

    const today = getDateKey();
    const nextIndex = getNextRewardIndex(dogState.breed, rewardProgress);

    setCurrentReward({
      videoUrl: getRewardVideoUrl(dogState.breed, nextIndex),
      title: getRewardTitle(dogState.breed, nextIndex),
    });

    setRewardProgress((prev) => ({
      ...prev,
      [dogState.breed as string]: nextIndex,
    }));

    setDailyRewardUnlocks((prev) => {
      if (prev.includes(today)) return prev;
      return [...prev, today];
    });

    navigation.replace('RewardVideo');
  }

  async function handleBreedSelectComplete(breed: Breed) {
    const localManifest = await syncRemoteBreedManifestWithFallback(breed);
    setDogManifest(localManifest);
  }

  if (!isReady) return null;

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="BreedSelect">
          {({ navigation }) => (
            <BreedSelectScreen
              dogState={dogState}
              setDogState={setDogState}
              onComplete={async (breed: Breed) => {
                await handleBreedSelectComplete(breed);
                navigation.replace('NameInput');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="NameInput">
          {({ navigation }) => (
            <NameInputScreen
              onSubmit={(name) => {
                setDogState((prev) => ({
                  ...prev,
                  name,
                }));

                navigation.replace('UserInfo');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="UserInfo">
          {({ navigation }) => (
            <UserInfoScreen
              onSubmit={(data) => {
                setDogState((prev) => ({
                  ...prev,
                  user: {
                    ...(prev.user ?? {}),
                    age: data.age,
                    weightKg: data.weightKg,
                    heightCm: data.heightCm,
                    gender: data.gender,
                  },
                }));

                navigation.replace('WalkHabit');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="WalkHabit">
          {({ navigation }) => (
            <WalkHabitScreen
              onSubmit={(habit) => {
                setDogState((prev) => ({
                  ...prev,
                  user: {
                    ...(prev.user ?? {}),
                    usualWalkHour: habit.usualWalkHour,
                    usualWalkMinute: habit.usualWalkMinute,
                    targetWalkDistanceKm: habit.targetWalkDistanceKm,
                    nearbyWalkerAlerts: habit.nearbyWalkerAlerts,
                  },
                }));

                navigation.replace('Home');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Home">
          {({ navigation }) => (
            <HomeScreen
              dogState={dogState}
              setDogState={setDogState}
              dogManifest={dogManifest}
              todayTotal={getTodayTotal(walkRecords)}
              onOpenWalkHistory={() => navigation.navigate('WalkHistory')}
              onStartWalk={() => navigation.navigate('Walk')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Walk">
          {({ navigation }) => (
            <WalkScreen
              dogState={dogState}
              dogManifest={dogManifest}
              setDogState={setDogState}
              onDiscardWalk={() => navigation.replace('Home')}
              onFinishWalk={(summary) => {
                const newRecord = createWalkRecord(summary);

                setDogState((prev) => ({
                  ...prev,
                  lastWalkAt: newRecord.endedAt,
                }));

                setWalkRecords((prev) => [...prev, newRecord]);
                setWalkSummary(summary);

                navigation.replace('PostWalkAd');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PostWalkAd">
          {({ navigation }) => (
            <PostWalkAdRoute navigation={navigation} walkSummary={walkSummary} />
          )}
        </Stack.Screen>

        <Stack.Screen name="WalkResult">
          {({ navigation }) => {
            if (!walkSummary) return null;

            const todayTotal = getTodayTotal(walkRecords);
            const rewardUnlocked =
              todayTotal.distanceKm >= DAILY_REWARD_DISTANCE_KM &&
              !hasTodayRewardUnlocked();

            const targetKm = dogState.user?.targetWalkDistanceKm;
            const showInsufficientEnergy =
              typeof targetKm === 'number' &&
              targetKm > 0 &&
              walkSummary.distanceKm < targetKm;

            return (
              <WalkResultScreen
                dogState={dogState}
                summary={walkSummary}
                todayTotal={todayTotal}
                rewardUnlocked={rewardUnlocked}
                insufficientEnergyMessage={
                  showInsufficientEnergy
                    ? INSUFFICIENT_WALK_ENERGY_MESSAGE
                    : null
                }
                onPressReward={() => handleOpenRewardVideo(navigation)}
                onGoHome={() => {
                  setWalkSummary(null);
                  navigation.replace('Home');
                }}
              />
            );
          }}
        </Stack.Screen>

        <Stack.Screen name="RewardVideo">
          {({ navigation }) => {
            if (!dogState.breed) return null;

            const fallbackIndex = rewardProgress[dogState.breed] ?? 1;

            return (
              <RewardVideoScreen
                dogState={dogState}
                videoUrl={
                  currentReward?.videoUrl ??
                  getRewardVideoUrl(dogState.breed, fallbackIndex)
                }
                title={
                  currentReward?.title ??
                  getRewardTitle(dogState.breed, fallbackIndex)
                }
                onGoHome={() => {
                  setWalkSummary(null);
                  setCurrentReward(null);
                  navigation.replace('Home');
                }}
              />
            );
          }}
        </Stack.Screen>

        <Stack.Screen name="WalkHistory">
          {({ navigation }) => (
            <WalkHistoryScreen
              walkRecords={walkRecords}
              onGoHome={() => navigation.replace('Home')}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}