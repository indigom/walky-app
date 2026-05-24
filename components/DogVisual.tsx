import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, InteractionManager, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import {
  ANDROID_SIMPLE_VIDEO,
  VIDEO_SURFACE_TYPE,
} from '../utils/dogVisualPlatform';

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
  const videoLoopRef = useRef(videoLoop);
  const videoPathRef = useRef(videoPath);
  const actionPathRef = useRef(actionPath);
  const lastLoadedBasePathRef = useRef<string | null>(null);

  videoLoopRef.current = videoLoop;
  videoPathRef.current = videoPath;
  actionPathRef.current = actionPath;

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
    if (ANDROID_SIMPLE_VIDEO) {
      return basePlayerA;
    }
    return activeBaseSlotRef.current === 'A' ? basePlayerA : basePlayerB;
  }, [basePlayerA, basePlayerB]);

  const dissolveToActionLayer = useCallback(
    (
      on: boolean,
      done?: ({ finished }: { finished: boolean }) => void
    ) => {
      if (ANDROID_SIMPLE_VIDEO) {
        Animated.timing(actionOpacityAnim, {
          toValue: on ? 1 : 0,
          duration: DISSOLVE_MS,
          useNativeDriver: true,
        }).start(done);
        return;
      }

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

  const ensureBasePlaying = useCallback(
    (player: VideoPlayer, loop: boolean) => {
      try {
        player.muted = muted;
        player.loop = loop;
        if (!player.playing) {
          player.play();
        }
      } catch (e) {
        console.log('DogVisual ensureBasePlaying', e);
      }
    },
    [muted]
  );

  const clearActionPlayer = useCallback(() => {
    try {
      actionPlayer.pause();
      actionPlayer.currentTime = 0;
      if (!ANDROID_SIMPLE_VIDEO) {
        actionPlayer.replace(EMPTY_SOURCE);
      }
    } catch (e) {
      console.log('DogVisual clear action player', e);
    }
  }, [actionPlayer]);

  const shouldReloadBase = useCallback(
    (path: string, forceReload: boolean, player: VideoPlayer) => {
      if (!forceReload) return false;
      if (!ANDROID_SIMPLE_VIDEO) return true;
      if (lastLoadedBasePathRef.current !== path) return true;
      if (player.status !== 'readyToPlay') return true;
      return !player.playing;
    },
    []
  );

  const runBaseOpacityCrossfade = useCallback(
    (
      fromSlot: BaseSlot,
      toSlot: BaseSlot,
      gen: number,
      newPath: string,
      loop: boolean,
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

        const playerIn = toSlot === 'A' ? basePlayerA : basePlayerB;
        if (shouldPlay) {
          ensureBasePlaying(playerIn, loop);
        } else {
          try {
            playerIn.pause();
          } catch {}
        }
      });
    },
    [baseOpacityA, baseOpacityB, basePlayerA, basePlayerB, ensureBasePlaying]
  );

  const crossfadeBaseVideo = useCallback(
    (newPath: string, loop: boolean) => {
      const shouldPlay = isScreenActive && !actionPath;

      if (ANDROID_SIMPLE_VIDEO) {
        const player = basePlayerA;
        activeBaseSlotRef.current = 'A';
        baseOpacityA.setValue(1);
        baseOpacityB.setValue(0);

        void (async () => {
          try {
            loadBaseOnPlayer(player, newPath, loop, false);
            await waitForBaseReady(player);
            if (!isMountedRef.current) return;
            if (actionPathRef.current) return;
            prevVideoPathRef.current = newPath;
            lastLoadedBasePathRef.current = newPath;
            if (shouldPlay) {
              ensureBasePlaying(player, loop);
            }
          } catch (e) {
            console.log('DogVisual android base switch', e);
          }
        })();
        return;
      }

      const fromSlot = activeBaseSlotRef.current;
      const toSlot: BaseSlot = fromSlot === 'A' ? 'B' : 'A';
      const playerIn = toSlot === 'A' ? basePlayerA : basePlayerB;

      const gen = ++crossfadeGenRef.current;
      baseCrossfadeAnimRef.current?.stop();

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
          ensureBasePlaying(playerIn, loop);
        }

        runBaseOpacityCrossfade(fromSlot, toSlot, gen, newPath, loop, shouldPlay);
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
      ensureBasePlaying,
    ]
  );

  const resumeBasePlayback = useCallback(
    (forceReload = true, ignoreAction = false) => {
      const path = videoPathRef.current;
      const loop = videoLoopRef.current;
      if (!path || !isScreenActive) return;
      if (!ignoreAction && actionPathRef.current) return;

      const active = getActiveBasePlayer();
      const reload = shouldReloadBase(path, forceReload, active);

      const run = () => {
        void (async () => {
          try {
            if (!ANDROID_SIMPLE_VIDEO) {
              baseStackOpacityAnim.setValue(1);
            }

            if (reload) {
              loadBaseOnPlayer(active, path, loop, false);
              await waitForBaseReady(active);
              lastLoadedBasePathRef.current = path;
            }

            if (!isMountedRef.current || actionPathRef.current) return;
            ensureBasePlaying(active, loop);
          } catch (e) {
            console.log('DogVisual resume base', e);
          }
        })();
      };

      if (ANDROID_SIMPLE_VIDEO && !reload) {
        run();
      } else if (ANDROID_SIMPLE_VIDEO) {
        InteractionManager.runAfterInteractions(run);
      } else {
        run();
      }
    },
    [
      isScreenActive,
      getActiveBasePlayer,
      loadBaseOnPlayer,
      waitForBaseReady,
      baseStackOpacityAnim,
      ensureBasePlaying,
      shouldReloadBase,
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
      } else if (videoPath) {
        resumeBasePlayback(false);
      }
    } catch (e) {
      console.log('DogVisual resume', e);
    }
  }, [
    isScreenActive,
    actionPath,
    videoPath,
    basePlayerA,
    basePlayerB,
    actionPlayer,
    muted,
    resumeBasePlayback,
  ]);

  useEffect(() => {
    if (!videoPath) return;

    const shouldPlayBase = isScreenActive && !actionPath;
    const prev = prevVideoPathRef.current;

    try {
      if (actionPath) {
        if (!ANDROID_SIMPLE_VIDEO) {
          try {
            basePlayerA.pause();
            basePlayerB.pause();
          } catch {}
        }
        prevVideoPathRef.current = videoPath;
        return;
      }

      if (prev === null) {
        activeBaseSlotRef.current = 'A';
        baseOpacityA.setValue(1);
        baseOpacityB.setValue(0);
        loadBaseOnPlayer(basePlayerA, videoPath, videoLoop, shouldPlayBase);
        lastLoadedBasePathRef.current = videoPath;
        if (!ANDROID_SIMPLE_VIDEO) {
          try {
            basePlayerB.pause();
          } catch {}
        }
        prevVideoPathRef.current = videoPath;
        return;
      }

      if (prev === videoPath) {
        if (shouldPlayBase) {
          resumeBasePlayback(false);
        }
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
    loadBaseOnPlayer,
    resumeBasePlayback,
  ]);

  useEffect(() => {
    if (prevReplayKeyRef.current === videoReplayKey) return;
    prevReplayKeyRef.current = videoReplayKey;

    if (!videoPath || !isScreenActive || actionPath) return;

    resumeBasePlayback(!ANDROID_SIMPLE_VIDEO);
  }, [videoReplayKey, videoPath, isScreenActive, actionPath, resumeBasePlayback]);

  useEffect(() => {
    if (!actionPath) {
      clearActionPlayer();

      if (isEndingActionRef.current) {
        isEndingActionRef.current = false;
        return;
      }

      dissolveToActionLayer(false, ({ finished }) => {
        if (!finished || !isMountedRef.current) return;
        resumeBasePlayback(!ANDROID_SIMPLE_VIDEO);
      });

      return;
    }

    isEndingActionRef.current = false;

    try {
      actionPlayer.replace({ uri: actionPath });
      actionPlayer.currentTime = 0;
      actionPlayer.loop = actionLoop;
      actionPlayer.muted = muted;

      if (!ANDROID_SIMPLE_VIDEO) {
        basePlayerA.pause();
        basePlayerB.pause();
      }

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
    resumeBasePlayback,
    clearActionPlayer,
  ]);

  useEffect(() => {
    const subscription = actionPlayer.addListener('playToEnd', () => {
      if (!actionPath || actionLoop || isEndingActionRef.current) return;

      isEndingActionRef.current = true;

      const finishActionEnd = () => {
        if (!isMountedRef.current) {
          isEndingActionRef.current = false;
          return;
        }

        clearActionPlayer();
        resumeBasePlayback(false, true);
        isEndingActionRef.current = false;
        onActionEnd?.();
      };

      if (ANDROID_SIMPLE_VIDEO) {
        actionOpacityAnim.setValue(0);
        finishActionEnd();
        return;
      }

      dissolveToActionLayer(false, ({ finished }) => {
        if (!finished) {
          isEndingActionRef.current = false;
          return;
        }
        finishActionEnd();
      });
    });

    return () => subscription.remove();
  }, [
    actionPlayer,
    actionPath,
    actionLoop,
    onActionEnd,
    dissolveToActionLayer,
    resumeBasePlayback,
    clearActionPlayer,
  ]);

  useEffect(() => {
    const restartIfLooping = (slot: BaseSlot) => {
      if (!videoLoopRef.current || actionPathRef.current) return;
      if (!ANDROID_SIMPLE_VIDEO && activeBaseSlotRef.current !== slot) {
        return;
      }

      const player =
        ANDROID_SIMPLE_VIDEO || slot === 'A' ? basePlayerA : basePlayerB;
      try {
        player.currentTime = 0;
        player.loop = videoLoopRef.current;
        player.play();
      } catch (e) {
        console.log('DogVisual base loop restart', e);
      }
    };

    const subA = basePlayerA.addListener('playToEnd', () => restartIfLooping('A'));
    const subB = basePlayerB.addListener('playToEnd', () => {
      if (!ANDROID_SIMPLE_VIDEO) {
        restartIfLooping('B');
      }
    });

    return () => {
      subA.remove();
      subB.remove();
    };
  }, [basePlayerA, basePlayerB, videoLoop]);

  useEffect(() => {
    const onAmbientClipEnd = (slot: BaseSlot) => {
      if (videoLoopRef.current || actionPathRef.current) return;
      if (!ANDROID_SIMPLE_VIDEO && activeBaseSlotRef.current !== slot) {
        return;
      }

      onVideoEnd?.();
      if (videoPathRef.current && isScreenActive) {
        resumeBasePlayback(!ANDROID_SIMPLE_VIDEO, true);
      }
    };

    const subA = basePlayerA.addListener('playToEnd', () => onAmbientClipEnd('A'));
    const subB = basePlayerB.addListener('playToEnd', () => {
      if (!ANDROID_SIMPLE_VIDEO) {
        onAmbientClipEnd('B');
      }
    });

    return () => {
      subA.remove();
      subB.remove();
    };
  }, [basePlayerA, basePlayerB, isScreenActive, onVideoEnd, resumeBasePlayback]);

  /** Android: 액션 중이 아닐 때만, 베이스가 멈춘 경우에만 재개 */
  useEffect(() => {
    if (!ANDROID_SIMPLE_VIDEO) return;

    const player = basePlayerA;
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying || actionPathRef.current) return;
      if (!videoPathRef.current || !isScreenActive) return;
      if (player.status !== 'readyToPlay') return;
      ensureBasePlaying(player, videoLoopRef.current);
    });

    return () => sub.remove();
  }, [basePlayerA, isScreenActive, ensureBasePlaying]);

  const videoViewProps = {
    style: styles.video,
    contentFit: 'cover' as const,
    nativeControls: false,
    allowsFullscreen: false,
    allowsPictureInPicture: false,
    ...(VIDEO_SURFACE_TYPE ? { surfaceType: VIDEO_SURFACE_TYPE } : {}),
  };

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
          <VideoView player={basePlayerA} {...videoViewProps} />
        </Animated.View>

        {!ANDROID_SIMPLE_VIDEO ? (
          <Animated.View
            style={[styles.layer, { opacity: baseOpacityB }]}
            pointerEvents="none"
          >
            <VideoView player={basePlayerB} {...videoViewProps} />
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View
        style={[styles.layer, { opacity: actionOpacityAnim }]}
        pointerEvents="none"
      >
        <VideoView player={actionPlayer} {...videoViewProps} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: StyleSheet.absoluteFillObject,
  layer: StyleSheet.absoluteFillObject,
  video: StyleSheet.absoluteFillObject,
});
