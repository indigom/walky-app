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

type VoiceControl = {
  start: () => Promise<void>;
  stop: () => void;
};

type Params = {
  enabled: boolean;
  dogName: string;
  onNameMatched: () => void;
};

/**
 * 홈 포커스·idle일 때 연속 STT. 이름 인식 시 onNameMatched (nameCall / emptyWake).
 * 네이티브 모듈 필요 — Expo Go에서는 no-op.
 */
export function useDogNameSpeechRecognition({
  enabled,
  dogName,
  onNameMatched,
}: Params) {
  const dogNameRef = useRef(dogName);
  const onNameMatchedRef = useRef(onNameMatched);
  const voiceSessionConsumedRef = useRef(false);
  const voicePermDeniedNotifiedRef = useRef(false);
  const voiceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceControlRef = useRef<VoiceControl | null>(null);

  useEffect(() => {
    dogNameRef.current = dogName;
  }, [dogName]);

  useEffect(() => {
    onNameMatchedRef.current = onNameMatched;
  }, [onNameMatched]);

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return;

    const name = dogNameRef.current.trim();
    if (!name) return;

    for (const result of event.results) {
      const transcript = result?.transcript ?? '';
      if (!transcriptsMatchesDogCall(transcript, name)) continue;

      voiceSessionConsumedRef.current = true;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // noop
      }
      onNameMatchedRef.current();
      return;
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (voiceSessionConsumedRef.current) return;
    if (!enabled) return;

    if (voiceRestartTimerRef.current) {
      clearTimeout(voiceRestartTimerRef.current);
    }
    voiceRestartTimerRef.current = setTimeout(() => {
      voiceRestartTimerRef.current = null;
      void voiceControlRef.current?.start();
    }, VOICE_RESTART_DELAY_MS);
  });

  useSpeechRecognitionEvent('error', (event) => {
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
        continuous: true,
        contextualStrings: aliases.length > 0 ? aliases : undefined,
      };
    };

    const control: VoiceControl = {
      start: async () => {
        if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return;

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
        } catch {
          // noop
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
