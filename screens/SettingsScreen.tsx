import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { NearbyWalkerAlertsSwitch } from '../components/NearbyWalkerAlertsSwitch';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProfilePhotoPickerSection } from '../components/ProfilePhotoPickerSection';
import {
  KEYBOARD_AVOIDING_BEHAVIOR,
  keyboardVerticalOffset,
  scrollPaddingBottom,
  USE_KEYBOARD_AVOIDING_VIEW,
} from '../constants/keyboardForm';
import type { DogState, UserProfile } from '../types';
import { persistProfilePhoto } from '../utils/profilePhotoStorage';
import {
  mergeProfileSyncIntoUser,
  syncUserProfileToServer,
} from '../utils/profileSync';
import { syncDailyWalkReminderFromProfile } from '../utils/walkReminderNotifications';
import { useKeyboardInset } from '../utils/useKeyboardInset';
import { useKeyboardVisible } from '../utils/useKeyboardVisible';
import { useScrollToField } from '../utils/useScrollToField';

type Props = {
  dogState: DogState;
  setDogState: Dispatch<SetStateAction<DogState>>;
  onClose: () => void;
};

export function SettingsScreen({ dogState, setDogState, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const keyboardVisible = useKeyboardVisible();
  const user = dogState.user;

  const [nickname, setNickname] = useState(user?.nickname?.trim() ?? '');
  const [age, setAge] = useState(user?.age != null ? String(user.age) : '');
  const [height, setHeight] = useState(
    user?.heightCm != null ? String(user.heightCm) : ''
  );
  const [weight, setWeight] = useState(
    user?.weightKg != null ? String(user.weightKg) : ''
  );
  const [gender, setGender] = useState<'male' | 'female'>(
    user?.gender ?? 'male'
  );
  const [hourText, setHourText] = useState(
    user?.usualWalkHour != null ? String(user.usualWalkHour) : '18'
  );
  const [minuteText, setMinuteText] = useState(
    user?.usualWalkMinute != null ? String(user.usualWalkMinute) : '30'
  );
  const [distanceText, setDistanceText] = useState(
    user?.targetWalkDistanceKm != null
      ? String(user.targetWalkDistanceKm)
      : '2'
  );
  const [nearbyWalkerAlerts, setNearbyWalkerAlerts] = useState(
    user?.nearbyWalkerAlerts !== false
  );
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const { register, focus } = useScrollToField(scrollRef);
  const initialPhotoUriRef = useRef<string | null>(null);

  const ageNumber = Number(age);
  const heightNumber = Number(height);
  const weightNumber = Number(weight);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const distanceKm = Number(distanceText);

  const isFormValid =
    age.trim() !== '' &&
    height.trim() !== '' &&
    weight.trim() !== '' &&
    ageNumber > 0 &&
    heightNumber > 0 &&
    weightNumber > 0 &&
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59 &&
    Number.isFinite(distanceKm) &&
    distanceKm > 0 &&
    distanceKm <= 50;

  async function handleSave() {
    Keyboard.dismiss();

    if (!isFormValid) {
      Alert.alert('입력 확인', '모든 항목을 올바르게 입력해 주세요.');
      return;
    }

    setSaving(true);

    try {
      let profilePhotoUri = user?.profilePhotoUri;
      let profilePhotoSkipped = user?.profilePhotoSkipped;
      let profilePhotoSetupDone = user?.profilePhotoSetupDone;

      const photoChanged =
        !!photoPreviewUri && photoPreviewUri !== initialPhotoUriRef.current;

      if (photoChanged) {
        profilePhotoUri = await persistProfilePhoto(photoPreviewUri);
        profilePhotoSkipped = false;
        profilePhotoSetupDone = true;
      }

      let nextUser: UserProfile = {
        ...(user ?? {}),
        nickname: nickname.trim() || undefined,
        age: ageNumber,
        heightCm: heightNumber,
        weightKg: weightNumber,
        gender,
        usualWalkHour: hour,
        usualWalkMinute: minute,
        targetWalkDistanceKm: distanceKm,
        nearbyWalkerAlerts,
        profilePhotoUri,
        profilePhotoSkipped,
        profilePhotoSetupDone,
      };

      const outcome = await syncUserProfileToServer({
        nickname: nextUser.nickname,
        localPhotoUri: photoChanged ? profilePhotoUri : undefined,
        skipped: nextUser.profilePhotoSkipped,
      });

      if (outcome.ok) {
        nextUser = mergeProfileSyncIntoUser(nextUser, outcome.data);
      } else if (photoChanged) {
        Alert.alert(
          '서버에 사진 저장 실패',
          '기기에는 저장됐지만 서버(SFTP) 업로드가 실패했어요. Railway SFTP 설정을 확인해 주세요.',
          [{ text: '확인' }]
        );
      }

      setDogState((prev) => ({
        ...prev,
        user: nextUser,
      }));

      await syncDailyWalkReminderFromProfile(
        dogState.name?.trim() || '강아지',
        nextUser
      );

      Alert.alert('저장됨', '내 정보가 업데이트되었어요.', [
        { text: '확인', onPress: onClose },
      ]);
    } catch {
      Alert.alert('저장 실패', '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  const scrollBody = (
    <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollPaddingBottom(keyboardInset, 56) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator
          bounces
        >
            <Text style={styles.sectionTitle}>프로필</Text>
            <ProfilePhotoPickerSection
              user={user}
              onPreviewChange={(uri) => {
                if (initialPhotoUriRef.current === null && uri) {
                  initialPhotoUriRef.current = uri;
                }
                setPhotoPreviewUri(uri);
              }}
              disabled={saving}
            />

            <View style={styles.section} onLayout={register('nickname')}>
              <Text style={styles.label}>닉네임 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 산책러 민수"
                placeholderTextColor="#888"
                value={nickname}
                onChangeText={setNickname}
                onFocus={focus('nickname')}
              />
            </View>

            {dogState.name?.trim() ? (
              <View style={styles.section}>
                <Text style={styles.label}>강아지 이름</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>{dogState.name.trim()}</Text>
                </View>
                <Text style={styles.readOnlyHint}>
                  이름은 처음 지을 때만 설정할 수 있어요.
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>내 정보</Text>
            <View style={styles.section}>
              <Text style={styles.label}>성별</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.genderButton,
                    styles.genderButtonLeft,
                    gender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender('male')}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === 'male' && styles.genderButtonTextActive,
                    ]}
                  >
                    남
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.genderButton,
                    gender === 'female' && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender('female')}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === 'female' && styles.genderButtonTextActive,
                    ]}
                  >
                    여
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section} onLayout={register('age')}>
              <Text style={styles.label}>나이</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 35"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                onFocus={focus('age')}
              />
            </View>

            <View style={styles.section} onLayout={register('height')}>
              <Text style={styles.label}>키 (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 170"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                onFocus={focus('height')}
              />
            </View>

            <View style={styles.section} onLayout={register('weight')}>
              <Text style={styles.label}>몸무게 (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 70"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                onFocus={focus('weight')}
              />
            </View>

            <Text style={styles.sectionTitle}>산책 습관</Text>
            <View style={styles.section} onLayout={register('time')}>
              <Text style={styles.label}>산책 시간</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="시"
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                  value={hourText}
                  onChangeText={setHourText}
                  maxLength={2}
                  onFocus={focus('time')}
                />
                <Text style={styles.timeColon}>:</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="분"
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                  value={minuteText}
                  onChangeText={setMinuteText}
                  maxLength={2}
                  onFocus={focus('time')}
                />
              </View>
            </View>

            <View style={styles.section} onLayout={register('distance')}>
              <Text style={styles.label}>목표 산책 거리 (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 2"
                placeholderTextColor="#888"
                keyboardType="decimal-pad"
                value={distanceText}
                onChangeText={setDistanceText}
                onFocus={focus('distance')}
              />
            </View>

            <View style={styles.section}>
              <NearbyWalkerAlertsSwitch
                value={nearbyWalkerAlerts}
                onValueChange={setNearbyWalkerAlerts}
              />
            </View>

            {!keyboardVisible ? (
              <View style={styles.buttonWrap}>
                <PrimaryButton
                  label="저장"
                  onPress={() => void handleSave()}
                  disabled={!isFormValid || saving}
                  loading={saving}
                />
              </View>
            ) : null}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} disabled={saving}>
          <Text style={styles.headerBack}>← 닫기</Text>
        </Pressable>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      {USE_KEYBOARD_AVOIDING_VIEW ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={KEYBOARD_AVOIDING_BEHAVIOR}
          keyboardVerticalOffset={keyboardVerticalOffset(insets.top, 1)}
        >
          {scrollBody}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>{scrollBody}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  headerBack: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    minWidth: 72,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  headerSpacer: { minWidth: 72 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 56,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 8,
  },
  section: { marginBottom: 14 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  genderRow: { flexDirection: 'row' },
  genderButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2F2F33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonLeft: { marginRight: 12 },
  genderButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C8C8C8',
  },
  genderButtonTextActive: { color: '#111' },
  input: {
    backgroundColor: '#fff',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: { flex: 1 },
  timeColon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  readOnlyBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F2F33',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  readOnlyHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  buttonWrap: {
    marginTop: 20,
    marginBottom: 32,
  },
});
