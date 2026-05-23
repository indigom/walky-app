import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

type Props = {
  videoPath: string | null;
  videoLoop?: boolean;
  videoReplayKey?: number;
  actionPath?: string | null;
  actionLoop?: boolean;
  actionReplayKey?: number;
  isScreenActive?: boolean;
  muted?: boolean;
  onActionEnd?: () => void;
  onVideoEnd?: () => void;
};

const EMPTY_SOURCE = { uri: '' };
const DISSOLVE_MS = 480;

type BaseSlot = 'A' | 'B';

export function DogVisual({
  videoPath,
  videoLoop = true,
  videoReplayKey = 0,
  actionPath,
  actionLoop = false,
  actionReplayKey = 0,
  isScreenActive = true,
  muted = true,
  onActionEnd,
  onVideoEnd,
}: Props) {
  const baseStackOpacityAnim = useRef(new Animated.Value(1)).current;
  const baseOpacityA = useRef(new Animated.Value(1)).current;
  const baseOpacityB = useRef(new Animated.Value(0)).current;
  const actionOpacityAnim = useRef(new Animated.Value(0)).current;

  const isMountedRef = useRef(true);
  const isEndingActionRef = useRef(false);
  const activeBaseSlotRef = useRef<BaseSlot>('A');
  const prevVideoPathRef = useRef<string | null>(null);
  const crossfadeGenRef = useRef(0);
  const baseCrossfadeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevReplayKeyRef = useRef(videoReplayKey);

  /** 소스는 effect에서만 replace — hook 인자에 videoPath 넣으면 전환 시 끊김 */
  const basePlayerA = useVideoPlayer(EMPTY_SOURCE, (player) => {
    player.loop = videoLoop;
    player.muted = muted;
    player.pause();
  });

  const basePlayerB = useVideoPlayer(EMPTY_SOURCE, (player) => {
    player.loop = videoLoop;
    player.muted = muted;
    player.pause();
  });

  const actionPlayer = useVideoPlayer(EMPTY_SOURCE, (player) => {
    player.loop = actionLoop;
    player.muted = muted;
    player.pause();
  });

  const getActiveBasePlayer = useCallback(() => {
    return activeBaseSlotRef.current === 'A' ? basePlayerA : basePlayerB;
  }, [basePlayerA, basePlayerB]);

  const getInactiveBasePlayer = useCallback(() => {
    return activeBaseSlotRef.current === 'A' ? basePlayerB : basePlayerA;
  }, [basePlayerA, basePlayerB]);

  const dissolveToActionLayer = useCallback(
    (
      on: boolean,
      done?: ({ finished }: { finished: boolean }) => void
    ) => {
      Animated.parallel([
        Animated.timing(baseStackOpacityAnim, {
          toValue: on ? 0 : 1,
          duration: DISSOLVE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(actionOpacityAnim, {
          toValue: on ? 1 : 0,
          duration: DISSOLVE_MS,
          useNativeDriver: true,
        }),
      ]).start(done);
    },
    [baseStackOpacityAnim, actionOpacityAnim]
  );

  type VideoPlayer = ReturnType<typeof useVideoPlayer>;

  const loadBaseOnPlayer = useCallback(
    (
      player: VideoPlayer,
      path: string,
      loop: boolean,
      shouldPlay: boolean
    ) => {
      player.replace({ uri: path });
      player.currentTime = 0;
      player.loop = loop;
      player.muted = muted;

      if (shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    },
    [muted]
  );

  const waitForBaseReady = useCallback(
    (player: VideoPlayer, timeoutMs = 2500) =>
      new Promise<void>((resolve) => {
        if (player.status === 'readyToPlay') {
          resolve();
          return;
        }

        const sub = player.addListener('statusChange', ({ status }) => {
          if (status === 'readyToPlay') {
            sub.remove();
            resolve();
          }
        });

        setTimeout(() => {
          sub.remove();
          resolve();
        }, timeoutMs);
      }),
    []
  );

  const runBaseOpacityCrossfade = useCallback(
    (
      fromSlot: BaseSlot,
      toSlot: BaseSlot,
      gen: number,
      newPath: string,
      shouldPlay: boolean
    ) => {
      const fadeOut = fromSlot === 'A' ? baseOpacityA : baseOpacityB;
      const fadeIn = toSlot === 'A' ? baseOpacityA : baseOpacityB;
      const playerOut = fromSlot === 'A' ? basePlayerA : basePlayerB;

      baseCrossfadeAnimRef.current = Animated.parallel([
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: DISSOLVE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: DISSOLVE_MS,
          useNativeDriver: true,
        }),
      ]);

      baseCrossfadeAnimRef.current.start(({ finished }) => {
        if (!finished || gen !== crossfadeGenRef.current) return;

        activeBaseSlotRef.current = toSlot;
        prevVideoPathRef.current = newPath;

        try {
          playerOut.pause();
        } catch (e) {
          console.log('DogVisual base crossfade pause out', e);
        }

        if (!shouldPlay) {
          try {
            const playerIn = toSlot === 'A' ? basePlayerA : basePlayerB;
            playerIn.pause();
          } catch {}
        }
      });
    },
    [baseOpacityA, baseOpacityB, basePlayerA, basePlayerB]
  );

  const crossfadeBaseVideo = useCallback(
    (newPath: string, loop: boolean) => {
      const fromSlot = activeBaseSlotRef.current;
      const toSlot: BaseSlot = fromSlot === 'A' ? 'B' : 'A';
      const playerIn = toSlot === 'A' ? basePlayerA : basePlayerB;

      const gen = ++crossfadeGenRef.current;
      baseCrossfadeAnimRef.current?.stop();

      const shouldPlay = isScreenActive && !actionPath;

      void (async () => {
        try {
          loadBaseOnPlayer(playerIn, newPath, loop, false);
          await waitForBaseReady(playerIn);
        } catch (e) {
          console.log('DogVisual base crossfade load', e);
          return;
        }

        if (gen !== crossfadeGenRef.current) return;

        if (shouldPlay) {
          try {
            playerIn.play();
          } catch (e) {
            console.log('DogVisual base crossfade play', e);
          }
        }

        runBaseOpacityCrossfade(fromSlot, toSlot, gen, newPath, shouldPlay);
      })();
    },
    [
      basePlayerA,
      basePlayerB,
      isScreenActive,
      actionPath,
      loadBaseOnPlayer,
      waitForBaseReady,
      runBaseOpacityCrossfade,
    ]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      baseCrossfadeAnimRef.current?.stop();
      try {
        actionPlayer.pause();
        actionPlayer.currentTime = 0;
        basePlayerA.pause();
        basePlayerB.pause();
      } catch (e) {
        console.log('DogVisual cleanup', e);
      }
    };
  }, [actionPlayer, basePlayerA, basePlayerB]);

  useEffect(() => {
    if (!isScreenActive) {
      try {
        basePlayerA.pause();
        basePlayerB.pause();
        actionPlayer.pause();
      } catch (e) {
        console.log('DogVisual suspend', e);
      }
      return;
    }

    try {
      basePlayerA.muted = muted;
      basePlayerB.muted = muted;
      actionPlayer.muted = muted;

      if (actionPath) {
        actionPlayer.play();
      }
    } catch (e) {
      console.log('DogVisual resume', e);
    }
  }, [isScreenActive, actionPath, basePlayerA, basePlayerB, actionPlayer, muted]);

  /** 베이스 소스 교체 — ambient idle ↔ hungry 등은 크로스디졸브 */
  useEffect(() => {
    if (!videoPath) return;

    const shouldPlayBase = isScreenActive && !actionPath;
    const prev = prevVideoPathRef.current;

    try {
      if (actionPath) {
        loadBaseOnPlayer(getActiveBasePlayer(), videoPath, videoLoop, false);
        prevVideoPathRef.current = videoPath;
        return;
      }

      if (prev === null) {
        activeBaseSlotRef.current = 'A';
        baseOpacityA.setValue(1);
        baseOpacityB.setValue(0);
        loadBaseOnPlayer(basePlayerA, videoPath, videoLoop, shouldPlayBase);
        try {
          basePlayerB.pause();
        } catch {}
        prevVideoPathRef.current = videoPath;
        return;
      }

      if (prev === videoPath) {
        const active = getActiveBasePlayer();
        active.loop = videoLoop;
        active.muted = muted;
        return;
      }

      crossfadeBaseVideo(videoPath, videoLoop);
    } catch (e) {
      console.log('DogVisual base load', e);
    }
  }, [
    videoPath,
    videoLoop,
    muted,
    basePlayerA,
    basePlayerB,
    isScreenActive,
    actionPath,
    baseOpacityA,
    baseOpacityB,
    crossfadeBaseVideo,
    getActiveBasePlayer,
    loadBaseOnPlayer,
  ]);

  /** videoReplayKey만 베이스 리플레이 — videoPath 변경은 crossfade가 처리 */
  useEffect(() => {
    if (prevReplayKeyRef.current === videoReplayKey) return;
    prevReplayKeyRef.current = videoReplayKey;

    if (!videoPath || !isScreenActive || actionPath) return;
    if (videoPath !== prevVideoPathRef.current) return;

    try {
      const active = getActiveBasePlayer();
      active.currentTime = 0;
      active.loop = videoLoop;
      active.play();
    } catch (e) {
      console.log('DogVisual base replay', e);
    }
  }, [
    videoReplayKey,
    videoPath,
    isScreenActive,
    actionPath,
    getActiveBasePlayer,
    videoLoop,
  ]);

  useEffect(() => {
    if (!actionPath) {
      isEndingActionRef.current = false;
      dissolveToActionLayer(false);

      try {
        actionPlayer.pause();
        actionPlayer.replace(EMPTY_SOURCE);
        actionPlayer.currentTime = 0;
      } catch (e) {
        console.log('DogVisual clear action', e);
      }

      if (videoPath && isScreenActive && isMountedRef.current) {
        requestAnimationFrame(() => {
          try {
            const active = getActiveBasePlayer();
            active.loop = videoLoop;
            active.play();
          } catch {}
        });
      }

      return;
    }

    isEndingActionRef.current = false;

    try {
      actionPlayer.replace({ uri: actionPath });
      actionPlayer.currentTime = 0;
      actionPlayer.loop = actionLoop;
      actionPlayer.muted = muted;
      basePlayerA.pause();
      basePlayerB.pause();
      dissolveToActionLayer(true);

      if (isScreenActive) {
        actionPlayer.play();
      }
    } catch (e) {
      console.log('DogVisual action load', e);
    }
  }, [
    actionPath,
    actionLoop,
    actionReplayKey,
    actionPlayer,
    basePlayerA,
    basePlayerB,
    muted,
    isScreenActive,
    dissolveToActionLayer,
    videoPath,
    videoLoop,
    getActiveBasePlayer,
  ]);

  useEffect(() => {
    const subscription = actionPlayer.addListener('playToEnd', () => {
      if (!actionPath || actionLoop || isEndingActionRef.current) return;

      isEndingActionRef.current = true;

      dissolveToActionLayer(false, ({ finished }) => {
        if (!finished || !isMountedRef.current) return;

        try {
          actionPlayer.pause();
          actionPlayer.currentTime = 0;
          actionPlayer.replace(EMPTY_SOURCE);

          if (videoPath && isScreenActive) {
            const active = getActiveBasePlayer();
            active.currentTime = 0;
            active.loop = videoLoop;
            active.muted = muted;
            active.play();
          }
        } catch (e) {
          console.log('DogVisual action ended', e);
        }

        onActionEnd?.();
      });
    });

    return () => subscription.remove();
  }, [
    actionPlayer,
    actionPath,
    actionLoop,
    videoPath,
    videoLoop,
    muted,
    isScreenActive,
    onActionEnd,
    dissolveToActionLayer,
    getActiveBasePlayer,
  ]);

  useEffect(() => {
    const onEnd = () => {
      if (videoLoop) return;
      if (actionPath) return;
      onVideoEnd?.();
    };

    const subA = basePlayerA.addListener('playToEnd', () => {
      if (activeBaseSlotRef.current !== 'A') return;
      onEnd();
    });
    const subB = basePlayerB.addListener('playToEnd', () => {
      if (activeBaseSlotRef.current !== 'B') return;
      onEnd();
    });

    return () => {
      subA.remove();
      subB.remove();
    };
  }, [basePlayerA, basePlayerB, videoLoop, actionPath, onVideoEnd]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[styles.layer, { opacity: baseStackOpacityAnim }]}
        pointerEvents="none"
      >
        <Animated.View
          style={[styles.layer, { opacity: baseOpacityA }]}
          pointerEvents="none"
        >
          <VideoView
            player={basePlayerA}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>

        <Animated.View
          style={[styles.layer, { opacity: baseOpacityB }]}
          pointerEvents="none"
        >
          <VideoView
            player={basePlayerB}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[styles.layer, { opacity: actionOpacityAnim }]}
        pointerEvents="none"
      >
        <VideoView
          player={actionPlayer}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: StyleSheet.absoluteFillObject,
  layer: StyleSheet.absoluteFillObject,
  video: StyleSheet.absoluteFillObject,
});
