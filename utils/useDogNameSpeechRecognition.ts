import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

import {
  buildDogNameCallAliases,
  transcriptsMatchesDogCall,
} from './dogNameVoiceMatch';

const VOICE_LANG = 'ko-KR';
const VOICE_RESTART_DELAY_MS = 400;
/** 연속 매칭 방지 */
const MATCH_COOLDOWN_MS = 2500;

type VoiceControl = {
  start: () => Promise<void>;
  stop: () => void;
};

type Params = {
  enabled: boolean;
  dogName: string;
  onNameMatched: () => void;
};

function collectTranscripts(
  results: { transcript?: string }[] | undefined
): string[] {
  if (!results?.length) return [];
  const lines: string[] = [];
  for (const row of results) {
    const t = row?.transcript?.trim();
    if (t) lines.push(t);
  }
  return lines;
}

/**
 * 홈 포커스·idle일 때 STT. 이름 인식 시 onNameMatched (nameCall / emptyWake).
 * 네이티브 모듈 필요 — Expo Go에서는 동작하지 않습니다.
 */
export function useDogNameSpeechRecognition({
  enabled,
  dogName,
  onNameMatched,
}: Params) {
  const dogNameRef = useRef(dogName);
  const onNameMatchedRef = useRef(onNameMatched);
  const enabledRef = useRef(enabled);
  const voiceSessionConsumedRef = useRef(false);
  const voicePermDeniedNotifiedRef = useRef(false);
  const voiceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceControlRef = useRef<VoiceControl | null>(null);
  const lastMatchAtRef = useRef(0);

  useEffect(() => {
    dogNameRef.current = dogName;
  }, [dogName]);

  useEffect(() => {
    onNameMatchedRef.current = onNameMatched;
  }, [onNameMatched]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  function tryConsumeNameMatch(transcripts: string[], allowInterim: boolean) {
    if (!enabledRef.current) return;
    if (voiceSessionConsumedRef.current) return;

    const name = dogNameRef.current.trim();
    if (!name) return;

    const now = Date.now();
    if (now - lastMatchAtRef.current < MATCH_COOLDOWN_MS) return;

    for (const transcript of transcripts) {
      if (!transcriptsMatchesDogCall(transcript, name)) continue;

      lastMatchAtRef.current = now;
      voiceSessionConsumedRef.current = true;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // noop
      }
      onNameMatchedRef.current();
      return;
    }

    if (__DEV__ && allowInterim && transcripts.length > 0) {
      console.log('[voice] heard (no match):', transcripts.join(' | '), 'want:', name);
    }
  }

  useSpeechRecognitionEvent('result', (event) => {
    const transcripts = collectTranscripts(event.results);
    if (transcripts.length === 0) return;

    // Android continuous 모드에서는 isFinal이 잘 안 올 수 있어 interim도 허용
    if (event.isFinal) {
      tryConsumeNameMatch(transcripts, false);
      return;
    }

    tryConsumeNameMatch(transcripts, true);
  });

  useSpeechRecognitionEvent('end', () => {
    if (voiceSessionConsumedRef.current) return;
    if (!enabledRef.current) return;

    if (voiceRestartTimerRef.current) {
      clearTimeout(voiceRestartTimerRef.current);
    }
    voiceRestartTimerRef.current = setTimeout(() => {
      voiceRestartTimerRef.current = null;
      void voiceControlRef.current?.start();
    }, VOICE_RESTART_DELAY_MS);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (__DEV__) {
      console.log('[voice] error:', event.error, event.message);
    }
    if (event.error === 'not-allowed' && !voicePermDeniedNotifiedRef.current) {
      voicePermDeniedNotifiedRef.current = true;
      Alert.alert(
        '마이크·음성 인식',
        '강아지 이름을 불렀을 때 반응하려면 설정에서 마이크와 음성 인식 권한을 허용해 주세요.'
      );
    }
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      voiceControlRef.current = null;
      return;
    }

    const getStartOptions = (): ExpoSpeechRecognitionOptions => {
      const aliases = buildDogNameCallAliases(dogNameRef.current);
      return {
        lang: VOICE_LANG,
        interimResults: true,
        // Android: false면 발화마다 isFinal이 오고, end에서 다시 켭니다 (이름 부르기에 유리)
        continuous: Platform.OS === 'ios',
        maxAlternatives: 3,
        contextualStrings: aliases.length > 0 ? aliases : undefined,
        ...(Platform.OS === 'ios'
          ? {
              requiresOnDeviceRecognition: true,
              iosTaskHint: 'confirmation' as const,
            }
          : {}),
      };
    };

    const control: VoiceControl = {
      start: async () => {
        if (!enabledRef.current) return;

        if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
          if (__DEV__) {
            console.log('[voice] recognition not available on this device');
          }
          return;
        }

        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
          if (!voicePermDeniedNotifiedRef.current) {
            voicePermDeniedNotifiedRef.current = true;
            Alert.alert(
              '마이크·음성 인식',
              '강아지 이름을 불렀을 때 반응하려면 설정에서 마이크와 음성 인식 권한을 허용해 주세요.'
            );
          }
          return;
        }

        try {
          ExpoSpeechRecognitionModule.start(getStartOptions());
          if (__DEV__) {
            console.log('[voice] listening for:', dogNameRef.current.trim());
          }
        } catch (e) {
          if (__DEV__) {
            console.log('[voice] start failed:', e);
          }
        }
      },
      stop: () => {
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // noop
        }
      },
    };

    voiceControlRef.current = control;

    return () => {
      control.stop();
      voiceControlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      voiceSessionConsumedRef.current = false;
      if (voiceRestartTimerRef.current) {
        clearTimeout(voiceRestartTimerRef.current);
        voiceRestartTimerRef.current = null;
      }
      voiceControlRef.current?.stop();
      return;
    }

    voiceSessionConsumedRef.current = false;
    void voiceControlRef.current?.start();

    return () => {
      if (voiceRestartTimerRef.current) {
        clearTimeout(voiceRestartTimerRef.current);
        voiceRestartTimerRef.current = null;
      }
      voiceControlRef.current?.stop();
    };
  }, [enabled]);

  useEffect(
    () => () => {
      if (voiceRestartTimerRef.current) {
        clearTimeout(voiceRestartTimerRef.current);
      }
    },
    []
  );
}
