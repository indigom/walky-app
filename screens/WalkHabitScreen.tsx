import { useRef, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NearbyWalkerAlertsSwitch } from '../components/NearbyWalkerAlertsSwitch';
import { PrimaryButton } from '../components/PrimaryButton';
import { MEMBER_INFO_BG } from '../constants/memberInfoBackground';
import type { UserProfile } from '../types';
import { formatWalkTimeLabel } from '../utils/walkHabitProfile';

export type WalkHabitInput = {
  usualWalkHour: number;
  usualWalkMinute: number;
  targetWalkDistanceKm: number;
  nearbyWalkerAlerts: boolean;
};

type Props = {
  onSubmit: (habit: WalkHabitInput) => void;
};

export function WalkHabitScreen({ onSubmit }: Props) {
  const [hourText, setHourText] = useState('18');
  const [minuteText, setMinuteText] = useState('30');
  const [distanceText, setDistanceText] = useState('2');
  const [nearbyWalkerAlerts, setNearbyWalkerAlerts] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const minuteRef = useRef<TextInput>(null);
  const distanceRef = useRef<TextInput>(null);

  const hour = Number(hourText);
  const minute = Number(minuteText);
  const distanceKm = Number(distanceText);

  const isFormValid =
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59 &&
    Number.isFinite(distanceKm) &&
    distanceKm > 0 &&
    distanceKm <= 50;

  const previewTime =
    isFormValid && Number.isInteger(hour) && Number.isInteger(minute)
      ? formatWalkTimeLabel(hour, minute)
      : null;

  function handleSubmit() {
    Keyboard.dismiss();

    if (!isFormValid) {
      Alert.alert(
        '입력 확인',
        '산책 시간(0~23시, 0~59분)과 목표 거리(km)를 올바르게 입력해 주세요.'
      );
      return;
    }

    onSubmit({
      usualWalkHour: hour,
      usualWalkMinute: minute,
      targetWalkDistanceKm: distanceKm,
      nearbyWalkerAlerts,
    });
  }

  function scrollToY(y: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }, 150);
  }

  return (
    <ImageBackground
      source={MEMBER_INFO_BG}
      style={styles.root}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
              <Text style={styles.title}>평소 산책 습관</Text>
              <Text style={styles.subtitle}>
                주로 산책하는 시간과 거리를 알려주세요. 그 시간에 산책 알림을 보내 드릴게요.
              </Text>

              <View style={styles.section}>
                <Text style={styles.label}>산책 시간</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder="시 (0–23)"
                    placeholderTextColor="#888"
                    keyboardType="number-pad"
                    value={hourText}
                    onChangeText={setHourText}
                    maxLength={2}
                    returnKeyType="next"
                    onFocus={() => scrollToY(200)}
                    onSubmitEditing={() => minuteRef.current?.focus()}
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <TextInput
                    ref={minuteRef}
                    style={[styles.input, styles.timeInput]}
                    placeholder="분 (0–59)"
                    placeholderTextColor="#888"
                    keyboardType="number-pad"
                    value={minuteText}
                    onChangeText={setMinuteText}
                    maxLength={2}
                    returnKeyType="next"
                    onFocus={() => scrollToY(260)}
                    onSubmitEditing={() => distanceRef.current?.focus()}
                  />
                </View>
                {previewTime ? (
                  <Text style={styles.hint}>{previewTime} 경에 알림</Text>
                ) : null}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>목표 산책 거리 (km)</Text>
                <TextInput
                  ref={distanceRef}
                  style={styles.input}
                  placeholder="예: 2"
                  placeholderTextColor="#888"
                  keyboardType="decimal-pad"
                  value={distanceText}
                  onChangeText={setDistanceText}
                  returnKeyType="done"
                  onFocus={() => scrollToY(340)}
                  onSubmitEditing={handleSubmit}
                />
                <Text style={styles.hint}>
                  이번 산책이 목표보다 짧으면 결과 화면에서 안내해 드려요.
                </Text>
              </View>

              <View style={styles.section}>
                <NearbyWalkerAlertsSwitch
                  value={nearbyWalkerAlerts}
                  onValueChange={setNearbyWalkerAlerts}
                  lightDescription
                />
              </View>

                <View style={styles.buttonWrap}>
                  <PrimaryButton
                    label="완료"
                    onPress={handleSubmit}
                    disabled={!isFormValid}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 96,
  },
  content: { width: '100%' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  section: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: { flex: 1 },
  timeColon: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  input: {
    backgroundColor: '#fff',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 18,
  },
  buttonWrap: { marginTop: 12 },
});
